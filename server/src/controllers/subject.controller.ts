import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const createSubjectSchema = z.object({
  name: z.string().min(1, "Le nom de la matière est requis"),
  code: z.string().optional(),
  coefficient: z.number().optional(),
  schoolId: z.string().optional(),
});

/**
 * Helper to resolve schoolId for an operation
 */
const resolveSchoolId = async (req: AuthRequest, requestedSchoolId?: string): Promise<string | null> => {
  if (requestedSchoolId) return requestedSchoolId;
  if (req.user?.schoolId) return req.user.schoolId;

  // Fallback for SUPER_ADMIN or users without assigned schoolId
  const firstSchool = await prisma.school.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return firstSchool?.id || null;
};

export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, schoolId: bodySchoolId } = createSubjectSchema.parse(req.body);
    const schoolId = await resolveSchoolId(req, bodySchoolId);

    if (!schoolId) {
      return res.status(400).json({ message: "Aucun établissement scolaire trouvé. Veuillez d'abord créer une école." });
    }

    const trimmedName = name.trim();
    const existing = await prisma.subject.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' }, schoolId }
    });

    if (existing) {
      return res.status(400).json({ message: "Cette matière existe déjà dans cet établissement." });
    }

    const subject = await prisma.subject.create({
      data: {
        name: trimmedName,
        code: code?.trim() || null,
        schoolId,
      },
      include: {
        school: { select: { id: true, name: true, ville: true, code: true } }
      }
    });

    res.status(201).json(subject);
  } catch (error: any) {
    console.error("Create Subject Error:", error);
    res.status(500).json({ message: "Erreur lors de la création de la matière" });
  }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const querySchoolId = req.query.schoolId as string | undefined;
    const niveauId = req.query.niveauId as string | undefined;

    let whereClause: any = {};

    if (niveauId) {
      whereClause.courses = { some: { class: { niveauId } } };
    }

    if (querySchoolId) {
      whereClause.schoolId = querySchoolId;
    } else if (!isSuperAdmin) {
      const userSchoolId = req.user?.schoolId;
      if (userSchoolId) {
        whereClause.schoolId = userSchoolId;
      } else {
        const defaultSchool = await prisma.school.findFirst({ select: { id: true } });
        if (defaultSchool) {
          whereClause.schoolId = defaultSchool.id;
        } else {
          return res.json([]);
        }
      }
    }

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      include: {
        school: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { courses: true } }
      },
      orderBy: { name: "asc" },
    });

    res.json(subjects);
  } catch (error) {
    console.error("Get Subjects Error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des matières" });
  }
};

export const getSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const userSchoolId = req.user?.schoolId;

    const whereClause: any = { id };
    if (!isSuperAdmin && userSchoolId) {
      whereClause.schoolId = userSchoolId;
    }

    const subject = await prisma.subject.findFirst({
      where: whereClause,
      include: {
        school: { select: { id: true, name: true, ville: true, code: true } },
        courses: { select: { id: true, name: true } },
        _count: { select: { courses: true, grades: true } }
      }
    });

    if (!subject) {
      return res.status(404).json({ message: "Matière introuvable" });
    }

    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, schoolId: bodySchoolId } = createSubjectSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "ID manquant" });

    const existing = await prisma.subject.findUnique({ where: { id: String(id) } });
    if (!existing) return res.status(404).json({ message: "Matière introuvable" });

    const targetSchoolId = bodySchoolId || existing.schoolId;

    const duplicate = await prisma.subject.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' }, schoolId: targetSchoolId, NOT: { id: String(id) } }
    });

    if (duplicate) {
      return res.status(400).json({ message: "Une matière avec ce nom existe déjà dans cet établissement." });
    }

    const updatedSubject = await prisma.subject.update({
      where: { id: String(id) },
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        schoolId: targetSchoolId,
      },
      include: {
        school: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { courses: true, grades: true } }
      }
    });

    res.json(updatedSubject);
  } catch (error) {
    console.error("Update Subject Error:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de la matière" });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "ID manquant" });

    const courseCount = await prisma.course.count({ where: { subjectId: id } });
    if (courseCount > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer cette matière car elle est rattachée à ${courseCount} cours.`
      });
    }

    await prisma.subject.delete({
      where: { id: String(id) },
    });
    res.status(200).json({ message: "Matière supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression de la matière" });
  }
};
