import prisma from "../utils/prisma.js";

export const NewsService = {
  async create(data: any, authorId: string) {
    const { sendNotification, targetSchoolIds, targetRoles, ...newsData } = data;
    
    // Normalize targetRoles and targetSchoolIds
    const roles: string[] = Array.isArray(targetRoles) && targetRoles.length > 0 ? targetRoles : ["ALL"];
    const schoolIds: string[] = Array.isArray(targetSchoolIds) ? targetSchoolIds : [];

    const news = await prisma.news.create({
      data: {
        ...newsData,
        targetRoles: roles,
        targetSchoolIds: schoolIds,
        authorId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        school: { select: { id: true, name: true } },
      },
    });

    // If active and notification requested, broadcast notification to target users
    if (news.isActive && sendNotification !== false) {
      await this.dispatchNotificationForNews(news);
    }

    return news;
  },

  async findAll(filters: any = {}) {
    const { schoolId, role, isActiveOnly, search } = filters;
    const where: any = {};

    if (isActiveOnly) {
      where.isActive = true;
    }

    if (schoolId) {
      where.OR = [
        { schoolId: null },
        { schoolId: schoolId },
        { targetSchoolIds: { has: schoolId } }
      ];
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    const newsList = await prisma.news.findMany({
      where,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        school: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    // If role filter is provided (e.g. for non-admins), filter by targetRoles visibility
    if (role && role !== 'SUPER_ADMIN') {
      return newsList.filter(n => {
        if (!n.targetRoles || n.targetRoles.length === 0 || n.targetRoles.includes('ALL')) {
          return true;
        }
        return n.targetRoles.includes(role);
      });
    }

    return newsList;
  },

  async findById(id: string) {
    return prisma.news.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        school: { select: { id: true, name: true } },
      },
    });
  },

  async update(id: string, data: any) {
    const { sendNotification, targetSchoolIds, targetRoles, ...newsData } = data;
    const updatePayload: any = { ...newsData };

    if (targetRoles) {
      updatePayload.targetRoles = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
    }
    if (targetSchoolIds) {
      updatePayload.targetSchoolIds = Array.isArray(targetSchoolIds) ? targetSchoolIds : [targetSchoolIds];
    }

    const updatedNews = await prisma.news.update({
      where: { id },
      data: updatePayload,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        school: { select: { id: true, name: true } },
      },
    });

    if (updatedNews.isActive && sendNotification) {
      await this.dispatchNotificationForNews(updatedNews);
    }

    return updatedNews;
  },

  async toggleActive(id: string) {
    const news = await prisma.news.findUnique({ where: { id } });
    if (!news) throw new Error("Annonce introuvable");

    const newStatus = !news.isActive;
    const updated = await prisma.news.update({
      where: { id },
      data: { isActive: newStatus },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        school: { select: { id: true, name: true } },
      },
    });

    if (newStatus) {
      await this.dispatchNotificationForNews(updated);
    }

    return updated;
  },

  async delete(id: string) {
    return prisma.news.delete({
      where: { id },
    });
  },

  // Helper method to dispatch notifications to targeted users
  async dispatchNotificationForNews(news: any) {
    try {
      const whereClause: any = {};

      // 1. School filter
      if (news.schoolId) {
        whereClause.schoolId = news.schoolId;
      } else if (news.targetSchoolIds && news.targetSchoolIds.length > 0) {
        whereClause.schoolId = { in: news.targetSchoolIds };
      }

      // 2. Role filter
      if (news.targetRoles && news.targetRoles.length > 0 && !news.targetRoles.includes('ALL')) {
        whereClause.role = { in: news.targetRoles };
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      if (users.length > 0) {
        await prisma.notification.createMany({
          data: users.map(u => ({
            title: `📢 ${news.priority === 'FLASH' ? '[FLASH NEWS] ' : ''}${news.title}`,
            message: news.content.length > 150 ? `${news.content.substring(0, 147)}...` : news.content,
            userId: u.id,
            read: false
          }))
        });
      }
    } catch (err) {
      console.error("Error dispatching news notifications:", err);
    }
  }
};
