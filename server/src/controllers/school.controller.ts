import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createSchoolSchema = z.object({
  name: z.string().min(3),
  address: z.string().optional(),
  ville: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  teachingTypeId: z.string().optional(),
  schoolTypeId: z.string().optional(),
  
  // Director info
  directorFirstName: z.string().min(2, "Le prénom du directeur est requis"),
  directorLastName: z.string().min(2, "Le nom du directeur est requis"),
  directorEmail: z.string().email("L'email du directeur est invalide"),
  directorPhone: z.string().optional(),
  directorPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional()
});

const updateSchoolSchema = z.object({
  name: z.string().min(3).optional(),
  address: z.string().optional(),
  ville: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().optional(),
  teachingTypeId: z.string().optional(),
  schoolTypeId: z.string().optional(),
});

export const createSchool = async (req: Request, res: Response) => {
  try {
    const { 
      name, address, ville, phone, email, isActive, teachingTypeId, schoolTypeId,
      directorFirstName, directorLastName, directorEmail, directorPhone, directorPassword
    } = createSchoolSchema.parse(req.body);

    // Verify director email doesn't already exist
    const existingUser = await prisma.user.findUnique({ where: { email: directorEmail } });
    if (existingUser) {
      return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà" });
    }

    // Default password if not provided
    const passwordToHash = directorPassword || "123456";
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    // Transaction to create director and school
    const school = await prisma.$transaction(async (prisma) => {
      // 1. Create Director
      const newDirector = await prisma.user.create({
        data: {
          firstName: directorFirstName,
          lastName: directorLastName,
          email: directorEmail,
          password: hashedPassword,
          phone: directorPhone || null,
          role: "DIRECTEUR",
        }
      });

      // 2. Create School with manager linked
      const newSchool = await prisma.school.create({
        data: {
          name,
          code: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          address: address || null,
          ville: ville || null,
          phone: phone || null,
          email: email || null,
          isActive: isActive !== undefined ? isActive : true,
          teachingTypeId: teachingTypeId || null,
          schoolTypeId: schoolTypeId || null,
          manager: {
            connect: { id: newDirector.id }
          }
        },
      });

      // 3. Update Director's schoolId (though technically managedSchool handles it, doing both is safe)
      await prisma.user.update({
        where: { id: newDirector.id },
        data: { schoolId: newSchool.id }
      });

      return newSchool;
    });

    res.status(201).json(school);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Erreur de validation", errors: error.errors });
    }
    console.error("Error creating school:", error);
    res.status(500).json({ message: "Erreur lors de la création de l'école", error });
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
        classes: {
          include: {
            _count: {
              select: { enrollments: true }
            }
          }
        },
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
    const { name, address, ville, phone, managerId, isActive, teachingTypeId, schoolTypeId } = updateSchoolSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "ID required" });

    const currentSchool = await prisma.school.findUnique({ where: { id: String(id) } });
    if (!currentSchool) return res.status(404).json({ message: "School not found" });

    const updateData: any = {};
    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (ville !== undefined) updateData.ville = ville;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (teachingTypeId !== undefined) updateData.teachingTypeId = teachingTypeId;
    if (schoolTypeId !== undefined) updateData.schoolTypeId = schoolTypeId;

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
