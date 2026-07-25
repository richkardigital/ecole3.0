import prisma from "../utils/prisma.js";

export const NewsService = {
  async create(data: any, authorId: string) {
    return prisma.news.create({
      data: {
        ...data,
        authorId,
      },
    });
  },

  async findAll(filters: any) {
    return prisma.news.findMany({
      where: filters,
      include: { author: { select: { id: true, firstName: true, lastName: true } }, school: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  async findById(id: string) {
    return prisma.news.findUnique({
      where: { id },
      include: { author: true, school: true },
    });
  },

  async update(id: string, data: any) {
    return prisma.news.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.news.delete({
      where: { id },
    });
  }
};
