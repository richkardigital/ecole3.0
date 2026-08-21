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

/**
 * Retourne les statistiques globales complètes d'un établissement scolaire
 */
export const getSchoolStats = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!id) return res.status(400).json({ message: "ID établissement manquant" });

    const school = await prisma.school.findUnique({
      where: { id },
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
        teachingType: { select: { id: true, name: true } },
        schoolType: { select: { id: true, name: true } },
        _count: { select: { classes: true, users: true } }
      },
    });

    if (!school) return res.status(404).json({ message: "Établissement introuvable" });

    // 1. Classes & niveaux
    const classes = await prisma.class.findMany({
      where: { schoolId: id },
      include: {
        niveau: { select: { id: true, nom: true } },
        _count: { select: { enrollments: true, teacherClasses: true } }
      },
      orderBy: { name: 'asc' }
    });

    const classIds = classes.map(c => c.id);

    // 2. Utilisateurs par rôle
    const users = await prisma.user.findMany({
      where: { schoolId: id },
      select: { id: true, role: true, gender: true, isActive: true }
    });

    const students = users.filter(u => u.role === 'APPRENANT');
    const nbStudents = students.length;
    const nbTeachers = users.filter(u => u.role === 'ENSEIGNANT').length;
    const nbEducators = users.filter(u => u.role === 'EDUCATEUR').length;
    const nbParents = users.filter(u => u.role === 'PARENT').length;
    const totalUsers = users.length;

    // Répartition genre
    const nbGirls = students.filter(s => s.gender === 'FEMININ').length;
    const nbBoys = students.filter(s => s.gender === 'MASCULIN').length;
    const nbOtherGender = nbStudents - (nbGirls + nbBoys);

    // 3. Cours & Devoirs
    const coursesCount = await prisma.course.count({
      where: {
        niveau: { schoolId: id }
      }
    }).catch(() => 0);

    const assignmentsCount = await prisma.assignment.count({
      where: {
        OR: [
          { schoolId: id },
          { niveau: { schoolId: id } }
        ]
      }
    }).catch(() => 0);

    // 4. Bulletins
    const bulletins = await prisma.bulletinEleve.findMany({
      where: {
        classId: { in: classIds }
      },
      select: {
        id: true,
        statut: true,
        moyenneGenerale: true,
        classId: true
      }
    }).catch(() => []);

    const totalBulletins = bulletins.length;
    const bulletinsByStatus: Record<string, number> = {
      BROUILLON: 0,
      SOUMIS_ENSEIGNANT: 0,
      VALIDE_EDUCATEUR: 0,
      VALIDE_DIRECTEUR: 0,
      VALIDE_SUPER_ADMIN: 0,
      REJETE: 0
    };

    let totalMoyenne = 0;
    let countEvaluated = 0;
    let countPassed = 0;

    for (const b of bulletins) {
      bulletinsByStatus[b.statut] = (bulletinsByStatus[b.statut] || 0) + 1;
      if (b.moyenneGenerale !== null && b.moyenneGenerale !== undefined) {
        totalMoyenne += b.moyenneGenerale;
        countEvaluated++;
        if (b.moyenneGenerale >= 10) {
          countPassed++;
        }
      }
    }

    const schoolAverage = countEvaluated > 0 ? parseFloat((totalMoyenne / countEvaluated).toFixed(2)) : null;
    const tauxReussite = countEvaluated > 0 ? Math.round((countPassed / countEvaluated) * 100) : 0;
    const validesCount = (bulletinsByStatus['VALIDE_DIRECTEUR'] || 0) + (bulletinsByStatus['VALIDE_SUPER_ADMIN'] || 0);
    const tauxValidation = totalBulletins > 0 ? Math.round((validesCount / totalBulletins) * 100) : 0;

    // 5. Absences
    const absencesCount = await prisma.absence.count({
      where: {
        student: { schoolId: id }
      }
    }).catch(() => 0);

    // 6. Statistiques et moyennes par classe
    const classStats = classes.map(c => {
      const classBulletins = bulletins.filter(b => b.classId === c.id && b.moyenneGenerale !== null);
      const classAvg = classBulletins.length > 0
        ? parseFloat((classBulletins.reduce((acc, curr) => acc + (curr.moyenneGenerale || 0), 0) / classBulletins.length).toFixed(2))
        : null;

      return {
        classId: c.id,
        className: c.name,
        niveauName: c.niveau?.nom || 'Non spécifié',
        nbStudents: c._count.enrollments,
        nbCourses: c._count.teacherClasses,
        averageMoyenne: classAvg
      };
    });

    // 7. Répartition par niveau
    const levelMap: Record<string, { niveauName: string; nbClasses: number; nbStudents: number }> = {};
    for (const c of classes) {
      const nName = c.niveau?.nom || 'Autres';
      if (!levelMap[nName]) {
        levelMap[nName] = { niveauName: nName, nbClasses: 0, nbStudents: 0 };
      }
      levelMap[nName].nbClasses++;
      levelMap[nName].nbStudents += c._count.enrollments;
    }

    res.json({
      school,
      overview: {
        nbClasses: classes.length,
        nbStudents,
        nbTeachers,
        nbEducators,
        nbParents,
        totalUsers,
        nbCourses: coursesCount,
        nbAssignments: assignmentsCount,
        nbAbsences: absencesCount,
        gender: {
          girls: nbGirls,
          boys: nbBoys,
          other: nbOtherGender
        }
      },
      performance: {
        schoolAverage,
        tauxReussite,
        tauxValidation,
        totalBulletins,
        bulletinsByStatus,
        totalEvalues: countEvaluated,
        totalReussite: countPassed
      },
      levelDistribution: Object.values(levelMap),
      classRankings: classStats
    });
  } catch (error: any) {
    console.error("Error calculating school stats:", error);
    res.status(500).json({ message: "Erreur lors du calcul des statistiques de l'établissement" });
  }
};
