import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const createSubjectSchema = z.object({
  name: z.string().min(1, "Le nom de la matière est requis"),
  code: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  coefficient: z.number().optional(),
  schoolId: z.string().optional(),
});

export const getDefaultSubjectImage = (subjectName: string): string => {
  const s = (subjectName || "").toLowerCase().trim();
  if (s.includes("sport") || s.includes("eps") || s.includes("éducation physique") || s.includes("education physique") || s.includes("gym")) return "eps";
  if (s.includes("math")) return "math";
  if (s.includes("franc") || s.includes("franç") || s.includes("dictée") || s.includes("grammaire") || s.includes("littérature")) return "french";
  if (s.includes("anglais") || s.includes("angl") || s.includes("english")) return "english";
  if (s.includes("physique") || s.includes("chimie") || s.includes("pc")) return "chemistry";
  if (s.includes("svt") || s.includes("science") || s.includes("biologie") || s.includes("terre") || s.includes("nature")) return "svt";
  if (s.includes("histoire") || s.includes("geo") || s.includes("géo") || s.includes("hg")) return "history";
  if (s.includes("philo")) return "philosophy";
  if (s.includes("musique") || s.includes("music") || s.includes("chant") || s.includes("solfege")) return "music";
  if (s.includes("art") || s.includes("plastique") || s.includes("dessin") || s.includes("peinture")) return "arts";
  if (s.includes("espagnol") || s.includes("esp") || s.includes("allemand") || s.includes("arabe")) return "spanish";
  if (s.includes("edhc") || s.includes("civique") || s.includes("morale") || s.includes("droit") || s.includes("citoyen")) return "edhc";
  if (s.includes("eco") || s.includes("éco") || s.includes("compta") || s.includes("gestion") || s.includes("finance") || s.includes("commerce")) return "economy";
  if (s.includes("info") || s.includes("bureautique") || s.includes("tic") || s.includes("ordinateur") || s.includes("algo") || s.includes("programmation")) return "office";
  return "default";
};

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
    const { name, code, imageUrl, coefficient, schoolId: bodySchoolId } = createSubjectSchema.parse(req.body);
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

    const finalImageUrl = imageUrl && imageUrl.trim() !== "" ? imageUrl.trim() : getDefaultSubjectImage(trimmedName);

    const subject = await prisma.subject.create({
      data: {
        name: trimmedName,
        code: code?.trim() || null,
        imageUrl: finalImageUrl,
        coefficient: coefficient ?? 1,
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
        courses: { 
          select: { 
            id: true, 
            coefficient: true, 
            isPublished: true,
            niveau: { select: { id: true, nom: true } },
            _count: { select: { chapters: true, assignments: true } }
          } 
        },
        _count: { select: { courses: true, teacherClasses: true } }
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
    const id = String(req.params.id);
    const { name, code, imageUrl, coefficient, schoolId: bodySchoolId } = createSubjectSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "ID manquant" });

    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Matière introuvable" });

    const targetSchoolId = bodySchoolId || existing.schoolId;

    const duplicate = await prisma.subject.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' }, schoolId: targetSchoolId, NOT: { id } }
    });

    if (duplicate) {
      return res.status(400).json({ message: "Une matière avec ce nom existe déjà dans cet établissement." });
    }

    const trimmedName = name.trim();
    const finalImageUrl = imageUrl !== undefined 
      ? (imageUrl && imageUrl.trim() !== "" ? imageUrl.trim() : getDefaultSubjectImage(trimmedName))
      : (existing.imageUrl || getDefaultSubjectImage(trimmedName));

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: {
        name: trimmedName,
        code: code?.trim() || null,
        imageUrl: finalImageUrl,
        coefficient: coefficient ?? existing.coefficient,
        schoolId: targetSchoolId,
      },
      include: {
        school: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { courses: true, teacherClasses: true } }
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
    const id = String(req.params.id);
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
