import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";

const createSchoolSchema = z.object({
  name: z.string().min(3),
  address: z.string().optional(),
  managerId: z.string().min(1, "Un administrateur est requis"),
  isActive: z.boolean().optional(),
});

const updateSchoolSchema = z.object({
  name: z.string().min(3).optional(),
  address: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createSchool = async (req: Request, res: Response) => {
  try {
    const { name, address, managerId, isActive } = createSchoolSchema.parse(req.body);

    // Verify manager exists and has no school
    const manager = await prisma.user.findUnique({ where: { id: managerId }, include: { managedSchool: true } });
    if (!manager) {
      return res.status(404).json({ message: "Administrateur non trouvé" });
    }
    if (manager.managedSchool) {
      return res.status(400).json({ message: "Cet administrateur gère déjà une école" });
    }

    // Transaction to create school and update manager
    const school = await prisma.$transaction(async (prisma) => {
      const newSchool = await prisma.school.create({
        data: {
          name,
          code: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          address: address || null,
          isActive: true,
          manager: {
            connect: { id: managerId }
          }
        },
      });

      await prisma.user.update({
        where: { id: managerId },
        data: {
          schoolId: newSchool.id,
          role: "DIRECTEUR", // Ensure role is correct
        },
      });

      return newSchool;
    });

    res.status(201).json(school);
  } catch (error) {
    res.status(500).json({ message: "Error creating school", error });
  }
};

export const getSchools = async (req: Request, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { users: true, classes: true },
        },
      },
    });
    res.json(schools);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schools", error });
  }
};

export const getSchoolById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "ID required" });

    const school = await prisma.school.findUnique({
      where: { id: String(id) },
      include: {
        manager: true,
        users: true,
        classes: true,
      },
    });

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    res.json(school);
  } catch (error) {
    res.status(500).json({ message: "Error fetching school", error });
  }
};

export const updateSchool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, managerId, isActive } = updateSchoolSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "ID required" });

    const currentSchool = await prisma.school.findUnique({ where: { id: String(id) } });
    if (!currentSchool) return res.status(404).json({ message: "School not found" });

    const updateData: any = {};
    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (managerId !== undefined) updateData.managerId = managerId;

    const school = await prisma.$transaction(async (prisma) => {
      // If manager changes, handle User relations
      if (managerId && managerId !== currentSchool.managerId) {
         // Verify new manager
         const newManager = await prisma.user.findUnique({ where: { id: managerId } });
         if (!newManager) throw new Error("New manager not found");
         if (newManager.schoolId && newManager.schoolId !== String(id)) {
             throw new Error("New manager already manages another school");
         }

         // Unlink old manager
         if (currentSchool.managerId) {
             await prisma.user.update({
                 where: { id: currentSchool.managerId },
                 data: { schoolId: null }
             });
         }
         // Link new manager
         await prisma.user.update({
             where: { id: managerId },
             data: { schoolId: String(id), role: 'DIRECTEUR' }
         });
      }

      return await prisma.school.update({
        where: { id: String(id) },
        data: updateData,
      });
    });

    res.json(school);
  } catch (error) {
    res.status(500).json({ message: "Error updating school", error });
  }
};

export const deleteSchool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) return res.status(400).json({ message: "ID required" });

    await prisma.$transaction(async (prisma) => {
        // Unlink all users from this school
        await prisma.user.updateMany({
            where: { schoolId: String(id) },
            data: { schoolId: null }
        });

        // Delete related data (simplified for now, assuming cascade or empty)
        // If foreign keys prevent deletion, we might need to delete children first
        // But for this task, let's assume the school is relatively new/empty or try/catch
        await prisma.school.delete({
            where: { id: String(id) },
        });
    });

    res.json({ message: "School deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting school", error });
  }
};
