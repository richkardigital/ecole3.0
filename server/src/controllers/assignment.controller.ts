import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadToSupabase } from "../utils/supabase.js";

const createAssignmentSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string().transform((str) => new Date(str)),
  courseId: z.string(),
});

const submitAssignmentSchema = z.object({
  content: z.string().optional(),
  fileUrl: z.string().optional(),
});

const gradeSubmissionSchema = z.object({
  value: z.number().min(0).max(20),
  comment: z.string().optional(),
});

export const createAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, dueDate, courseId, coefficient } = req.body;
    let finalDescription = description || "";
    let voiceNoteUrl = null;
    let correctionUrl = null;

    // Handle files
    // req.files is { [fieldname: string]: Express.Multer.File[] } when using upload.fields
    const files = req.files as { [fieldname: string]: any[] } | undefined;

    if (files) {
        if (files['file'] && files['file'][0]) {
            const publicUrl = await uploadToSupabase(files['file'][0]);
            if (publicUrl) {
                finalDescription += `\n\n[Télécharger le fichier joint](${publicUrl})`;
            }
        }
        if (files['voiceNote'] && files['voiceNote'][0]) {
             voiceNoteUrl = await uploadToSupabase(files['voiceNote'][0]);
        }
        if (files['correction'] && files['correction'][0]) {
             correctionUrl = await uploadToSupabase(files['correction'][0]);
        }
    } else if (req.file) {
        // Fallback
        const publicUrl = await uploadToSupabase(req.file);
        if (publicUrl) {
            finalDescription += `\n\n[Télécharger le fichier joint](${publicUrl})`;
        }
    }

    if (!title || !dueDate || !courseId) {
         return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedDate = new Date(dueDate);
    const parsedCoefficient = coefficient ? parseInt(coefficient) : 1;

    if ((req.user?.role as string) === "ENSEIGNANT") {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: finalDescription || null,
        dueDate: parsedDate,
        courseId,
        coefficient: parsedCoefficient,
        voiceNoteUrl: voiceNoteUrl || null,
        correctionUrl: correctionUrl || null
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating assignment", error });
  }
};

export const getAgenda = async (req: AuthRequest, res: Response) => {
    try {
        const { level, startDate, endDate } = req.query;
        const schoolId = req.user?.schoolId;

        if (!level || !startDate || !endDate) {
            return res.status(400).json({ message: "Level, startDate and endDate are required" });
        }

        // Parse dates
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        // Find classes with this level
        // If School Admin or Teacher, restrict to their school
        // If Student, ideally restrict to their school too (though level might be generic, usually it's school specific)
        
        const whereClass: any = {
            level: String(level)
        };

        if ((req.user?.role as string) === 'DIRECTEUR' || (req.user?.role as string) === 'EDUCATEUR') {
            if (schoolId) whereClass.schoolId = schoolId;
        } else if ((req.user?.role as string) === 'ENSEIGNANT') {
            if (schoolId) whereClass.schoolId = schoolId;
            whereClass.courses = { some: { teacherId: req.user.id } };
        } else if ((req.user?.role as string) === 'APPRENANT') {
            if (schoolId) whereClass.schoolId = schoolId;
            whereClass.enrollments = { some: { studentId: req.user.id } };
        }

        const classes = await prisma.class.findMany({
            where: whereClass,
            select: { id: true }
        });

        const classIds = classes.map(c => c.id);

        if (classIds.length === 0) {
            return res.json([]);
        }

        // Find assignments for courses in these classes
        const assignments = await prisma.assignment.findMany({
            where: {
                course: {
                    classId: { in: classIds }
                },
                dueDate: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                course: {
                    include: {
                        subject: true,
                        class: true
                    }
                }
            },
            orderBy: { dueDate: 'asc' }
        });

        res.json(assignments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching agenda", error });
    }
};

export const getAssignmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "ID required" });

    const assignment = await prisma.assignment.findUnique({
      where: { id: id as string },
      include: {
        course: {
          select: {
            id: true,
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        submissions: {
            ...((req.user?.role as string) === 'APPRENANT' ? { where: { studentId: req.user.id } } : {})
        }
      },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignment", error });
  }
};

export const getAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
       return res.status(400).json({message: "courseId is required"});
    }

    const course = await prisma.course.findUnique({
        where: { id: String(courseId) },
        include: { class: { include: { enrollments: { where: { studentId: req.user?.id } } } } }
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    // RLS
    const role = req.user?.role as string;
    if (role === 'SUPER_ADMIN') {
        // Super Admin has full access
    } else if (role === 'ENSEIGNANT' && course.teacherId !== req.user?.id) {
        return res.status(403).json({ message: "Access denied" });
    } else if (role === 'APPRENANT' && course.class.enrollments.length === 0) {
        return res.status(403).json({ message: "Access denied" });
    } else if ((role === 'DIRECTEUR' || role === 'EDUCATEUR') && req.user?.schoolId && course.class.schoolId !== req.user?.schoolId) {
        return res.status(403).json({ message: "Access denied" });
    }

    const assignments = await prisma.assignment.findMany({
      where: { courseId: String(courseId) },
      include: {
        _count: {
          select: { submissions: true },
        },
        submissions: {
            where: {
                studentId: (req.user?.role as string) === 'APPRENANT' ? req.user.id : undefined
            },
            include: {
                grade: true
            },
            take: 1
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignments", error });
  }
};

export const submitAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // assignmentId
    // Parse manually
    const { content } = req.body;
    let fileUrl = req.body.fileUrl;

    if (req.file) {
        // Validation spécifique pour les fichiers (y compris audio)
        if (req.file.mimetype.startsWith('audio/')) {
            // Taille max 20MB pour l'audio
            if (req.file.size > 20 * 1024 * 1024) {
                return res.status(400).json({ message: "Le fichier audio dépasse la taille limite de 20MB." });
            }
            // Formats acceptés
            const allowedAudio = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a'];
            if (!allowedAudio.includes(req.file.mimetype)) {
                 // return res.status(400).json({ message: "Format audio non supporté. Utilisez MP3, WAV, OGG ou WEBM." });
                 // Permissive check or just proceed if it starts with audio/
            }
        }

        const publicUrl = await uploadToSupabase(req.file);
        if (publicUrl) {
            fileUrl = publicUrl;
        } else {
             return res.status(500).json({ message: "Échec de l'upload du fichier." });
        }
    }

    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!id) return res.status(400).json({ message: "ID required" });

    // Check if already submitted
    const existingSubmission = await prisma.submission.findFirst({
        where: {
            assignmentId: id as string,
            studentId
        }
    })

    if (existingSubmission) {
        // Option to update instead of fail? User said "submit work", usually implies once or update.
        // For simplicity, let's allow update if it exists or create new if not (but findFirst checks existence).
        // Let's stick to "already submitted" for now or update it.
        // I will update it to be friendlier.
        const updatedSubmission = await prisma.submission.update({
            where: { id: existingSubmission.id },
            data: {
                content: content || existingSubmission.content,
                fileUrl: fileUrl || existingSubmission.fileUrl,
                submittedAt: new Date()
            }
        });
        return res.status(200).json(updatedSubmission);
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId: id as string,
        studentId,
        content: content || null,
        fileUrl: fileUrl || null,
      },
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error submitting assignment", error });
  }
};

export const deleteAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "ID required" });

    const assignment = await prisma.assignment.findUnique({
      where: { id: id as string },
      include: { course: true }
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Verify permission
    if ((req.user?.role as string) === "ENSEIGNANT") {
      if (assignment.course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (req.user?.role !== "SUPER_ADMIN" && req.user?.role !== "DIRECTEUR") {
        return res.status(403).json({ message: "Access denied" });
    }

    await prisma.assignment.delete({
      where: { id: id as string },
    });

    res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting assignment", error });
  }
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // assignmentId
    
    if (!id) return res.status(400).json({ message: "ID required" });

    // Check ownership if teacher
    if ((req.user?.role as string) === "ENSEIGNANT") {
        const assignment = await prisma.assignment.findUnique({
            where: { id: id as string },
            include: { course: true }
        });
        if (!assignment || assignment.course.teacherId !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: id as string },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        grade: true,
      },
    });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching submissions", error });
  }
};

export const gradeSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // submissionId
    const { value, comment } = gradeSubmissionSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "ID required" });

    const submission = await prisma.submission.findUnique({
      where: { id: id as string },
      include: {
          student: true,
          assignment: true
      }
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Upsert grade
    // Note: Grade creation requires termId. We need to find the active term for this assignment.
    // For now, let's try to find an OPEN term in the school.
    // This logic is a bit fragile and should be improved by linking assignment to term or year.
    
    // Quick fix: Find the first OPEN term.
    const activeTerm = await prisma.term.findFirst({
        where: { status: 'OPEN' }
    });
    
    let termId = activeTerm?.id;

    // If no active term, try to find ANY term or create a default one if we want to enforce it.
    // For now, if schema allows null, we can skip it, OR we create a dummy one.
    // Schema allows null.
    // But let's see if we can just skip it.
    
    const grade = await prisma.grade.upsert({
      where: { submissionId: id as string },
      update: {
        value,
        comment: comment || null,
      },
      create: {
        submissionId: id as string,
        value,
        comment: comment || null,
        studentId: submission.studentId,
        termId: termId || null,
      },
    });

    res.json(grade);
  } catch (error) {
    res.status(500).json({ message: "Error grading submission", error });
  }
};
