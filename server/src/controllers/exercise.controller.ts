import type { Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

// ============================================================
// GET /chapters/:chapterId/exercises
// Retourne tous les exercices d'un chapitre
// ============================================================
export const getChapterExercises = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const exercises = await prisma.chapterExercise.findMany({
      where: { chapterId },
      include: {
        createdBy: { select: { firstName: true, lastName: true, role: true } },
        _count: { select: { questions: true, submissions: true } },
        // Pour les apprenants, inclure leur soumission
        submissions: role === "APPRENANT" ? {
          where: { studentId: userId },
          select: { id: true, score: true, maxScore: true, submittedAt: true }
        } : false,
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(exercises);
  } catch (error) {
    console.error("getChapterExercises error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des exercices" });
  }
};

// ============================================================
// GET /exercises/:id — Détail d'un exercice (avec questions et options)
// ============================================================
export const getExercise = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const exercise = await prisma.chapterExercise.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { position: "asc" },
          include: {
            options: true,
            // On masque les bonnes réponses pour les apprenants
          }
        },
        createdBy: { select: { firstName: true, lastName: true } },
        submissions: role === "APPRENANT" ? {
          where: { studentId: userId },
          include: {
            answers: {
              include: { question: true, option: true }
            }
          }
        } : undefined,
      }
    });

    if (!exercise) return res.status(404).json({ message: "Exercice introuvable" });

    // Pour les apprenants qui ont déjà soumis, on retourne la correction
    // Pour les apprenants qui n'ont pas encore soumis, on masque isCorrect des options
    if (role === "APPRENANT") {
      const hasSubmitted = exercise.submissions && exercise.submissions.length > 0;
      if (!hasSubmitted) {
        // Masquer les bonnes réponses
        const sanitized = {
          ...exercise,
          questions: exercise.questions.map(q => ({
            ...q,
            correctAnswer: undefined, // Masquer la réponse texte
            options: q.options.map(o => ({ id: o.id, text: o.text, questionId: o.questionId })) // Masquer isCorrect
          }))
        };
        return res.json(sanitized);
      }
    }

    res.json(exercise);
  } catch (error) {
    console.error("getExercise error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'exercice" });
  }
};

// ============================================================
// POST /chapters/:chapterId/exercises
// Créer un exercice dans un chapitre (SUPER_ADMIN ou ENSEIGNANT)
// ============================================================
export const createExercise = async (req: AuthRequest, res: Response) => {
  try {
    const { chapterId } = req.params;
    const { title, description, type, isGraded, coefficient, timeLimit, questions } = req.body;
    const userId = req.user?.id!;

    if (!title) return res.status(400).json({ message: "Le titre est requis" });

    // Vérifier que le chapitre existe
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { course: true }
    });
    if (!chapter) return res.status(404).json({ message: "Chapitre introuvable" });

    // Si ENSEIGNANT, vérifier qu'il est bien le prof de ce cours
    if (req.user?.role === "ENSEIGNANT") {
      if (chapter.course.teacherId !== userId) {
        return res.status(403).json({ message: "Vous n'êtes pas l'enseignant de ce cours" });
      }
    }

    const exercise = await prisma.chapterExercise.create({
      data: {
        title,
        description: description || null,
        type: type || "QCM",
        isGraded: isGraded ?? false,
        coefficient: coefficient ?? 1,
        timeLimit: timeLimit || null,
        chapterId,
        createdById: userId,
        questions: questions ? {
          create: questions.map((q: any, idx: number) => ({
            text: q.text,
            type: q.type || type || "QCM",
            position: idx,
            points: q.points ?? 1,
            correctAnswer: q.correctAnswer || null,
            options: q.options ? {
              create: q.options.map((o: any) => ({
                text: o.text,
                isCorrect: o.isCorrect ?? false,
              }))
            } : undefined,
          }))
        } : undefined,
      },
      include: {
        questions: { include: { options: true } },
        _count: { select: { questions: true } },
        createdBy: { select: { firstName: true, lastName: true } }
      }
    });

    res.status(201).json(exercise);
  } catch (error) {
    console.error("createExercise error:", error);
    res.status(500).json({ message: "Erreur lors de la création de l'exercice" });
  }
};

// ============================================================
// PUT /exercises/:id — Modifier un exercice
// ============================================================
export const updateExercise = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, type, isGraded, coefficient, timeLimit } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;

    const existing = await prisma.chapterExercise.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Exercice introuvable" });

    // Seul le créateur ou un SUPER_ADMIN peut modifier
    if (role !== "SUPER_ADMIN" && existing.createdById !== userId) {
      return res.status(403).json({ message: "Accès refusé : vous n'êtes pas le créateur de cet exercice" });
    }

    const exercise = await prisma.chapterExercise.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(isGraded !== undefined && { isGraded }),
        ...(coefficient !== undefined && { coefficient }),
        ...(timeLimit !== undefined && { timeLimit }),
      },
      include: { _count: { select: { questions: true } } }
    });

    res.json(exercise);
  } catch (error) {
    console.error("updateExercise error:", error);
    res.status(500).json({ message: "Erreur lors de la modification de l'exercice" });
  }
};

// ============================================================
// DELETE /exercises/:id — Supprimer un exercice
// ============================================================
export const deleteExercise = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const existing = await prisma.chapterExercise.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Exercice introuvable" });

    if (role !== "SUPER_ADMIN" && existing.createdById !== userId) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    await prisma.chapterExercise.delete({ where: { id } });
    res.json({ message: "Exercice supprimé avec succès" });
  } catch (error) {
    console.error("deleteExercise error:", error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};

// ============================================================
// POST /exercises/:id/submit — Soumettre les réponses (APPRENANT)
// ============================================================
export const submitExercise = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id!;
    const { answers } = req.body as {
      answers: Array<{ questionId: string; optionId?: string; textValue?: string }>
    };

    // Vérifier si déjà soumis
    const existing = await prisma.exerciseSubmission.findUnique({
      where: { studentId_exerciseId: { studentId, exerciseId: id } }
    });
    if (existing) {
      return res.status(400).json({ message: "Vous avez déjà soumis cet exercice" });
    }

    // Récupérer l'exercice avec les questions et les bonnes réponses
    const exercise = await prisma.chapterExercise.findUnique({
      where: { id },
      include: {
        questions: { include: { options: true } }
      }
    });
    if (!exercise) return res.status(404).json({ message: "Exercice introuvable" });

    let totalPoints = 0;
    let earnedPoints = 0;

    // Calculer le score et déterminer si chaque réponse est correcte
    const processedAnswers = answers.map(answer => {
      const question = exercise.questions.find(q => q.id === answer.questionId);
      if (!question) return { ...answer, isCorrect: null };

      totalPoints += question.points;

      let isCorrect: boolean | null = null;

      if (exercise.type === "QCM" || exercise.type === "VRAI_FAUX") {
        if (answer.optionId) {
          const option = question.options.find(o => o.id === answer.optionId);
          isCorrect = option?.isCorrect ?? false;
          if (isCorrect) earnedPoints += question.points;
        }
      } else if (exercise.type === "TEXTE_LIBRE") {
        // Correction manuelle → score en attente
        isCorrect = null;
      }

      return { ...answer, isCorrect };
    });

    const maxScore = totalPoints;
    const score = exercise.type === "TEXTE_LIBRE" ? null : earnedPoints;

    const submission = await prisma.exerciseSubmission.create({
      data: {
        studentId,
        exerciseId: id,
        score,
        maxScore,
        answers: {
          create: processedAnswers.map(a => ({
            questionId: a.questionId,
            optionId: a.optionId || null,
            textValue: a.textValue || null,
            isCorrect: a.isCorrect ?? null,
          }))
        }
      },
      include: {
        answers: { include: { question: true, option: true } },
        exercise: { select: { title: true, type: true } }
      }
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error("submitExercise error:", error);
    res.status(500).json({ message: "Erreur lors de la soumission de l'exercice" });
  }
};

// ============================================================
// GET /exercises/:id/submissions — Liste des soumissions (enseignant)
// ============================================================
export const getExerciseSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const submissions = await prisma.exerciseSubmission.findMany({
      where: { exerciseId: id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        answers: { include: { question: true, option: true } }
      },
      orderBy: { submittedAt: "desc" }
    });

    res.json(submissions);
  } catch (error) {
    console.error("getExerciseSubmissions error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des soumissions" });
  }
};

// ============================================================
// PATCH /exercises/submissions/:submissionId/grade — Corriger TEXTE_LIBRE
// ============================================================
export const gradeExerciseSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;
    const role = req.user?.role;

    if (role !== "SUPER_ADMIN" && role !== "ENSEIGNANT") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const submission = await prisma.exerciseSubmission.update({
      where: { id: submissionId },
      data: { score, feedback }
    });

    res.json(submission);
  } catch (error) {
    console.error("gradeExerciseSubmission error:", error);
    res.status(500).json({ message: "Erreur lors de la correction" });
  }
};
