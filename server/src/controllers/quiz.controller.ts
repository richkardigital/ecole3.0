import type { Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const createQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  courseId: z.string().uuid().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  timeLimit: z.coerce.number().optional().nullable(),
  questions: z.array(z.object({
    text: z.string().min(1),
    type: z.enum(["SINGLE", "MULTIPLE"]),
    points: z.coerce.number().int().min(1),
    options: z.array(z.object({
      text: z.string().min(1),
      isCorrect: z.boolean()
    })).min(2).refine((options) => options.some(opt => opt.isCorrect), {
      message: "At least one option must be correct"
    })
  })).min(1)
});

export const createQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        console.log("Creating quiz for user:", userId);
        
        const validatedData = createQuizSchema.parse(req.body);

        // Verify teacher owns the course
        const course = await prisma.course.findUnique({
            where: { id: validatedData.courseId }
        });

        if (!course) {
             return res.status(404).json({ message: "Course not found" });
        }

        if ((req.user?.role as string) === "ENSEIGNANT" && course.teacherId !== userId) {
            return res.status(403).json({ message: "Unauthorized to create quiz for this course" });
        }

        const quiz = await prisma.quiz.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                courseId: validatedData.courseId!,
                published: true,
                startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
                endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
                timeLimit: validatedData.timeLimit,
                questions: {
                    create: validatedData.questions.map(q => {
                        const correctOption = q.options.find(opt => opt.isCorrect);
                        return {
                            text: q.text,
                            type: q.type,
                            points: q.points,
                            correctAnswer: correctOption ? correctOption.text : q.options[0].text, // Fallback safe
                            options: {
                                create: q.options.map(opt => ({
                                    text: opt.text,
                                    isCorrect: opt.isCorrect
                                }))
                            }
                        };
                    })
                }
            },
            include: {
                questions: true
            }
        });

        res.status(201).json(quiz);
    } catch (error) {
        console.error("Create quiz error", error);
        if (error instanceof z.ZodError) {
             return res.status(400).json({ message: "Validation error", errors: (error as any).errors });
        }
        res.status(500).json({ message: "Error creating quiz", error: (error as Error).message });
    }
};

export const deleteQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const quiz = await prisma.quiz.findUnique({
            where: { id: String(id) },
            include: { course: true }
        });

        if (!quiz) return res.status(404).json({ message: "Quiz not found" });
        if ((req.user?.role as string) === "ENSEIGNANT" && quiz.course.teacherId !== userId) {
            return res.status(403).json({ message: "Unauthorized to delete this quiz" });
        }

        await prisma.quiz.delete({
            where: { id: String(id) }
        });

        res.json({ message: "Quiz deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting quiz", error });
    }
};

export const updateQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        
        const quiz = await prisma.quiz.findUnique({
            where: { id: String(id) },
            include: { course: true }
        });

        if (!quiz) return res.status(404).json({ message: "Quiz not found" });
        if ((req.user?.role as string) === "ENSEIGNANT" && quiz.course.teacherId !== userId) {
            return res.status(403).json({ message: "Unauthorized to update this quiz" });
        }

        const validatedData = createQuizSchema.parse(req.body);

        // Delete existing questions and options and recreate them
        // This is a simpler way than trying to sync changes
        await prisma.quizQuestion.deleteMany({
            where: { quizId: String(id) }
        });

        const updatedQuiz = await prisma.quiz.update({
            where: { id: String(id) },
            data: {
                title: validatedData.title,
                description: validatedData.description,
                startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
                endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
                timeLimit: validatedData.timeLimit,
                questions: {
                    create: validatedData.questions.map(q => ({
                        text: q.text,
                        type: q.type,
                        points: q.points,
                        correctAnswer: q.options.find(opt => opt.isCorrect)?.text || "",
                        options: {
                            create: q.options.map(opt => ({
                                text: opt.text,
                                isCorrect: opt.isCorrect
                            }))
                        }
                    }))
                }
            },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });

        res.json(updatedQuiz);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation error", errors: (error as any).errors });
        }
        res.status(500).json({ message: "Error updating quiz", error });
    }
};

export const getQuizzes = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.query;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!courseId) return res.status(400).json({ message: "Course ID required" });

        const quizzes = await prisma.quiz.findMany({
            where: { courseId: String(courseId) },
            include: {
                _count: {
                    select: { questions: true }
                },
                attempts: (userRole as string) === 'APPRENANT' ? {
                    where: { studentId: userId },
                    select: { score: true }
                } : false
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: "Error fetching quizzes", error });
    }
};

export const getQuiz = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const quiz = await prisma.quiz.findUnique({
            where: { id: String(id) },
            include: {
                questions: {
                    include: {
                        options: true
                    }
                },
                course: true
            }
        });

        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        // If student, hide correct answers unless they already attempted it
        if ((userRole as string) === 'APPRENANT') {
            const attempt = await prisma.quizAttempt.findFirst({
                where: { quizId: quiz.id, studentId: userId }
            });

            if (!attempt) {
                // Hide isCorrect from options
                quiz.questions.forEach(q => {
                    q.options.forEach(o => {
                        (o as any).isCorrect = undefined;
                    });
                });
            }
        }

        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: "Error fetching quiz", error });
    }
};

export const getQuizAttempts = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // Quiz ID
        const userId = req.user?.id;

        const quiz = await prisma.quiz.findUnique({
            where: { id: String(id) },
            include: { course: true }
        });

        if (!quiz) return res.status(404).json({ message: "Quiz not found" });
        if ((req.user?.role as string) === "ENSEIGNANT" && quiz.course.teacherId !== userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const attempts = await prisma.quizAttempt.findMany({
            where: { quizId: String(id) },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            },
            orderBy: { completedAt: 'desc' }
        });

        res.json(attempts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching attempts", error });
    }
};

export const getAttemptDetail = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // Attempt ID
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const attempt = await prisma.quizAttempt.findUnique({
            where: { id: String(id) },
            include: {
                quiz: {
                    include: {
                        questions: {
                            include: { options: true }
                        },
                        course: true
                    }
                },
                answers: true,
                student: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        });

        if (!attempt) return res.status(404).json({ message: "Attempt not found" });

        // Authorization: only the student who did it or the teacher of the course
        if ((userRole as string) === 'APPRENANT' && attempt.studentId !== userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        if ((userRole as string) === 'ENSEIGNANT' && attempt.quiz.course.teacherId !== userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        res.json(attempt);
    } catch (error) {
        res.status(500).json({ message: "Error fetching attempt detail", error });
    }
};

export const submitQuizAttempt = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // Quiz ID
        const userId = req.user?.id;
        const { answers } = req.body; // { questionId: [optionId] }

        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        // Check if student already submitted an attempt
        const existingAttempt = await prisma.quizAttempt.findFirst({
            where: {
                quizId: String(id),
                studentId: userId
            }
        });

        if (existingAttempt) {
            return res.status(400).json({ message: "Vous avez déjà effectué ce quiz." });
        }

        const quiz = await prisma.quiz.findUnique({
            where: { id: String(id) },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });

        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        // Calculate score
        let totalPoints = 0;
        let earnedPoints = 0;

        const attemptAnswers = [];

        for (const question of (quiz as any).questions) {
            totalPoints += question.points;
            
            const userSelectedOptionIds = answers[question.id] || [];
            const correctOptionIds = question.options.filter(o => o.isCorrect).map(o => o.id);

            // Simple grading logic: All correct options selected and no incorrect ones
            // For SINGLE type, array length 1
            const isCorrect = 
                userSelectedOptionIds.length === correctOptionIds.length &&
                userSelectedOptionIds.every((id: string) => correctOptionIds.includes(id));

            if (isCorrect) {
                earnedPoints += question.points;
            }

            attemptAnswers.push({
                questionId: question.id,
                selectedOptions: userSelectedOptionIds,
                isCorrect: isCorrect
            });
        }

        const score = (earnedPoints / totalPoints) * 20; // Scale to 20

        const attempt = await prisma.quizAttempt.create({
            data: {
                quizId: String(id),
                studentId: userId,
                score,
                completedAt: new Date(),
                answers: {
                    create: attemptAnswers
                }
            }
        });

        res.json({ attempt, totalPoints, earnedPoints });
    } catch (error) {
        console.error("Submit quiz error", error);
        res.status(500).json({ message: "Error submitting quiz", error });
    }
};

export const getMyAttempts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { courseId } = req.query;

        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const attempts = await prisma.quizAttempt.findMany({
            where: {
                studentId: userId,
                quiz: courseId ? { courseId: String(courseId) } : undefined
            },
            include: {
                quiz: true
            },
            orderBy: { startedAt: 'desc' }
        });

        res.json(attempts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching attempts", error });
    }
};
