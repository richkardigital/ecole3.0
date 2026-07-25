import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const broadcastSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  targetRoles: z.array(z.enum(["DIRECTEUR", "ENSEIGNANT", "APPRENANT", "EDUCATEUR", "EDUCATEUR", "ALL"])).optional(),
  targetSchoolIds: z.array(z.string()).optional(),
  targetUserIds: z.array(z.string()).optional(),
  classId: z.string().optional(),
});

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error updating notification", error });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    // Users can delete their own notifications
    const notification = await prisma.notification.findFirst({
        where: { id, userId }
    });

    if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting notification", error });
  }
}

export const broadcastNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, targetRoles, targetSchoolIds, targetUserIds, classId } = broadcastSchema.parse(req.body);
    const user = req.user;

    // Find all target users
    let whereClause: any = {};
    
    // 1. School Scoping
    if ((user?.role as string) === 'DIRECTEUR' || (user?.role as string) === 'EDUCATEUR') {
        if (!user.schoolId) {
            return res.status(400).json({ message: "User has no school assigned" });
        }
        whereClause.schoolId = user.schoolId;
    } else if ((user?.role as string) === 'SUPER_ADMIN') {
        if (targetSchoolIds && targetSchoolIds.length > 0) {
            whereClause.schoolId = { in: targetSchoolIds };
        }
    }

    // 2. Target Specific Users
    if (targetUserIds && targetUserIds.length > 0) {
        whereClause.id = { in: targetUserIds };
    } 
    // 3. Target Class
    else if (classId) {
        const roles = targetRoles || ["ALL"];
        const conditions: any[] = [];

        if (roles.includes("ALL") || roles.includes("APPRENANT")) {
            conditions.push({
                enrollments: { some: { classId: classId } }
            });
        }

        if (roles.includes("ALL") || roles.includes("ENSEIGNANT")) {
            conditions.push({
                courses: { some: { classId: classId } }
            });
        }

        if (conditions.length > 0) {
            whereClause.OR = conditions;
        }
    }

    // 4. Role Filtering (Applied if no specific users targeted, or as an additional filter for class)
    if (!targetUserIds || targetUserIds.length === 0) {
        if (targetRoles && targetRoles.length > 0 && !targetRoles.includes("ALL")) {
            whereClause.role = { in: targetRoles };
        } else if (user?.role !== 'SUPER_ADMIN') {
            // Default restriction for non-super-admins
            whereClause.role = { not: "SUPER_ADMIN" };
        }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (users.length === 0) {
      return res.json({ message: "No users found to notify" });
    }

    // Bulk create notifications using a loop for better compatibility if createMany fails
    // (Prisma createMany is supported for Notification, but let's stick to loop or createMany)
    // Using createMany is much faster for thousands of users
    await prisma.notification.createMany({
        data: users.map(u => ({
            title,
            message,
            userId: u.id,
            read: false
        }))
    });

    res.status(201).json({ message: `Notification sent to ${users.length} users` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error broadcasting notification", error });
  }
};
