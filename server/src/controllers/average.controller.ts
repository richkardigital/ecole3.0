import type { Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";
import { calculateAndSaveAnnualAverages, calculateCourseTermAverage, calculateOverallTermAverage } from "../services/averages.js";

// =============================================
// GET MOYENNES TRIMESTRIELLES D'UNE CLASSE
// =============================================

export const getTermAverages = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, termId } = req.params;

    if (!classId || !termId) {
      return res.status(400).json({ message: "classId et termId sont requis" });
    }

    // Récupérer les élèves de la classe avec include explicite
    const enrollments = await prisma.enrollment.findMany({
      where: { classId: classId as string, status: "ACTIVE" },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } }
      }
    });

    const targetClass = await prisma.class.findUnique({
      where: { id: String(classId) },
      include: { niveau: true }
    });

    // Récupérer les cours de la classe avec include explicite
    const courses = targetClass?.niveauId ? await prisma.course.findMany({
      where: { niveauId: targetClass.niveauId },
      include: { subject: { select: { id: true, name: true, coefficient: true } } }
    }) : [];

    const results: any[] = [];

    for (const enrollment of enrollments) {
      const studentId = enrollment.studentId;
      const student = (enrollment as any).student;
      const courseAverages: any[] = [];

      for (const course of courses) {
        const subj = (course as any).subject;
        const avg = await calculateCourseTermAverage(studentId, course.id, termId as string);
        courseAverages.push({
          courseId: course.id,
          subjectName: subj?.name,
          coefficient: subj?.coefficient || 1,
          average: avg
        });
      }

      const overall = await calculateOverallTermAverage(studentId, termId as string, classId as string);

      results.push({
        student,
        courseAverages,
        overallAverage: overall
      });
    }

    // Calculer les rangs
    const sorted = results
      .filter((r) => r.overallAverage !== null)
      .sort((a, b) => (b.overallAverage - a.overallAverage));

    const withRanks = results.map((r) => {
      const rank = sorted.findIndex((s: any) => s.student.id === r.student.id);
      return { ...r, rank: rank >= 0 ? rank + 1 : null };
    });

    res.json({ classId, termId, students: withRanks, totalStudents: enrollments.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors du calcul des moyennes", error });
  }
};

// =============================================
// GET MOYENNES ANNUELLES D'UNE CLASSE
// =============================================

export const getAnnualAverages = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, academicYearId } = req.params;

    if (!classId || !academicYearId) {
      return res.status(400).json({ message: "classId et academicYearId sont requis" });
    }

    const targetClass = await prisma.class.findUnique({
      where: { id: String(classId) }
    });

    const averages = await prisma.annualAverage.findMany({
      where: {
        academicYearId: String(academicYearId),
        course: { niveauId: targetClass?.niveauId || undefined }
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        course: {
          include: { subject: { select: { name: true, coefficient: true } } }
        }
      },
      orderBy: [{ student: { lastName: "asc" } }]
    });

    // Regrouper par élève
    const byStudent: Record<string, any> = {};

    for (const avg of averages) {
      const s = (avg as any).student;
      const c = (avg as any).course;
      const sid = avg.studentId;

      if (!byStudent[sid]) {
        byStudent[sid] = { student: s, courses: [], annualGeneralAvg: null };
      }

      byStudent[sid].courses.push({
        courseId: avg.courseId,
        subjectName: c?.subject?.name,
        coefficient: avg.subjectCoefficient,
        trim1Avg: avg.trim1Avg,
        trim2Avg: avg.trim2Avg,
        trim3Avg: avg.trim3Avg,
        annualAvg: avg.annualAvg
      });
    }

    // Calculer la moyenne annuelle générale par élève
    const results = Object.values(byStudent).map((s: any) => {
      const validCourses = s.courses.filter((c: any) => c.annualAvg !== null);
      let totalW = 0;
      let totalC = 0;
      for (const c of validCourses) {
        totalW += c.annualAvg * c.coefficient;
        totalC += c.coefficient;
      }
      s.annualGeneralAvg = totalC > 0 ? parseFloat((totalW / totalC).toFixed(2)) : null;
      return s;
    });

    // Trier par moyenne générale pour calculer les rangs
    const sorted = [...results].sort((a: any, b: any) => {
      if (a.annualGeneralAvg === null) return 1;
      if (b.annualGeneralAvg === null) return -1;
      return b.annualGeneralAvg - a.annualGeneralAvg;
    });

    const withRanks = results.map((r: any) => {
      const rank = sorted.findIndex((s: any) => s.student.id === r.student.id);
      return { ...r, annualRank: rank >= 0 ? rank + 1 : null };
    });

    res.json({ classId, academicYearId, students: withRanks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des moyennes annuelles", error });
  }
};

// =============================================
// DÉCLENCHER LE CALCUL DES MOYENNES ANNUELLES
// =============================================

export const triggerAnnualCalculation = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role as string;
    if (!["SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR"].includes(role)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const { classId, academicYearId } = req.body;
    if (!classId || !academicYearId) {
      return res.status(400).json({ message: "classId et academicYearId sont requis" });
    }

    const result = await calculateAndSaveAnnualAverages(classId as string, academicYearId as string);

    res.json({
      message: `Calcul terminé : ${result.processed} moyennes calculées`,
      ...result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors du calcul des moyennes annuelles", error });
  }
};

// =============================================
// GET MOYENNE D'UN ÉLÈVE (vue élève/parent)
// =============================================

export const getStudentAverages = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role as string;
    const { studentId } = req.params;
    const termId = req.query.termId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;

    // L'élève ne peut voir que ses propres notes
    let targetStudentId = studentId as string;
    if (role === "APPRENANT") {
      targetStudentId = req.user!.id;
    }

    if (!targetStudentId) {
      return res.status(400).json({ message: "studentId requis" });
    }

    // Si academicYearId fourni → retourner les moyennes annuelles
    if (academicYearId) {
      const annuals = await prisma.annualAverage.findMany({
        where: { studentId: targetStudentId, academicYearId },
        include: {
          course: {
            include: { subject: { select: { name: true, coefficient: true } } }
          }
        }
      });

      return res.json({ studentId: targetStudentId, academicYearId, annualAverages: annuals });
    }

    // Si termId fourni → retourner les moyennes du trimestre
    if (termId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: targetStudentId, status: "ACTIVE" }
      });

      if (!enrollment) {
        return res.status(404).json({ message: "Élève non inscrit dans une classe active" });
      }

      const studentClass = await prisma.class.findUnique({ where: { id: enrollment.classId } });
      const courses = studentClass?.niveauId ? await prisma.course.findMany({
        where: { niveauId: studentClass.niveauId },
        include: { subject: { select: { name: true, coefficient: true } } }
      }) : [];

      const courseAverages: any[] = [];
      for (const course of courses) {
        const subj = (course as any).subject;
        const avg = await calculateCourseTermAverage(targetStudentId, course.id, termId);
        courseAverages.push({
          courseId: course.id,
          subjectName: subj?.name,
          coefficient: subj?.coefficient || 1,
          average: avg
        });
      }

      const overall = await calculateOverallTermAverage(targetStudentId, termId, enrollment.classId);

      return res.json({ studentId: targetStudentId, termId, courseAverages, overallAverage: overall });
    }

    return res.status(400).json({ message: "termId ou academicYearId requis" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des moyennes", error });
  }
};
