import type { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

// =============================================
// Helpers
// =============================================

/**
 * Calcule la moyenne pondérée d'un élève pour un cours sur un trimestre.
 * Prend en compte: Devoirs, Évaluations, Quiz, Examens, Interros, Participation.
 */
const calculateCourseAverage = (grades: any[]): number | null => {
  if (grades.length === 0) return null;
  const validGrades = grades.filter(
    (g) => g.value !== null && g.value !== undefined
  );
  if (validGrades.length === 0) return null;

  let totalWeighted = 0;
  let totalCoeff = 0;

  validGrades.forEach((g) => {
    const coeff = g.coefficient || 1;
    totalWeighted += g.value * coeff;
    totalCoeff += coeff;
  });

  return totalCoeff > 0
    ? parseFloat((totalWeighted / totalCoeff).toFixed(2))
    : null;
};

/**
 * Calcule la moyenne générale pondérée par coefficient de matière.
 */
const calculateOverallAverage = (
  courseAverages: { average: number | null; coefficient: number }[]
): number | null => {
  const valid = courseAverages.filter((c) => c.average !== null);
  if (valid.length === 0) return null;

  const totalWeighted = valid.reduce(
    (acc, c) => acc + (c.average as number) * c.coefficient,
    0
  );
  const totalCoeff = valid.reduce((acc, c) => acc + c.coefficient, 0);

  return totalCoeff > 0
    ? parseFloat((totalWeighted / totalCoeff).toFixed(2))
    : null;
};

/**
 * Retourne l'appréciation textuelle selon la moyenne.
 */
const getAppreciation = (avg: number | null): string => {
  if (avg === null) return "Non évalué";
  if (avg >= 18) return "Excellent";
  if (avg >= 16) return "Très Bien";
  if (avg >= 14) return "Bien";
  if (avg >= 12) return "Assez Bien";
  if (avg >= 10) return "Passable";
  if (avg >= 8) return "Insuffisant";
  return "Très Insuffisant";
};

// =============================================
// Génération / Calcul des bulletins
// =============================================

/**
 * Génère ou met à jour les bulletins de tous les élèves d'une classe pour un trimestre.
 * Calcule automatiquement les moyennes, rang, absences.
 */
export const generateClassBulletins = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { classId, termId } = req.body;

    if (!classId || !termId) {
      return res
        .status(400)
        .json({ message: "classId et termId sont requis" });
    }

    // Vérifier accès
    const role = req.user?.role as string;
    if (
      role !== "SUPER_ADMIN" &&
      role !== "DIRECTEUR" &&
      role !== "EDUCATEUR" &&
      role !== "ENSEIGNANT"
    ) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Récupérer les élèves de la classe
    const enrollments = await prisma.enrollment.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
      },
      orderBy: { student: { lastName: "asc" } },
    });

    if (enrollments.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun élève dans cette classe" });
    }

    // Récupérer les cours de la classe
    const courses = await prisma.course.findMany({
      where: { classId },
      include: { subject: true },
    });

    // Récupérer toutes les notes du trimestre pour cette classe
    const allGrades = await prisma.grade.findMany({
      where: {
        termId,
        student: {
          enrollments: { some: { classId } },
        },
      },
      include: { assignment: true },
    });

    // Récupérer les absences du trimestre
    const term = await prisma.term.findUnique({ where: { id: termId } });
    const absenceWhere: any = { studentId: { in: enrollments.map((e) => e.studentId) } };
    if (term) {
      absenceWhere.date = { gte: term.startDate, lte: term.endDate };
    }
    const allAbsences = await prisma.absence.findMany({ where: absenceWhere });

    // Calculer la moyenne de chaque élève
    const studentAverages: { studentId: string; average: number | null }[] = [];

    for (const enrollment of enrollments) {
      const sid = enrollment.studentId;
      const studentGrades = allGrades.filter((g) => g.studentId === sid);

      const courseAverages = courses.map((course) => {
        const cGrades = studentGrades.filter(
          (g) =>
            g.courseId === course.id ||
            g.assignment?.courseId === course.id
        );
        return {
          average: calculateCourseAverage(cGrades),
          coefficient: (course as any).coefficient || 1,
        };
      });

      // Note de participation (type PARTICIPATION liées au cours)
      const participationGrades = studentGrades.filter(
        (g) => (g as any).type === "PARTICIPATION"
      );
      const avgParticipation =
        participationGrades.length > 0
          ? participationGrades.reduce((acc, g) => acc + g.value, 0) /
            participationGrades.length
          : null;

      // Conduite du trimestre
      const conduct = await prisma.conduct.findFirst({
        where: { studentId: sid, termId },
      });

      const overallAvg = calculateOverallAverage(courseAverages);
      studentAverages.push({ studentId: sid, average: overallAvg });

      // Absences
      const studentAbsences = allAbsences.filter((a) => a.studentId === sid);
      const totalAbsences = studentAbsences.length;
      const absencesJustifiees = studentAbsences.filter((a) => a.justified).length;

      // Upsert BulletinEleve
      await prisma.bulletinEleve.upsert({
        where: { studentId_termId: { studentId: sid, termId } },
        update: {
          classId,
          moyenneGenerale: overallAvg,
          noteConduite: (conduct as any)?.grade ?? null,
          noteParticipation: avgParticipation,
          totalAbsences,
          absencesJustifiees,
          appreciationGenerale: getAppreciation(overallAvg),
        },
        create: {
          studentId: sid,
          termId,
          classId,
          moyenneGenerale: overallAvg,
          noteConduite: (conduct as any)?.grade ?? null,
          noteParticipation: avgParticipation,
          totalAbsences,
          absencesJustifiees,
          appreciationGenerale: getAppreciation(overallAvg),
          statut: "BROUILLON",
        },
      });
    }

    // Calculer les rangs
    const sortedAverages = [...studentAverages]
      .filter((s) => s.average !== null)
      .sort((a, b) => (b.average as number) - (a.average as number));

    const nombreEleves = enrollments.length;

    for (let i = 0; i < sortedAverages.length; i++) {
      await prisma.bulletinEleve.update({
        where: {
          studentId_termId: {
            studentId: sortedAverages[i].studentId,
            termId,
          },
        },
        data: { rangClasse: i + 1, nombreEleves },
      });
    }

    const bulletins = await prisma.bulletinEleve.findMany({
      where: { classId, termId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
      },
      orderBy: { rangClasse: "asc" },
    });

    res.json({
      message: `${bulletins.length} bulletins générés/mis à jour`,
      bulletins,
    });
  } catch (error) {
    console.error("Erreur génération bulletins:", error);
    res.status(500).json({ message: "Erreur lors de la génération des bulletins", error });
  }
};

// =============================================
// Récupération
// =============================================

/**
 * Récupère le bulletin complet d'un élève pour un trimestre donné.
 */
export const getBulletinEleve = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.query;

    if (!studentId || !termId) {
      return res.status(400).json({ message: "studentId et termId requis" });
    }

    // RBAC
    const role = req.user?.role as string;
    if (role === "APPRENANT" && req.user?.id !== studentId) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Récupérer l'élève
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        enrollments: {
          include: { class: { include: { niveau: true } } },
          orderBy: { joinedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!student)
      return res.status(404).json({ message: "Élève introuvable" });

    const enrollment = student.enrollments[0];
    if (!enrollment)
      return res
        .status(400)
        .json({ message: "Élève non inscrit dans une classe" });

    const classId = enrollment.classId;

    // Récupérer le bulletin
    let bulletin = await prisma.bulletinEleve.findUnique({
      where: {
        studentId_termId: { studentId, termId: termId as string },
      },
      include: {
        soumisPar: { select: { firstName: true, lastName: true } },
        valideEducateurPar: { select: { firstName: true, lastName: true } },
        valideDirecteurPar: { select: { firstName: true, lastName: true } },
        valideAdminPar: { select: { firstName: true, lastName: true } },
      },
    });

    // Si pas encore de bulletin, on le génère à la volée
    if (!bulletin) {
      await generateBulletinForStudent(studentId, termId as string, classId);
      bulletin = await prisma.bulletinEleve.findUnique({
        where: { studentId_termId: { studentId, termId: termId as string } },
        include: {
          soumisPar: { select: { firstName: true, lastName: true } },
          valideEducateurPar: { select: { firstName: true, lastName: true } },
          valideDirecteurPar: { select: { firstName: true, lastName: true } },
          valideAdminPar: { select: { firstName: true, lastName: true } },
        },
      });
    }

    // Récupérer les cours
    const courses = await prisma.course.findMany({
      where: { classId },
      include: {
        subject: true,
        teacher: { select: { firstName: true, lastName: true } },
      },
    });

    // Récupérer les notes de l'élève pour ce trimestre
    const grades = await prisma.grade.findMany({
      where: { studentId, termId: termId as string },
      include: { assignment: true },
    });

    // Récupérer la conduite
    const conduct = await prisma.conduct.findFirst({
      where: { studentId, termId: termId as string },
    });

    // Récupérer le terme
    const term = await prisma.term.findUnique({
      where: { id: termId as string },
      include: { academicYear: true },
    });

    // Calculer les moyennes par matière
    const subjectStats = courses.map((course) => {
      const courseGrades = grades.filter(
        (g) =>
          g.courseId === course.id ||
          g.assignment?.courseId === course.id
      );

      // Regrouper par type
      const devoirsGrades = courseGrades.filter(
        (g) => (g as any).type === "DEVOIR" || (g as any).type === "INTERRO"
      );
      const evalGrades = courseGrades.filter(
        (g) => (g as any).type === "EVALUATION" || (g as any).type === "EXAMEN"
      );
      const quizGrades = courseGrades.filter(
        (g) => (g as any).type === "QUIZ"
      );
      const participationGrades = courseGrades.filter(
        (g) => (g as any).type === "PARTICIPATION"
      );

      const average = calculateCourseAverage(courseGrades);
      const avgDevoirs = calculateCourseAverage(devoirsGrades);
      const avgEval = calculateCourseAverage(evalGrades);
      const avgQuiz = calculateCourseAverage(quizGrades);
      const avgParticipation = calculateCourseAverage(participationGrades);

      return {
        courseId: course.id,
        subjectId: course.subject.id,
        subjectName: course.subject.name,
        subjectCode: course.subject.code,
        coefficient: (course as any).coefficient || 1,
        teacher: `${course.teacher.firstName} ${course.teacher.lastName}`,
        average,
        appreciation: getAppreciation(average),
        avgDevoirs,
        avgEval,
        avgQuiz,
        avgParticipation,
        gradesCount: courseGrades.length,
      };
    });

    // Moyenne générale
    const overallAverage = calculateOverallAverage(
      subjectStats.map((s) => ({
        average: s.average,
        coefficient: s.coefficient,
      }))
    );

    // Rang dans la classe (depuis le bulletin calculé)
    const rangClasse = bulletin?.rangClasse ?? null;
    const nombreEleves = bulletin?.nombreEleves ?? null;

    // Synthèse annuelle (tous les trimestres de l'année)
    let termsSummary: any[] = [];
    let annualAverage: number | null = null;
    if (term?.academicYearId) {
      const allTerms = await prisma.term.findMany({
        where: { academicYearId: term.academicYearId },
        orderBy: { startDate: "asc" },
      });

      const allBulletins = await prisma.bulletinEleve.findMany({
        where: {
          studentId,
          termId: { in: allTerms.map((t) => t.id) },
        },
      });

      termsSummary = allTerms.map((t) => {
        const b = allBulletins.find((bul) => bul.termId === t.id);
        return {
          termId: t.id,
          termName: t.name,
          overallAverage: b?.moyenneGenerale ?? null,
          statut: b?.statut ?? null,
        };
      });

      const validTermAverages = allBulletins
        .map((b) => b.moyenneGenerale)
        .filter((a): a is number => a !== null);
      annualAverage =
        validTermAverages.length > 0
          ? parseFloat(
              (
                validTermAverages.reduce((acc, v) => acc + v, 0) /
                validTermAverages.length
              ).toFixed(2)
            )
          : null;
    }

    res.json({
      bulletin,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        matricule: student.matricule,
        class: enrollment.class.name,
        niveau: enrollment.class.niveau?.nom ?? null,
      },
      school: student.school,
      term,
      subjects: subjectStats,
      overallAverage,
      rangClasse,
      nombreEleves,
      conduct: conduct
        ? {
            appreciation: (conduct as any).appreciation,
            comment: (conduct as any).comment,
            grade: (conduct as any).grade,
          }
        : null,
      totalAbsences: bulletin?.totalAbsences ?? 0,
      absencesJustifiees: bulletin?.absencesJustifiees ?? 0,
      termsSummary,
      annualAverage,
    });
  } catch (error) {
    console.error("Erreur récupération bulletin:", error);
    res.status(500).json({ message: "Erreur lors de la récupération du bulletin" });
  }
};

/**
 * Liste tous les bulletins d'une classe pour un trimestre.
 */
export const getClassBulletins = async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const { termId } = req.query;

    if (!classId || !termId) {
      return res.status(400).json({ message: "classId et termId requis" });
    }

    const bulletins = await prisma.bulletinEleve.findMany({
      where: { classId, termId: termId as string },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            avatarUrl: true,
          },
        },
        soumisPar: { select: { firstName: true, lastName: true } },
        valideEducateurPar: { select: { firstName: true, lastName: true } },
        valideDirecteurPar: { select: { firstName: true, lastName: true } },
      },
      orderBy: { rangClasse: "asc" },
    });

    res.json(bulletins);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Liste les bulletins en attente de validation selon le rôle de l'utilisateur.
 */
export const getBulletinsToValidate = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const role = req.user?.role as string;
    const { termId, classId } = req.query;

    const statusMap: Record<string, string> = {
      EDUCATEUR: "SOUMIS_ENSEIGNANT",
      DIRECTEUR: "VALIDE_EDUCATEUR",
      SUPER_ADMIN: "VALIDE_DIRECTEUR",
    };

    const targetStatus = statusMap[role];
    if (!targetStatus) {
      return res
        .status(403)
        .json({ message: "Ce rôle ne peut pas valider de bulletins" });
    }

    const where: any = { statut: targetStatus };

    if (termId) where.termId = termId as string;
    if (classId) where.classId = classId as string;

    // Filtrer par école si DIRECTEUR ou EDUCATEUR
    if (role === "DIRECTEUR" || role === "EDUCATEUR") {
      where.class = { schoolId: req.user?.schoolId };
    }

    const bulletins = await prisma.bulletinEleve.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
          },
        },
        class: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        soumisPar: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { student: { lastName: "asc" } }],
    });

    res.json(bulletins);
  } catch (error) {
    console.error("Erreur récupération bulletins à valider:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// =============================================
// Workflow — Soumission & Validation
// =============================================

/**
 * ENSEIGNANT soumet le bulletin d'un élève.
 * BROUILLON → SOUMIS_ENSEIGNANT
 */
export const soumettreBulletin = async (req: AuthRequest, res: Response) => {
  try {
    const { bulletinId } = req.params;
    const role = req.user?.role as string;

    if (role !== "ENSEIGNANT" && role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Seul l'enseignant peut soumettre" });
    }

    const bulletin = await prisma.bulletinEleve.findUnique({
      where: { id: bulletinId },
    });
    if (!bulletin)
      return res.status(404).json({ message: "Bulletin introuvable" });

    if (bulletin.statut !== "BROUILLON" && bulletin.statut !== "REJETE") {
      return res
        .status(400)
        .json({ message: "Ce bulletin ne peut pas être soumis dans son état actuel" });
    }

    const updated = await prisma.bulletinEleve.update({
      where: { id: bulletinId },
      data: {
        statut: "SOUMIS_ENSEIGNANT",
        soumisParId: req.user!.id,
        soumisAt: new Date(),
        rejetCommentaire: null,
        rejetPar: null,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la soumission" });
  }
};

/**
 * Soumet en lot tous les bulletins BROUILLON d'une classe.
 */
export const soumettreClasseBulletins = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { classId, termId } = req.body;
    const role = req.user?.role as string;

    if (role !== "ENSEIGNANT" && role !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const result = await prisma.bulletinEleve.updateMany({
      where: {
        classId,
        termId,
        statut: { in: ["BROUILLON", "REJETE"] },
      },
      data: {
        statut: "SOUMIS_ENSEIGNANT",
        soumisParId: req.user!.id,
        soumisAt: new Date(),
        rejetCommentaire: null,
      },
    });

    res.json({ message: `${result.count} bulletins soumis`, count: result.count });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la soumission en lot" });
  }
};

/**
 * Valide un bulletin selon le rôle de l'utilisateur.
 * EDUCATEUR: SOUMIS_ENSEIGNANT → VALIDE_EDUCATEUR
 * DIRECTEUR: VALIDE_EDUCATEUR → VALIDE_DIRECTEUR
 * SUPER_ADMIN: VALIDE_DIRECTEUR → VALIDE_SUPER_ADMIN
 */
export const validerBulletin = async (req: AuthRequest, res: Response) => {
  try {
    const { bulletinId } = req.params;
    const { commentaireEducateur, commentaireDirecteur } = req.body;
    const role = req.user?.role as string;

    const bulletin = await prisma.bulletinEleve.findUnique({
      where: { id: bulletinId },
    });
    if (!bulletin)
      return res.status(404).json({ message: "Bulletin introuvable" });

    let updateData: any = {};
    let expectedStatus: string;

    switch (role) {
      case "EDUCATEUR":
        expectedStatus = "SOUMIS_ENSEIGNANT";
        if (bulletin.statut !== expectedStatus) {
          return res.status(400).json({
            message: `Le bulletin doit être en statut SOUMIS_ENSEIGNANT pour être validé par l'éducateur`,
          });
        }
        updateData = {
          statut: "VALIDE_EDUCATEUR",
          valideEducateurParId: req.user!.id,
          valideEducateurAt: new Date(),
          ...(commentaireEducateur && { commentaireEducateur }),
        };
        break;

      case "DIRECTEUR":
        expectedStatus = "VALIDE_EDUCATEUR";
        if (bulletin.statut !== expectedStatus) {
          return res.status(400).json({
            message: `Le bulletin doit être en statut VALIDE_EDUCATEUR pour être validé par le directeur`,
          });
        }
        updateData = {
          statut: "VALIDE_DIRECTEUR",
          valideDirecteurParId: req.user!.id,
          valideDirecteurAt: new Date(),
          ...(commentaireDirecteur && { commentaireDirecteur }),
        };
        break;

      case "SUPER_ADMIN":
        expectedStatus = "VALIDE_DIRECTEUR";
        if (bulletin.statut !== expectedStatus) {
          return res.status(400).json({
            message: `Le bulletin doit être en statut VALIDE_DIRECTEUR pour la validation finale`,
          });
        }
        updateData = {
          statut: "VALIDE_SUPER_ADMIN",
          valideAdminParId: req.user!.id,
          valideAdminAt: new Date(),
        };
        break;

      default:
        return res.status(403).json({ message: "Ce rôle ne peut pas valider de bulletins" });
    }

    const updated = await prisma.bulletinEleve.update({
      where: { id: bulletinId },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur validation bulletin:", error);
    res.status(500).json({ message: "Erreur lors de la validation" });
  }
};

/**
 * Valide en lot tous les bulletins d'une classe selon le rôle.
 */
export const validerClasseBulletins = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { classId, termId, commentaireEducateur, commentaireDirecteur } =
      req.body;
    const role = req.user?.role as string;

    const statusMap: Record<
      string,
      { from: string; to: string; update: any }
    > = {
      EDUCATEUR: {
        from: "SOUMIS_ENSEIGNANT",
        to: "VALIDE_EDUCATEUR",
        update: {
          statut: "VALIDE_EDUCATEUR",
          valideEducateurParId: req.user!.id,
          valideEducateurAt: new Date(),
          ...(commentaireEducateur && { commentaireEducateur }),
        },
      },
      DIRECTEUR: {
        from: "VALIDE_EDUCATEUR",
        to: "VALIDE_DIRECTEUR",
        update: {
          statut: "VALIDE_DIRECTEUR",
          valideDirecteurParId: req.user!.id,
          valideDirecteurAt: new Date(),
          ...(commentaireDirecteur && { commentaireDirecteur }),
        },
      },
      SUPER_ADMIN: {
        from: "VALIDE_DIRECTEUR",
        to: "VALIDE_SUPER_ADMIN",
        update: {
          statut: "VALIDE_SUPER_ADMIN",
          valideAdminParId: req.user!.id,
          valideAdminAt: new Date(),
        },
      },
    };

    const config = statusMap[role];
    if (!config) {
      return res
        .status(403)
        .json({ message: "Ce rôle ne peut pas valider de bulletins" });
    }

    const result = await prisma.bulletinEleve.updateMany({
      where: { classId, termId, statut: config.from as any },
      data: config.update,
    });

    res.json({ message: `${result.count} bulletins validés`, count: result.count });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la validation en lot" });
  }
};

/**
 * Rejette un bulletin avec commentaire.
 */
export const rejeterBulletin = async (req: AuthRequest, res: Response) => {
  try {
    const { bulletinId } = req.params;
    const { commentaire } = req.body;
    const role = req.user?.role as string;

    if (!["EDUCATEUR", "DIRECTEUR", "SUPER_ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const updated = await prisma.bulletinEleve.update({
      where: { id: bulletinId },
      data: {
        statut: "REJETE",
        rejetCommentaire: commentaire || "Bulletin rejeté",
        rejetPar: req.user!.id,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du rejet" });
  }
};

/**
 * Met à jour les appréciations et commentaires d'un bulletin.
 */
export const updateBulletinAppreciations = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { bulletinId } = req.params;
    const { appreciationGenerale, commentaireEducateur, commentaireDirecteur } =
      req.body;
    const role = req.user?.role as string;

    const bulletin = await prisma.bulletinEleve.findUnique({
      where: { id: bulletinId },
    });
    if (!bulletin)
      return res.status(404).json({ message: "Bulletin introuvable" });

    // RBAC pour les commentaires
    const updateData: any = {};
    if (
      appreciationGenerale !== undefined &&
      (role === "ENSEIGNANT" ||
        role === "DIRECTEUR" ||
        role === "SUPER_ADMIN")
    ) {
      updateData.appreciationGenerale = appreciationGenerale;
    }
    if (
      commentaireEducateur !== undefined &&
      (role === "EDUCATEUR" || role === "SUPER_ADMIN")
    ) {
      updateData.commentaireEducateur = commentaireEducateur;
    }
    if (
      commentaireDirecteur !== undefined &&
      (role === "DIRECTEUR" || role === "SUPER_ADMIN")
    ) {
      updateData.commentaireDirecteur = commentaireDirecteur;
    }

    const updated = await prisma.bulletinEleve.update({
      where: { id: bulletinId },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

// =============================================
// Helper interne: Génération d'un bulletin individuel
// =============================================

async function generateBulletinForStudent(
  studentId: string,
  termId: string,
  classId: string
) {
  const grades = await prisma.grade.findMany({
    where: { studentId, termId },
    include: { assignment: true },
  });

  const courses = await prisma.course.findMany({
    where: { classId },
    include: { subject: true },
  });

  const courseAverages = courses.map((course) => {
    const cGrades = grades.filter(
      (g) =>
        g.courseId === course.id || g.assignment?.courseId === course.id
    );
    return {
      average: calculateCourseAverage(cGrades),
      coefficient: (course as any).coefficient || 1,
    };
  });

  const overallAvg = calculateOverallAverage(courseAverages);

  const participationGrades = grades.filter(
    (g) => (g as any).type === "PARTICIPATION"
  );
  const avgParticipation =
    participationGrades.length > 0
      ? participationGrades.reduce((acc, g) => acc + g.value, 0) /
        participationGrades.length
      : null;

  const conduct = await prisma.conduct.findFirst({
    where: { studentId, termId },
  });

  const term = await prisma.term.findUnique({ where: { id: termId } });
  const absenceWhere: any = { studentId };
  if (term) {
    absenceWhere.date = { gte: term.startDate, lte: term.endDate };
  }
  const absences = await prisma.absence.findMany({ where: absenceWhere });

  await prisma.bulletinEleve.upsert({
    where: { studentId_termId: { studentId, termId } },
    update: {
      moyenneGenerale: overallAvg,
      noteConduite: (conduct as any)?.grade ?? null,
      noteParticipation: avgParticipation,
      totalAbsences: absences.length,
      absencesJustifiees: absences.filter((a) => a.justified).length,
      appreciationGenerale: getAppreciation(overallAvg),
    },
    create: {
      studentId,
      termId,
      classId,
      moyenneGenerale: overallAvg,
      noteConduite: (conduct as any)?.grade ?? null,
      noteParticipation: avgParticipation,
      totalAbsences: absences.length,
      absencesJustifiees: absences.filter((a) => a.justified).length,
      appreciationGenerale: getAppreciation(overallAvg),
      statut: "BROUILLON",
    },
  });
}
