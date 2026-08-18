import { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { calculateConductScoreAndAppreciation } from "./conduct.controller.js";

const createAbsenceSchema = z.object({
  studentId: z.string().min(1),
  date: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  hours: z.preprocess((val) => (val !== undefined && val !== null && val !== "" ? Number(val) : 1), z.number().min(0.25).max(24)).optional().default(1),
  courseId: z.string().optional().nullable().transform((v) => (v && v.trim() !== "" ? v : null)),
  termId: z.string().optional().nullable().transform((v) => (v && v.trim() !== "" ? v : null)),
  reason: z.string().optional().nullable().transform((v) => (v && v.trim() !== "" ? v : null)),
  justified: z.preprocess((val) => Boolean(val), z.boolean()).optional().default(false),
});

/**
 * Fonction utilitaire interne pour recalculer la conduite d'un élève après un changement d'absence.
 */
async function autoSyncConductForStudent(studentId: string, termId?: string | null, date?: Date) {
  try {
    let resolvedTermId = termId;

    if (!resolvedTermId && date) {
      const term = await prisma.term.findFirst({
        where: {
          startDate: { lte: date },
          endDate: { gte: date }
        }
      });
      resolvedTermId = term?.id;
    }

    if (!resolvedTermId) {
      const currentTerm = await prisma.term.findFirst({
        where: { status: "OPEN" }
      });
      resolvedTermId = currentTerm?.id;
    }

    if (!resolvedTermId) return;

    const term = await prisma.term.findUnique({ where: { id: resolvedTermId } });
    if (!term) return;

    const absences = await prisma.absence.findMany({
      where: {
        studentId,
        OR: [
          { termId: resolvedTermId },
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

    await prisma.conduct.upsert({
      where: { studentId_termId: { studentId, termId: resolvedTermId } },
      update: {
        grade,
        appreciation,
        comment: `Calcul automatique : ${unjustifiedHours}h injustifiées, ${justifiedHours}h justifiées.`
      },
      create: {
        studentId,
        termId: resolvedTermId,
        grade,
        appreciation,
        comment: `Calcul automatique : ${unjustifiedHours}h injustifiées, ${justifiedHours}h justifiées.`
      }
    });

    await prisma.bulletinEleve.updateMany({
      where: { studentId, termId: resolvedTermId },
      data: {
        noteConduite: grade,
        totalAbsences: Math.round(unjustifiedHours + justifiedHours),
        absencesJustifiees: Math.round(justifiedHours)
      }
    });
  } catch (err) {
    console.error("Erreur autoSyncConductForStudent:", err);
  }
}

export const createAbsence = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, date, hours, courseId, termId, reason, justified } = createAbsenceSchema.parse(req.body);
    const user = req.user;

    // RBAC: Staff can only create for their school
    if ((user?.role as string) === 'DIRECTEUR' || (user?.role as string) === 'EDUCATEUR' || (user?.role as string) === 'ENSEIGNANT') {
      const student = await prisma.user.findFirst({
        where: { id: studentId, schoolId: user.schoolId }
      });
      if (!student) {
        return res.status(403).json({ message: "Élève introuvable dans votre établissement" });
      }
    }

    // Résoudre le trimestre si non fourni
    let targetTermId = termId;
    if (!targetTermId) {
      const matchingTerm = await prisma.term.findFirst({
        where: {
          startDate: { lte: date },
          endDate: { gte: date }
        }
      });
      targetTermId = matchingTerm?.id ?? null;
    }

    const absence = await prisma.absence.create({
      data: {
        studentId,
        date,
        hours: hours ?? 1,
        courseId: courseId || null,
        termId: targetTermId,
        reason: reason || null,
        justified: justified || false,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true
          }
        },
        course: {
          include: {
            subject: true
          }
        },
        term: true
      }
    });

    // Auto recalcul de la conduite pour l'élève
    await autoSyncConductForStudent(studentId, targetTermId, date);

    res.status(201).json(absence);
  } catch (error) {
    console.error("Error creating absence:", error);
    res.status(400).json({ message: "Données invalides", error });
  }
};

export const getAbsences = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, classId, termId, courseId } = req.query;
    const user = req.user;

    const where: any = {};

    // RBAC
    if ((user?.role as string) === 'APPRENANT') {
      where.studentId = user.id;
    } else if ((user?.role as string) === 'PARENT') {
      const parentLinks = await prisma.parentChild.findMany({
        where: { parentId: user.id },
        select: { studentId: true }
      });
      const childIds = parentLinks.map(p => p.studentId);
      if (studentId && childIds.includes(String(studentId))) {
        where.studentId = String(studentId);
      } else {
        where.studentId = { in: childIds };
      }
    } else if ((user?.role as string) === 'DIRECTEUR' || (user?.role as string) === 'EDUCATEUR' || (user?.role as string) === 'ENSEIGNANT') {
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
    if (courseId) where.courseId = String(courseId);

    const absences = await prisma.absence.findMany({
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
        course: {
          include: {
            subject: true
          }
        },
        term: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json(absences);
  } catch (error) {
    console.error("Error fetching absences:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateAbsence = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, justified, date, hours, courseId, termId } = req.body;

    const updateData: any = {};
    if (reason !== undefined) updateData.reason = reason && String(reason).trim() !== "" ? String(reason) : null;
    if (justified !== undefined) updateData.justified = Boolean(justified);
    if (date) updateData.date = new Date(date as string);
    if (hours !== undefined) updateData.hours = Math.max(0.25, Number(hours) || 1);
    if (courseId !== undefined) updateData.courseId = courseId && String(courseId).trim() !== "" ? String(courseId) : null;
    if (termId !== undefined) updateData.termId = termId && String(termId).trim() !== "" ? String(termId) : null;

    const absence = await prisma.absence.update({
      where: { id: id as string },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true
          }
        },
        course: {
          include: {
            subject: true
          }
        },
        term: true
      }
    });

    // Auto recalcul de la conduite
    await autoSyncConductForStudent(absence.studentId, absence.termId, absence.date);

    res.json(absence);
  } catch (error) {
    console.error("Error updating absence:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteAbsence = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.absence.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: "Absence non trouvée" });

    await prisma.absence.delete({ where: { id: id as string } });

    // Auto recalcul de la conduite après suppression
    await autoSyncConductForStudent(existing.studentId, existing.termId, existing.date);

    res.json({ message: "Absence supprimée avec succès" });
  } catch (error) {
    console.error("Error deleting absence:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
