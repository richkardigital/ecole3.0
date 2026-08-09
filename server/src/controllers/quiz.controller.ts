import type { Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

// ─── Schémas de validation ────────────────────────────────────────────────────

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "FILL_IN_BLANK", "OPEN"]).default("SINGLE_CHOICE"),
  points: z.coerce.number().int().min(1).default(1),
  imageUrl: z.string().optional().nullable(),
  position: z.coerce.number().int().default(0),
  correctAnswer: z.string().optional().nullable(), // Pour FILL_IN_BLANK
  options: z.array(z.object({
    text: z.string().min(1),
    imageUrl: z.string().optional().nullable(),
    isCorrect: z.boolean(),
  })).optional().default([]),
});

const createQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(["EXERCICE_MAISON", "DEVOIR_MAISON", "DEVOIR_CLASSE", "DEVOIR_NIVEAU"]).default("DEVOIR_MAISON"),
  courseId: z.string().uuid().optional().nullable(),
  niveauId: z.string().uuid().optional().nullable(),
  termId: z.string().uuid().optional().nullable(),
  subjectId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  timeLimit: z.coerce.number().optional().nullable(),
  coefficient: z.coerce.number().default(1),
  imageUrl: z.string().optional().nullable(),
  autoGrade: z.boolean().default(true),
  maxAttempts: z.coerce.number().default(1),
  isNiveauWide: z.boolean().default(false),
  questions: z.array(questionSchema).min(1),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Corrige automatiquement une réponse FILL_IN_BLANK (insensible à la casse et aux espaces)
 */
const gradeFillinBlank = (userAnswer: string, correctAnswer: string): boolean => {
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
};

/**
 * Après soumission d'un quiz de type EVALUATION/DEVOIR/NIVEAU, crée un Grade automatiquement.
 */
const createAutoGrade = async (
  studentId: string,
  score: number, // sur 20
  quiz: {
    id: string;
    termId: string | null;
    courseId: string | null;
    coefficient: number;
    type: string;
    subjectId: string | null;
    niveauId: string | null;
  }
) => {
  // Trouver le courseId: si pas direct, chercher via le niveau et la classe de l'élève
  let finalCourseId = quiz.courseId;

  if (!finalCourseId && quiz.niveauId && quiz.subjectId) {
    // Trouver la classe de l'élève dans ce niveau
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        status: "ACTIVE",
        class: { niveauId: quiz.niveauId },
      },
      include: { class: true },
    });

    if (enrollment) {
      // Trouver le cours de cette matière dans cette classe
      const course = await prisma.course.findFirst({
        where: {
          classId: enrollment.classId,
          subjectId: quiz.subjectId,
        },
      });
      finalCourseId = course?.id ?? null;
    }
  }

  if (quiz.type === "EXERCICE_MAISON") {
    // Non noté
    return;
  }

  // Mapper QuizType → GradeType
  const gradeTypeMap: Record<string, string> = {
    DEVOIR_MAISON: "DEVOIR",
    DEVOIR_CLASSE: "EVALUATION",
    DEVOIR_NIVEAU: "EXAMEN",
  };

  try {
    await prisma.grade.create({
      data: {
        studentId,
        value: parseFloat(score.toFixed(2)),
        coefficient: quiz.coefficient,
        type: (gradeTypeMap[quiz.type] ?? "EVALUATION") as any,
        termId: quiz.termId,
        courseId: finalCourseId,
        comment: `Note auto-générée depuis quiz (${quiz.type})`,
        validated: true,
      },
    });
  } catch (err) {
    console.error("Erreur création Grade auto:", err);
  }
};

// ─── Controllers ─────────────────────────────────────────────────────────────

export const createQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role as string;
    const validatedData = createQuizSchema.parse(req.body);

    // Vérifications d'accès
    if (validatedData.courseId) {
      const course = await prisma.course.findUnique({ where: { id: validatedData.courseId } });
      if (!course) return res.status(404).json({ message: "Cours introuvable" });
      if (userRole === "ENSEIGNANT" && course.teacherId !== userId) {
        return res.status(403).json({ message: "Vous n'êtes pas l'enseignant de ce cours" });
      }
    }

    if (validatedData.type === "NIVEAU" && userRole !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Seul le super admin peut créer des devoirs de niveau" });
    }

    if (!validatedData.courseId && !validatedData.niveauId) {
      return res.status(400).json({ message: "courseId ou niveauId est requis" });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type as any,
        courseId: validatedData.courseId,
        niveauId: validatedData.niveauId,
        termId: validatedData.termId,
        subjectId: validatedData.subjectId,
        published: true,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        timeLimit: validatedData.timeLimit,
        coefficient: validatedData.coefficient,
        imageUrl: validatedData.imageUrl,
        autoGrade: validatedData.autoGrade,
        maxAttempts: validatedData.maxAttempts,
        isNiveauWide: validatedData.isNiveauWide,
        createdById: userId,
        questions: {
          create: validatedData.questions.map((q, idx) => ({
            text: q.text,
            type: q.type as any,
            points: q.points,
            correctAnswer: q.correctAnswer ?? (q.options?.find(o => o.isCorrect)?.text ?? null),
            imageUrl: q.imageUrl,
            position: q.position ?? idx,
            options: q.options && q.options.length > 0 ? {
              create: q.options.map(opt => ({
                text: opt.text,
                imageUrl: opt.imageUrl,
                isCorrect: opt.isCorrect,
              })),
            } : undefined,
          })),
        },
      },
      include: { questions: { include: { options: true }, orderBy: { position: "asc" } } },
    });

    res.status(201).json(quiz);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Create quiz error:", error);
    res.status(500).json({ message: "Erreur lors de la création du quiz", error: error.message });
  }
};

export const updateQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role as string;

    const quiz = await prisma.quiz.findUnique({
      where: { id: String(id) },
      include: { course: true },
    });
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });
    if (userRole === "ENSEIGNANT" && quiz.course?.teacherId !== userId) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const validatedData = createQuizSchema.parse(req.body);

    // Supprimer les questions existantes et recréer
    await prisma.quizQuestion.deleteMany({ where: { quizId: String(id) } });

    const updatedQuiz = await prisma.quiz.update({
      where: { id: String(id) },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type as any,
        termId: validatedData.termId,
        subjectId: validatedData.subjectId,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        timeLimit: validatedData.timeLimit,
        coefficient: validatedData.coefficient,
        imageUrl: validatedData.imageUrl,
        autoGrade: validatedData.autoGrade,
        maxAttempts: validatedData.maxAttempts,
        questions: {
          create: validatedData.questions.map((q, idx) => ({
            text: q.text,
            type: q.type as any,
            points: q.points,
            correctAnswer: q.correctAnswer ?? (q.options?.find(o => o.isCorrect)?.text ?? null),
            imageUrl: q.imageUrl,
            position: q.position ?? idx,
            options: q.options && q.options.length > 0 ? {
              create: q.options.map(opt => ({ text: opt.text, imageUrl: opt.imageUrl, isCorrect: opt.isCorrect })),
            } : undefined,
          })),
        },
      },
      include: { questions: { include: { options: true }, orderBy: { position: "asc" } } },
    });

    res.json(updatedQuiz);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    res.status(500).json({ message: "Erreur mise à jour quiz", error: error.message });
  }
};

export const deleteQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: String(id) },
      include: { course: true },
    });
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });
    if ((req.user?.role as string) === "ENSEIGNANT" && quiz.course?.teacherId !== userId) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    await prisma.quiz.delete({ where: { id: String(id) } });
    res.json({ message: "Quiz supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression quiz", error });
  }
};

export const getQuizzes = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, niveauId, termId, type, published } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role as string;

    // Construire le filtre
    const where: any = {};

    if (courseId) where.courseId = String(courseId);
    if (niveauId) where.niveauId = String(niveauId);
    if (termId) where.termId = String(termId);
    if (type) where.type = String(type);
    if (published !== undefined) where.published = published === "true";

    // Pour un apprenant: ne voir que les quiz publiés et ouverts
    if (userRole === "APPRENANT") {
      where.published = true;
      const now = new Date();
      where.OR = [
        { startDate: null },
        { startDate: { lte: now } },
      ];
    }

    // Si l'apprenant et recherche par niveau → chercher les devoirs de niveau de sa classe
    if (userRole === "APPRENANT" && !courseId && !niveauId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: userId, status: "ACTIVE" },
        include: { class: { select: { niveauId: true } } },
      });
      if (enrollment?.class?.niveauId) {
        // Ajouter les quizzes de niveau
        where.OR = [
          ...(where.OR ?? []),
          { niveauId: enrollment.class.niveauId, isNiveauWide: true },
        ];
      }
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        course: { select: { id: true, subject: { select: { name: true } } } },
        subject: { select: { name: true, coefficient: true } },
        term: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { questions: true, attempts: true } },
        attempts: userRole === "APPRENANT" ? {
          where: { studentId: userId },
          select: { score: true, completedAt: true, id: true },
        } : false,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération quizzes", error });
  }
};

export const getQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role as string;

    const quiz = await prisma.quiz.findUnique({
      where: { id: String(id) },
      include: {
        questions: {
          include: { options: true },
          orderBy: { position: "asc" },
        },
        course: true,
        subject: { select: { name: true } },
        term: { select: { name: true, status: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });

    // Vérifier la date d'ouverture
    if (userRole === "APPRENANT") {
      const now = new Date();
      if (quiz.startDate && quiz.startDate > now) {
        return res.status(403).json({
          message: `Ce quiz n'est pas encore disponible. Il s'ouvre le ${quiz.startDate.toLocaleDateString("fr-FR")}`,
          availableAt: quiz.startDate,
        });
      }
      if (quiz.endDate && quiz.endDate < now) {
        return res.status(403).json({
          message: "Ce quiz est fermé.",
          closedAt: quiz.endDate,
        });
      }

      // Vérifier nombre de tentatives
      const attemptsCount = await prisma.quizAttempt.count({
        where: { quizId: quiz.id, studentId: userId },
      });
      if (attemptsCount >= quiz.maxAttempts) {
        return res.status(400).json({ message: `Vous avez atteint le nombre maximum de tentatives (${quiz.maxAttempts}).` });
      }

      // Si l'élève n'a pas encore soumis → masquer les réponses correctes
      const attempt = await prisma.quizAttempt.findFirst({
        where: { quizId: quiz.id, studentId: userId },
      });
      if (!attempt) {
        quiz.questions.forEach(q => {
          q.options.forEach(o => { (o as any).isCorrect = undefined; });
          if (q.type !== "FILL_IN_BLANK") (q as any).correctAnswer = undefined;
        });
      }
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération quiz", error });
  }
};

export const submitQuizAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // Quiz ID
    const userId = req.user?.id;
    // answers: { questionId: string[] (option IDs) ou string (fill_in_blank text) }
    const { answers, openAnswers } = req.body;

    if (!userId) return res.status(401).json({ message: "Non authentifié" });

    const quiz = await prisma.quiz.findUnique({
      where: { id: String(id) },
      include: {
        questions: { include: { options: true }, orderBy: { position: "asc" } },
      },
    });
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });

    // Vérifier dates d'accès
    const now = new Date();
    if (quiz.startDate && quiz.startDate > now) {
      return res.status(403).json({ message: "Ce quiz n'est pas encore ouvert" });
    }
    if (quiz.endDate && quiz.endDate < now) {
      return res.status(403).json({ message: "Ce quiz est fermé" });
    }

    // Vérifier tentatives
    const existingAttempts = await prisma.quizAttempt.count({
      where: { quizId: String(id), studentId: userId },
    });
    if (existingAttempts >= quiz.maxAttempts) {
      return res.status(400).json({ message: `Nombre maximum de tentatives atteint (${quiz.maxAttempts})` });
    }

    // Calcul du score
    let totalPoints = 0;
    let earnedPoints = 0;
    const attemptAnswers: any[] = [];

    for (const question of quiz.questions) {
      totalPoints += question.points;
      let isCorrect = false;

      if (question.type === "FILL_IN_BLANK") {
        // Correction automatique par comparaison de texte
        const userText = (answers?.[question.id] as string) ?? "";
        const correct = question.correctAnswer ?? "";
        isCorrect = gradeFillinBlank(userText, correct);
        if (isCorrect) earnedPoints += question.points;

        attemptAnswers.push({
          questionId: question.id,
          selectedOptions: [],
          isCorrect,
        });

      } else if (question.type === "OPEN") {
        // Réponse libre → non auto-corrigée (toujours 0 jusqu'à correction manuelle)
        attemptAnswers.push({
          questionId: question.id,
          selectedOptions: [],
          isCorrect: false,
        });

      } else {
        // SINGLE_CHOICE ou MULTIPLE_CHOICE
        const userSelectedOptionIds: string[] = answers?.[question.id] ?? [];
        const correctOptionIds = question.options.filter(o => o.isCorrect).map(o => o.id);

        isCorrect =
          userSelectedOptionIds.length === correctOptionIds.length &&
          userSelectedOptionIds.every((oid: string) => correctOptionIds.includes(oid));

        if (isCorrect) earnedPoints += question.points;

        attemptAnswers.push({
          questionId: question.id,
          selectedOptions: userSelectedOptionIds,
          isCorrect,
        });
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 20 : 0;
    const roundedScore = parseFloat(score.toFixed(2));

    // Créer la tentative
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: String(id),
        studentId: userId,
        score: roundedScore,
        completedAt: new Date(),
        answers: { create: attemptAnswers },
      },
    });

    // Créer le Grade automatiquement si autoGrade activé
    if (quiz.autoGrade && ["EVALUATION", "DEVOIR", "EXAMEN", "NIVEAU"].includes(quiz.type)) {
      await createAutoGrade(userId, roundedScore, {
        id: quiz.id,
        termId: quiz.termId,
        courseId: quiz.courseId,
        coefficient: quiz.coefficient,
        type: quiz.type,
        subjectId: quiz.subjectId,
        niveauId: quiz.niveauId,
      });
    }

    res.json({
      attempt,
      score: roundedScore,
      totalPoints,
      earnedPoints,
      maxPoints: 20,
      percentage: Math.round((earnedPoints / totalPoints) * 100),
    });
  } catch (error: any) {
    console.error("Submit quiz error:", error);
    res.status(500).json({ message: "Erreur lors de la soumission du quiz", error: error.message });
  }
};

export const getQuizAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role as string;

    const quiz = await prisma.quiz.findUnique({
      where: { id: String(id) },
      include: { course: true },
    });
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });

    if (userRole === "ENSEIGNANT" && quiz.course?.teacherId !== userId) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: String(id) },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { completedAt: "desc" },
    });

    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération tentatives", error });
  }
};

export const getAttemptDetail = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role as string;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: String(id) },
      include: {
        quiz: {
          include: {
            questions: { include: { options: true }, orderBy: { position: "asc" } },
            course: true,
          },
        },
        answers: true,
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!attempt) return res.status(404).json({ message: "Tentative introuvable" });

    if (userRole === "APPRENANT" && attempt.studentId !== userId) {
      return res.status(403).json({ message: "Non autorisé" });
    }
    if (userRole === "ENSEIGNANT" && attempt.quiz.course?.teacherId !== userId) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    res.json(attempt);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération détail tentative", error });
  }
};

export const getMyAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { courseId, termId, type } = req.query;

    if (!userId) return res.status(401).json({ message: "Non authentifié" });

    const where: any = { studentId: userId };
    if (courseId) where.quiz = { courseId: String(courseId) };
    if (termId) where.quiz = { ...(where.quiz ?? {}), termId: String(termId) };
    if (type) where.quiz = { ...(where.quiz ?? {}), type: String(type) };

    const attempts = await prisma.quizAttempt.findMany({
      where,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            type: true,
            coefficient: true,
            startDate: true,
            endDate: true,
            course: { select: { subject: { select: { name: true } } } },
            subject: { select: { name: true } },
            term: { select: { name: true } },
            _count: { select: { questions: true } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération mes tentatives", error });
  }
};

/**
 * Vue enseignant / directeur : toutes les tentatives d'un quiz avec stats
 */
export const getQuizStats = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: String(id) },
      include: {
        _count: { select: { questions: true, attempts: true } },
        course: { include: { class: { include: { enrollments: true } } } },
      },
    });
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: String(id) },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const scores = attempts.map(a => a.score);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const nbReussi = scores.filter(s => s >= 10).length;

    const totalStudents = quiz.course?.class?.enrollments?.length ?? attempts.length;

    res.json({
      quiz: { id: quiz.id, title: quiz.title, type: quiz.type, coefficient: quiz.coefficient },
      stats: {
        totalStudents,
        nbSubmitted: attempts.length,
        nbPending: Math.max(0, totalStudents - attempts.length),
        averageScore: avg ? parseFloat(avg.toFixed(2)) : null,
        minScore: scores.length > 0 ? Math.min(...scores) : null,
        maxScore: scores.length > 0 ? Math.max(...scores) : null,
        nbReussi,
        tauxReussite: attempts.length > 0 ? Math.round((nbReussi / attempts.length) * 100) : 0,
      },
      attempts,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur statistiques quiz", error });
  }
};
