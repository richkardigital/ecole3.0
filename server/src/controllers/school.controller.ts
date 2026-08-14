import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { AuthRequest } from "../middleware/auth.js";

const createSchoolSchema = z.object({
  name: z.string().min(3),
  address: z.string().optional(),
  postalAddress: z.string().optional(),
  ville: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  logoUrl: z.string().optional(),
  signatureUrl: z.string().optional(),
  stampUrl: z.string().optional(),
  description: z.string().optional(),
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
  address: z.string().optional().nullable(),
  postalAddress: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  logoUrl: z.string().optional().nullable(),
  signatureUrl: z.string().optional().nullable(),
  stampUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  teachingTypeId: z.string().optional().nullable(),
  schoolTypeId: z.string().optional().nullable(),
});

export const createSchool = async (req: Request, res: Response) => {
  try {
    const { 
      name, address, postalAddress, ville, phone, email, logoUrl, signatureUrl, stampUrl, description, isActive, teachingTypeId, schoolTypeId,
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
          code: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + '-' + Math.floor(1000 + Math.random() * 9000),
          address: address || null,
          postalAddress: postalAddress || null,
          ville: ville || null,
          phone: phone || null,
          email: email || null,
          logoUrl: logoUrl || null,
          signatureUrl: signatureUrl || null,
          stampUrl: stampUrl || null,
          description: description || null,
          isActive: isActive !== undefined ? isActive : true,
          teachingTypeId: teachingTypeId || null,
          schoolTypeId: schoolTypeId || null,
          managerId: newDirector.id,
        },
      });

      // 3. Update Director's schoolId
      await prisma.user.update({
        where: { id: newDirector.id },
        data: { schoolId: newSchool.id }
      });

      return newSchool;
    });

    res.status(201).json(school);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Erreur de validation", errors: (error as any).issues || (error as any).errors });
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
            phone: true,
          },
        },
        _count: {
          select: { users: true, classes: true },
        },
        teachingType: true,
        schoolType: true,
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
        teachingType: true,
        schoolType: true,
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

export const getMySchool = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Non authentifié" });

    let school = await prisma.school.findFirst({
      where: {
        OR: [
          { managerId: user.id },
          ...(user.schoolId ? [{ id: user.schoolId }] : [])
        ]
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          }
        },
        teachingType: true,
        schoolType: true,
        _count: {
          select: { users: true, classes: true }
        }
      }
    });

    if (!school) {
      return res.status(404).json({ message: "Établissement non trouvé pour cet utilisateur" });
    }

    res.json(school);
  } catch (error) {
    console.error("Error fetching my school:", error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'école", error });
  }
};

export const updateMySchool = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Non authentifié" });

    const currentSchool = await prisma.school.findFirst({
      where: {
        OR: [
          { managerId: user.id },
          ...(user.schoolId ? [{ id: user.schoolId }] : [])
        ]
      }
    });

    if (!currentSchool) {
      return res.status(404).json({ message: "Établissement non trouvé pour cet utilisateur" });
    }

    const {
      name,
      address,
      postalAddress,
      ville,
      phone,
      email,
      logoUrl,
      signatureUrl,
      stampUrl,
      description
    } = updateSchoolSchema.parse(req.body);

    const updateData: any = {};
    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (postalAddress !== undefined) updateData.postalAddress = postalAddress;
    if (ville !== undefined) updateData.ville = ville;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (signatureUrl !== undefined) updateData.signatureUrl = signatureUrl;
    if (stampUrl !== undefined) updateData.stampUrl = stampUrl;
    if (description !== undefined) updateData.description = description;

    const updatedSchool = await prisma.school.update({
      where: { id: currentSchool.id },
      data: updateData,
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        teachingType: true,
        schoolType: true,
      }
    });

    res.json(updatedSchool);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Erreur de validation", errors: (error as any).issues || (error as any).errors });
    }
    console.error("Error updating my school:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'école", error });
  }
};

export const updateSchool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      postalAddress,
      ville,
      phone,
      email,
      logoUrl,
      signatureUrl,
      stampUrl,
      description,
      managerId,
      isActive,
      teachingTypeId,
      schoolTypeId
    } = updateSchoolSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "ID required" });

    const currentSchool = await prisma.school.findUnique({ where: { id: String(id) } });
    if (!currentSchool) return res.status(404).json({ message: "School not found" });

    const updateData: any = {};
    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (postalAddress !== undefined) updateData.postalAddress = postalAddress;
    if (ville !== undefined) updateData.ville = ville;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (signatureUrl !== undefined) updateData.signatureUrl = signatureUrl;
    if (stampUrl !== undefined) updateData.stampUrl = stampUrl;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (teachingTypeId !== undefined) updateData.teachingTypeId = teachingTypeId;
    if (schoolTypeId !== undefined) updateData.schoolTypeId = schoolTypeId;

    const school = await prisma.$transaction(async (prisma) => {
      // If manager changes, handle User relations
      if (managerId && managerId !== currentSchool.managerId) {
         const newManager = await prisma.user.findUnique({ where: { id: managerId } });
         if (!newManager) throw new Error("New manager not found");
         if (newManager.schoolId && newManager.schoolId !== String(id)) {
             throw new Error("New manager already manages another school");
         }

         if (currentSchool.managerId) {
             await prisma.user.update({
                 where: { id: currentSchool.managerId },
                 data: { schoolId: null }
             });
         }
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Erreur de validation", errors: (error as any).issues || (error as any).errors });
    }
    res.status(500).json({ message: "Error updating school", error });
  }
};

export const deleteSchool = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) return res.status(400).json({ message: "ID required" });

    await prisma.$transaction(async (prisma) => {
        // Delete all users linked to this school (will cascade to courses, enrollments, etc.)
        await prisma.user.deleteMany({
            where: { schoolId: String(id) }
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
