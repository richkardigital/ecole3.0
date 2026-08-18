import { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";

const createConductSchema = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
  grade: z.number().min(0).max(20).optional().nullable(),
  appreciation: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
});

/**
 * Calcule automatiquement la note et l'appréciation de conduite selon le barème officiel :
 * - Base de départ : 20.00 / 20
 * - Pénalité par heure injustifiée : -1.0 pt
 * - Pénalité par heure justifiée : -0.25 pt
 */
export const calculateConductScoreAndAppreciation = (unjustifiedHours: number, justifiedHours: number) => {
  const penalty = (unjustifiedHours * 1.0) + (justifiedHours * 0.25);
  const grade = Math.max(0, Math.min(20, parseFloat((20 - penalty).toFixed(2))));

  let appreciation = "Excellente assiduité et conduite irréprochable.";
  if (grade >= 18) {
    appreciation = "Excellente assiduité et conduite irréprochable.";
  } else if (grade >= 15) {
    appreciation = "Bonne assiduité et comportement satisfaisant.";
  } else if (grade >= 12) {
    appreciation = "Conduite passable. Des absences à justifier et limiter.";
  } else if (grade >= 10) {
    appreciation = "Conduite moyenne. Avertissement d'assiduité.";
  } else {
    appreciation = "Conduite insuffisante. Trop d'absences injustifiées constatées.";
  }

  return { grade, appreciation, totalPenalty: penalty };
};

/**
 * Calcul automatique de la conduite d'un élève pour un trimestre donné
 */
export const calculateStudentConduct = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, termId } = req.body;
    if (!studentId || !termId) {
      return res.status(400).json({ message: "studentId et termId sont requis" });
    }

    const term = await prisma.term.findUnique({ where: { id: termId } });
    if (!term) return res.status(404).json({ message: "Trimestre introuvable" });

    // Récupérer les absences de l'élève pour le trimestre
    const absences = await prisma.absence.findMany({
      where: {
        studentId,
        OR: [
          { termId },
          { date: { gte: term.startDate, lte: term.endDate } }
        ]
      }
    });

    const unjustifiedHours = absences
      .filter((a) => !a.justified)
      .reduce((sum, a) => sum + (a.hours ?? 1), 0);

    const justifiedHours = absences
      .filter((a) => a.justified)
      .reduce((sum, a) => sum + (a.hours ?? 1), 0);

    const { grade, appreciation } = calculateConductScoreAndAppreciation(unjustifiedHours, justifiedHours);

    // Mettre à jour ou créer la fiche de conduite
    const conduct = await prisma.conduct.upsert({
      where: {
        studentId_termId: { studentId, termId }
      },
      update: {
        grade,
        appreciation,
        comment: `Calcul automatique : ${unjustifiedHours}h injustifiées, ${justifiedHours}h justifiées.`
      },
      create: {
        studentId,
        termId,
        grade,
        appreciation,
        comment: `Calcul automatique : ${unjustifiedHours}h injustifiées, ${justifiedHours}h justifiées.`
      }
    });

    // Synchroniser avec le bulletin de l'élève s'il existe
    await prisma.bulletinEleve.updateMany({
      where: { studentId, termId },
      data: {
        noteConduite: grade,
        totalAbsences: Math.round(unjustifiedHours + justifiedHours),
        absencesJustifiees: Math.round(justifiedHours)
      }
    });

    res.json({
      conduct,
      stats: {
        unjustifiedHours,
        justifiedHours,
        totalHours: unjustifiedHours + justifiedHours,
        grade,
        appreciation
      }
    });
  } catch (error) {
    console.error("Erreur calcul conduite élève:", error);
    res.status(500).json({ message: "Erreur serveur lors du calcul de la conduite", error });
  }
};

/**
 * Calcul automatique de la conduite pour TOUS les élèves d'une classe pour un trimestre
 */
export const calculateClassConduct = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, termId } = req.body;
    if (!classId || !termId) {
      return res.status(400).json({ message: "classId et termId requis" });
    }

    const term = await prisma.term.findUnique({ where: { id: termId } });
    if (!term) return res.status(404).json({ message: "Trimestre introuvable" });

    // Récupérer tous les élèves actifs de la classe
    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: "ACTIVE" },
      include: { student: true }
    });

    const studentIds = enrollments.map((e) => e.studentId);

    // Récupérer toutes les absences de ces élèves
    const allAbsences = await prisma.absence.findMany({
      where: {
        studentId: { in: studentIds },
        OR: [
          { termId },
          { date: { gte: term.startDate, lte: term.endDate } }
        ]
      }
    });

    const results = [];

    for (const sid of studentIds) {
      const studentAbsences = allAbsences.filter((a) => a.studentId === sid);
      const unjustifiedHours = studentAbsences
        .filter((a) => !a.justified)
        .reduce((sum, a) => sum + (a.hours ?? 1), 0);

      const justifiedHours = studentAbsences
        .filter((a) => a.justified)
        .reduce((sum, a) => sum + (a.hours ?? 1), 0);

      const { grade, appreciation } = calculateConductScoreAndAppreciation(unjustifiedHours, justifiedHours);

      const conduct = await prisma.conduct.upsert({
        where: { studentId_termId: { studentId: sid, termId } },
        update: {
          grade,
          appreciation,
          comment: `Calcul automatique : ${unjustifiedHours}h injustifiées, ${justifiedHours}h justifiées.`
        },
        create: {
          studentId: sid,
          termId,
          grade,
          appreciation,
          comment: `Calcul automatique : ${unjustifiedHours}h injustifiées, ${justifiedHours}h justifiées.`
        }
      });

      // Synchroniser Bulletin
      await prisma.bulletinEleve.updateMany({
        where: { studentId: sid, termId },
        data: {
          noteConduite: grade,
          totalAbsences: Math.round(unjustifiedHours + justifiedHours),
          absencesJustifiees: Math.round(justifiedHours)
        }
      });

      results.push({ studentId: sid, grade, appreciation, unjustifiedHours, justifiedHours });
    }

    res.json({
      message: `Conduite calculée pour ${results.length} élèves avec succès`,
      count: results.length,
      results
    });
  } catch (error) {
    console.error("Erreur calcul conduite classe:", error);
    res.status(500).json({ message: "Erreur serveur lors du calcul en lot", error });
  }
};

/**
 * Sauvegarde en lot la conduite pour toute une classe avec synchronisation bulletin
 */
export const saveClassConduct = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, termId, conducts } = req.body;
    if (!termId || !Array.isArray(conducts)) {
      return res.status(400).json({ message: "termId et liste de conduites requis" });
    }

    const savedList = [];

    for (const item of conducts) {
      if (!item.studentId) continue;
      const numGrade = item.grade !== null && item.grade !== undefined && item.grade !== '' ? parseFloat(item.grade) : null;
      
      const conduct = await prisma.conduct.upsert({
        where: {
          studentId_termId: {
            studentId: item.studentId,
            termId
          }
        },
        update: {
          grade: numGrade,
          appreciation: item.appreciation || null,
          comment: item.comment || null
        },
        create: {
          studentId: item.studentId,
          termId,
          grade: numGrade,
          appreciation: item.appreciation || null,
          comment: item.comment || null
        }
      });

      // Synchronisation immédiate avec BulletinEleve
      await prisma.bulletinEleve.updateMany({
        where: { studentId: item.studentId, termId },
        data: {
          noteConduite: numGrade
        }
      });

      savedList.push(conduct);
    }

    res.json({
      message: `${savedList.length} notes de conduite enregistrées et synchronisées avec succès`,
      count: savedList.length,
      conducts: savedList
    });
  } catch (error) {
    console.error("Erreur saveClassConduct:", error);
    res.status(500).json({ message: "Erreur serveur lors de la sauvegarde de la classe", error });
  }
};

export const createConduct = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, termId, grade, appreciation, comment } = createConductSchema.parse(req.body);
    const user = req.user;

    // RBAC: Ensure staff can only create for their school
    if ((user?.role as string) === 'DIRECTEUR' || (user?.role as string) === 'EDUCATEUR') {
      const student = await prisma.user.findFirst({
        where: { id: studentId, schoolId: user.schoolId }
      });
      if (!student) {
        return res.status(403).json({ message: "Élève non trouvé dans votre établissement" });
      }
    }

    const conduct = await prisma.conduct.upsert({
      where: {
        studentId_termId: {
          studentId,
          termId
        }
      },
      update: {
        grade: grade !== undefined ? (grade !== null ? Number(grade) : null) : undefined,
        appreciation,
        comment,
      },
      create: {
        studentId,
        termId,
        grade: grade !== undefined ? (grade !== null ? Number(grade) : null) : null,
        appreciation,
        comment,
      },
    });

    // Synchroniser avec le bulletin de l'élève s'il existe
    await prisma.bulletinEleve.updateMany({
      where: { studentId, termId },
      data: {
        noteConduite: grade !== undefined ? (grade !== null ? Number(grade) : null) : null
      }
    });

    res.status(201).json(conduct);
  } catch (error) {
    console.error("Error creating conduct:", error);
    res.status(400).json({ message: "Données invalides", error });
  }
};

export const getConducts = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, classId, termId } = req.query;
    const user = req.user;

    const where: any = {};

    // If student, can only see own conducts
    if ((user?.role as string) === 'APPRENANT') {
      where.studentId = user.id;
    } else if ((user?.role as string) === 'PARENT') {
      const parentLinks = await prisma.parentChild.findMany({
        where: { parentId: user.id },
        select: { studentId: true }
      });
      where.studentId = { in: parentLinks.map(p => p.studentId) };
    } else if ((user?.role as string) === 'DIRECTEUR' || (user?.role as string) === 'EDUCATEUR') {
      // Only see students in their school
      where.student = {
        schoolId: user.schoolId
      };

      if (studentId) where.studentId = String(studentId);
      if (classId) {
        where.student.enrollments = {
          some: {
            classId: String(classId)
          }
        };
      }
    } else {
      if (studentId) where.studentId = String(studentId);
      if (classId) {
        where.student = {
          enrollments: {
            some: {
              classId: String(classId)
            }
          }
        };
      }
    }

    if (termId) where.termId = String(termId);

    const conducts = await prisma.conduct.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          }
        },
        term: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(conducts);
  } catch (error) {
    console.error("Error fetching conducts:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateConduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { grade, appreciation, comment } = req.body;

    const conduct = await prisma.conduct.update({
      where: { id: id as string },
      data: {
        grade: grade !== undefined ? (grade !== null ? Number(grade) : null) : undefined,
        appreciation,
        comment
      }
    });

    // Synchroniser avec le bulletin de l'élève
    if (conduct.studentId && conduct.termId) {
      await prisma.bulletinEleve.updateMany({
        where: { studentId: conduct.studentId, termId: conduct.termId },
        data: {
          noteConduite: conduct.grade
        }
      });
    }

    res.json(conduct);
  } catch (error) {
    console.error("Error updating conduct:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteConduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.conduct.delete({ where: { id: id as string } });
    res.json({ message: "Conduct deleted" });
  } catch (error) {
    console.error("Error deleting conduct:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
