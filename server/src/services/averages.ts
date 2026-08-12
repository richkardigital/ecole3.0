import prisma from "../utils/prisma.js";

/**
 * Service de calcul des moyennes pondérées — Modèle CNED
 *
 * Pondération :
 * - Notes ADMIN (évaluations spéciales SUPER_ADMIN) : 60% du calcul
 * - Notes ENSEIGNANT (évaluations de classe) : 40% du calcul
 * - Exercices non notés (isGraded=false) : EXCLUS du calcul
 */

// =============================================
// HELPER : Calcul pondéré 60%/40%
// =============================================

function calcWeightedAverage(grades: {
  value: number;
  coefficient: number;
  source: string;
  isGraded: boolean;
}[]): number | null {
  // Exclure les exercices non notés
  const graded = grades.filter((g) => g.isGraded && g.value !== null);
  if (graded.length === 0) return null;

  const adminGrades = graded.filter((g) => g.source === "ADMIN");
  const teacherGrades = graded.filter((g) => g.source === "ENSEIGNANT");

  const calcGroupAvg = (
    items: typeof graded
  ): { avg: number; totalCoeff: number } | null => {
    if (items.length === 0) return null;
    let totalW = 0;
    let totalC = 0;
    for (const g of items) {
      totalW += g.value * g.coefficient;
      totalC += g.coefficient;
    }
    return totalC > 0 ? { avg: totalW / totalC, totalCoeff: totalC } : null;
  };

  const adminResult = calcGroupAvg(adminGrades);
  const teacherResult = calcGroupAvg(teacherGrades);

  if (!adminResult && !teacherResult) return null;

  // Si seulement un type de note existe, utiliser 100% de ce type
  if (!adminResult) return teacherResult ? parseFloat(teacherResult.avg.toFixed(2)) : null;
  if (!teacherResult) return adminResult ? parseFloat(adminResult.avg.toFixed(2)) : null;

  // Les deux types : pondération 60% ADMIN + 40% ENSEIGNANT
  const weighted = adminResult.avg * 0.6 + teacherResult.avg * 0.4;
  return parseFloat(weighted.toFixed(2));
}

// =============================================
// CALCUL MOYENNE PAR MATIÈRE / TRIMESTRE
// =============================================

export async function calculateCourseTermAverage(
  studentId: string,
  courseId: string,
  termId: string
): Promise<number | null> {
  const grades = await prisma.grade.findMany({
    where: {
      studentId,
      courseId,
      termId,
      type: { notIn: ["CONDUITE", "PARTICIPATION"] }
    },
    select: {
      value: true,
      coefficient: true,
      source: true,
      isGraded: true
    }
  });

  return calcWeightedAverage(grades as any);
}

// =============================================
// CALCUL MOYENNE GÉNÉRALE / TRIMESTRE
// =============================================

export async function calculateOverallTermAverage(
  studentId: string,
  termId: string,
  classId: string
): Promise<number | null> {
  // Récupérer tous les cours de la classe avec leur coefficient de matière
  const courses = await prisma.course.findMany({
    where: { classId },
    include: { subject: { select: { coefficient: true } } }
  });

  const courseAverages: { avg: number; coeff: number }[] = [];

  for (const course of courses) {
    const avg = await calculateCourseTermAverage(studentId, course.id, termId);
    if (avg !== null) {
      courseAverages.push({ avg, coeff: (course as any).subject?.coefficient || 1 });
    }
  }

  if (courseAverages.length === 0) return null;

  let totalW = 0;
  let totalC = 0;
  for (const { avg, coeff } of courseAverages) {
    totalW += avg * coeff;
    totalC += coeff;
  }

  return totalC > 0 ? parseFloat((totalW / totalC).toFixed(2)) : null;
}

// =============================================
// CALCUL ET SAUVEGARDE DES MOYENNES ANNUELLES
// =============================================

export async function calculateAndSaveAnnualAverages(
  classId: string,
  academicYearId: string
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  // Récupérer les trimestres de l'année
  const terms = await prisma.term.findMany({
    where: { academicYearId },
    orderBy: { startDate: "asc" }
  });

  // Récupérer les élèves de la classe
  const enrollments = await prisma.enrollment.findMany({
    where: { classId, status: "ACTIVE" },
    select: { studentId: true }
  });

  // Récupérer les cours de la classe
  const courses = await prisma.course.findMany({
    where: { classId },
    include: { subject: true }
  });

  for (const enrollment of enrollments) {
    const { studentId } = enrollment;

    for (const course of courses) {
      try {
        const trimAverages: (number | null)[] = [];

        for (const term of terms) {
          const avg = await calculateCourseTermAverage(studentId, course.id, term.id);
          trimAverages.push(avg);
        }

        const [trim1Avg, trim2Avg, trim3Avg] = trimAverages;

        // Calcul moyenne annuelle = moyenne des trimestres (excluant les nulls)
        const validTrims = trimAverages.filter((a) => a !== null) as number[];
        const annualAvg =
          validTrims.length > 0
            ? parseFloat((validTrims.reduce((s, v) => s + v, 0) / validTrims.length).toFixed(2))
            : null;

        await prisma.annualAverage.upsert({
          where: {
            studentId_courseId_academicYearId: { studentId, courseId: course.id, academicYearId }
          },
          update: {
            trim1Avg: trim1Avg ?? undefined,
            trim2Avg: trim2Avg ?? undefined,
            trim3Avg: trim3Avg ?? undefined,
            annualAvg: annualAvg ?? undefined,
            subjectCoefficient: (course as any).subject?.coefficient || 1,
            updatedAt: new Date()
          },
          create: {
            studentId,
            courseId: course.id,
            academicYearId,
            niveauId: course.niveauId ?? null,
            subjectCoefficient: (course as any).subject?.coefficient || 1,
            trim1Avg,
            trim2Avg,
            trim3Avg,
            annualAvg
          }
        });

        processed++;
      } catch (err: any) {
        errors.push(`Erreur étudiant ${studentId}, cours ${course.id}: ${err.message}`);
      }
    }
  }

  return { processed, errors };
}

// =============================================
// CALCUL RANG CLASSE PAR TRIMESTRE
// =============================================

export async function calculateClassRankings(
  classId: string,
  termId: string
): Promise<{ studentId: string; average: number | null; rank: number }[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { classId, status: "ACTIVE" },
    select: { studentId: true }
  });

  const results: { studentId: string; average: number | null }[] = [];

  for (const { studentId } of enrollments) {
    const avg = await calculateOverallTermAverage(studentId, termId, classId);
    results.push({ studentId, average: avg });
  }

  // Trier par moyenne décroissante
  const sorted = results.sort((a, b) => {
    if (a.average === null) return 1;
    if (b.average === null) return -1;
    return b.average - a.average;
  });

  // Assigner les rangs
  return sorted.map((r, idx) => ({ ...r, rank: idx + 1 }));
}
