import prisma from "../utils/prisma.js";

/**
 * Service de propagation automatique — Modèle CNED
 * Lors de la publication d'un contenu (devoir/cours/quiz),
 * propage automatiquement à tous les élèves du niveau/école/classe concerné.
 */

// =============================================
// PROPAGATION DES DEVOIRS
// =============================================

export async function propagateAssignment(assignmentId: string): Promise<number> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { include: { class: true } } }
  });

  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

  let studentIds: string[] = [];

  if (assignment.scope === "NIVEAU" && assignment.niveauId) {
    // TOUS les élèves actifs de ce niveau (modèle CNED)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        class: { niveauId: assignment.niveauId }
      },
      select: { studentId: true }
    });
    studentIds = enrollments.map((e) => e.studentId);

  } else if (assignment.scope === "ECOLE" && assignment.schoolId) {
    // Tous les élèves actifs de l'école
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        class: { schoolId: assignment.schoolId }
      },
      select: { studentId: true }
    });
    studentIds = enrollments.map((e) => e.studentId);

  } else if (assignment.courseId && assignment.course?.classId) {
    // Élèves de la classe uniquement
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        classId: assignment.course.classId
      },
      select: { studentId: true }
    });
    studentIds = enrollments.map((e) => e.studentId);
  }

  if (studentIds.length === 0) return 0;

  // Créer les traces de propagation (upsert pour éviter les doublons)
  await prisma.assignmentPropagation.createMany({
    data: studentIds.map((studentId) => ({
      assignmentId,
      studentId,
      notified: false
    })),
    skipDuplicates: true
  });

  // Notifier chaque élève + ses parents
  const notificationData: { userId: string; title: string; message: string }[] = [];

  for (const studentId of studentIds) {
    notificationData.push({
      userId: studentId,
      title: `Nouveau devoir disponible`,
      message: `Un nouveau devoir "${assignment.title}" a été publié.`
    });

    // Notifier les parents de l'élève
    const parents = await prisma.parentChild.findMany({ where: { studentId } });
    for (const pc of parents) {
      notificationData.push({
        userId: pc.parentId,
        title: `Nouveau devoir pour votre enfant`,
        message: `Le devoir "${assignment.title}" a été publié pour votre enfant.`
      });
    }
  }

  // Bulk insert notifications
  await prisma.notification.createMany({ data: notificationData });

  // Marquer les propagations comme notifiées
  await prisma.assignmentPropagation.updateMany({
    where: { assignmentId, notified: false },
    data: { notified: true }
  });

  return studentIds.length;
}

// =============================================
// PROPAGATION DES COURS
// =============================================

export async function propagateCourse(courseId: string): Promise<number> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { subject: true }
  });

  if (!course) throw new Error(`Course ${courseId} not found`);

  let studentIds: string[] = [];

  if (course.scope === "NIVEAU" && course.niveauId) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        class: { niveauId: course.niveauId }
      },
      select: { studentId: true }
    });
    studentIds = enrollments.map((e) => e.studentId);

  } else if (course.scope === "ECOLE" && course.schoolId) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        class: { schoolId: course.schoolId }
      },
      select: { studentId: true }
    });
    studentIds = enrollments.map((e) => e.studentId);

  } else if (course.classId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { status: "ACTIVE", classId: course.classId },
      select: { studentId: true }
    });
    studentIds = enrollments.map((e) => e.studentId);
  }

  if (studentIds.length === 0) return 0;

  // Notifier les élèves
  await prisma.notification.createMany({
    data: studentIds.map((userId) => ({
      userId,
      title: `Nouveau cours disponible`,
      message: `Le cours "${course.subject?.name || "Nouveau cours"}" est maintenant disponible.`
    }))
  });

  return studentIds.length;
}

// =============================================
// PROPAGATION DES QUIZ
// =============================================

export async function propagateQuiz(quizId: string): Promise<number> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: { include: { class: true } }, subject: true }
  });

  if (!quiz) throw new Error(`Quiz ${quizId} not found`);

  let studentIds: string[] = [];

  if (quiz.scope === "NIVEAU" && quiz.niveauId) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        class: { niveauId: quiz.niveauId }
      },
      select: { studentId: true }
    });
    studentIds = enrollments.map((e) => e.studentId);

  } else if (quiz.scope === "ECOLE" && quiz.schoolId) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        class: { schoolId: quiz.schoolId }
      },
      select: { studentId: true }
    });
    studentIds = enrollments.map((e) => e.studentId);

  } else if (quiz.courseId && quiz.course?.classId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { status: "ACTIVE", classId: quiz.course.classId },
      select: { studentId: true }
    });
    studentIds = enrollments.map((e) => e.studentId);
  }

  if (studentIds.length === 0) return 0;

  // Notifier les élèves + leurs parents
  const notificationData: { userId: string; title: string; message: string }[] = [];

  for (const studentId of studentIds) {
    notificationData.push({
      userId: studentId,
      title: `Nouvelle évaluation disponible`,
      message: `L'évaluation "${quiz.title}" est maintenant disponible.`
    });

    const parents = await prisma.parentChild.findMany({ where: { studentId } });
    for (const pc of parents) {
      notificationData.push({
        userId: pc.parentId,
        title: `Nouvelle évaluation pour votre enfant`,
        message: `L'évaluation "${quiz.title}" a été publiée pour votre enfant.`
      });
    }
  }

  await prisma.notification.createMany({ data: notificationData });

  return studentIds.length;
}
