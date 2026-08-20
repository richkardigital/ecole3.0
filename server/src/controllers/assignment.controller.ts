import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadToSupabase } from "../utils/supabase.js";
import { propagateAssignment } from "../services/propagation.js";
import { ROLES } from "../config/constants.js";

const createAssignmentSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().transform((str) => new Date(str)),
  courseId: z.string().optional(),
  niveauId: z.string().optional(),
  subjectId: z.string().optional(),
  type: z.enum(["EXERCICE_MAISON", "DEVOIR_MAISON", "DEVOIR_CLASSE", "DEVOIR_NIVEAU"]).optional(),
  termId: z.string().optional(),
  autoGrade: z.boolean().optional(),
  isNiveauWide: z.boolean().optional(),
  imageUrl: z.string().optional(),
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
    const { 
      title, 
      description, 
      startDate, 
      dueDate, 
      courseId, 
      niveauId, 
      subjectId, 
      academicYearId,
      type, 
      termId, 
      coefficient, 
      points,
      timeLimit,
      autoGrade, 
      isNiveauWide, 
      imageUrl,
      syncCalendar,
      published
    } = req.body;

    let finalDescription = description || "";
    let voiceNoteUrl = null;
    let correctionUrl = null;
    let attachments: string[] = [];

    // Helper to find file in array or object
    const getFile = (name: string) => {
      if (Array.isArray(req.files)) {
        return (req.files as Express.Multer.File[]).find(f => f.fieldname === name);
      } else if (req.files && typeof req.files === 'object') {
        return (req.files as Record<string, Express.Multer.File[]>)[name]?.[0];
      }
      return undefined;
    };

    const mainFile = getFile('file') || (req.file as Express.Multer.File | undefined);
    if (mainFile) {
      const publicUrl = await uploadToSupabase(mainFile);
      if (publicUrl) {
        attachments.push(publicUrl);
      }
    }

    const voiceNoteFile = getFile('voiceNote');
    if (voiceNoteFile) {
      voiceNoteUrl = await uploadToSupabase(voiceNoteFile);
    }

    const correctionFile = getFile('correction');
    if (correctionFile) {
      correctionUrl = await uploadToSupabase(correctionFile);
    }

    if (!title || !dueDate) {
      return res.status(400).json({ message: "Le titre et la date limite sont requis" });
    }

    if (!courseId && !niveauId) {
      return res.status(400).json({ message: "courseId ou niveauId est requis" });
    }

    // Resolve course information if courseId provided
    let resolvedNiveauId = niveauId || null;
    let resolvedSubjectId = subjectId || null;
    let resolvedAcademicYearId = academicYearId || null;

    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: String(courseId) },
        include: { niveau: true, subject: true }
      });
      if (course) {
        if (!resolvedNiveauId) resolvedNiveauId = course.niveauId;
        if (!resolvedSubjectId) resolvedSubjectId = course.subjectId;
        if (!resolvedAcademicYearId) resolvedAcademicYearId = course.academicYearId;
      }
    }

    // Determine AssignmentType
    let resolvedType: any = "DEVOIR_NIVEAU";
    if (type === "COMPOSITION" || type === "COMPOSITION_NIVEAU" || type === "COMPO_NIVEAU") {
      resolvedType = "COMPOSITION_NIVEAU";
    } else if (type === "DEVOIR" || type === "DEVOIR_NIVEAU") {
      resolvedType = "DEVOIR_NIVEAU";
    } else if (type === "DEVOIR_MAISON") {
      resolvedType = "DEVOIR_MAISON";
    } else if (type === "DEVOIR_CLASSE") {
      resolvedType = "DEVOIR_CLASSE";
    } else if (type === "EXERCICE_MAISON") {
      resolvedType = "EXERCICE_MAISON";
    } else if (type === "EXAMEN") {
      resolvedType = "EXAMEN";
    }

    const parsedDueDate = new Date(dueDate);
    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    const parsedCoefficient = coefficient ? parseInt(coefficient) : 1;
    const parsedPoints = points ? parseInt(points) : 20;
    const parsedTimeLimit = timeLimit ? parseInt(timeLimit) : null;
    const isAutoGrade = String(autoGrade) === 'true';
    const isSyncCalendar = syncCalendar !== undefined ? String(syncCalendar) === 'true' : true;
    const isPublished = published !== undefined ? String(published) === 'true' : true;

    // Parse questions & handle question images if any
    let questionsData: any = undefined;
    if (req.body.questions) {
      let rawQuestions = typeof req.body.questions === 'string' ? JSON.parse(req.body.questions) : req.body.questions;
      if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
        const processedQuestions = [];
        for (let i = 0; i < rawQuestions.length; i++) {
          const q = rawQuestions[i];
          let qImgUrl = q.imageUrl || null;
          const qImgFile = getFile(`questionImage_${i}`) || getFile(`questions[${i}][image]`);
          if (qImgFile) {
            const uploaded = await uploadToSupabase(qImgFile);
            if (uploaded) qImgUrl = uploaded;
          }

          processedQuestions.push({
            text: q.text,
            type: q.type || 'MULTIPLE_CHOICE',
            points: Number(q.points) || 1,
            position: i,
            imageUrl: qImgUrl,
            expectedAnswer: q.expectedAnswer || null,
            options: q.options && Array.isArray(q.options) ? {
              create: q.options.map((opt: any) => ({
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect),
                imageUrl: opt.imageUrl || null
              }))
            } : undefined
          });
        }
        questionsData = { create: processedQuestions };
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: finalDescription || null,
        startDate: parsedStartDate,
        dueDate: parsedDueDate,
        timeLimit: parsedTimeLimit,
        points: parsedPoints,
        coefficient: parsedCoefficient,
        courseId: courseId ? String(courseId) : null,
        niveauId: resolvedNiveauId,
        subjectId: resolvedSubjectId,
        academicYearId: resolvedAcademicYearId,
        termId: termId || null,
        type: resolvedType,
        autoGrade: isAutoGrade,
        isNiveauWide: true,
        syncCalendar: isSyncCalendar,
        published: isPublished,
        imageUrl: imageUrl || null,
        createdById: req.user?.id,
        voiceNoteUrl: voiceNoteUrl || null,
        correctionUrl: correctionUrl || null,
        attachments: attachments.length > 0 ? attachments : (req.body.attachments ? (Array.isArray(req.body.attachments) ? req.body.attachments : JSON.parse(req.body.attachments)) : []),
        scope: resolvedNiveauId ? 'NIVEAU' : 'CLASSE',
        workflowStatus: isPublished ? 'PUBLIE' : 'BROUILLON',
        questions: questionsData
      },
      include: {
        questions: {
          include: {
            options: true
          }
        },
        subject: true,
        niveau: true,
        term: true
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ message: "Erreur lors de la création de l'évaluation", error });
  }
};

const quickAddAssignmentSchema = z.object({
  title: z.string(),
  courseId: z.string(),
  termId: z.string().optional(),
  type: z.enum(["DEVOIR", "INTERROGATION", "EXAMEN", "PROJET", "EVALUATION"]).optional(),
  points: z.number().optional().default(20),
  coefficient: z.number().optional().default(1)
});

export const quickAddAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { title, courseId, termId, type, points, coefficient } = quickAddAssignmentSchema.parse(req.body);

    const assignment = await prisma.assignment.create({
      data: {
        title,
        courseId,
        termId: termId || null,
        type: (type as any) || "DEVOIR_MAISON",
        points: points || 20,
        coefficient: coefficient || 1,
        dueDate: new Date(), // Just default to today since it's an offline manual assessment
        published: true, // Ensure it shows up instantly
        createdById: req.user?.id
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error quick adding assignment", error });
  }
};


export const publishAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { published } = req.body;
    const role = req.user?.role as string;
    
    // Vérifier si le devoir existe
    const assignment = await prisma.assignment.findUnique({ where: { id } });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Seul SUPER_ADMIN peut publier des devoirs de niveau NIVEAU
    if (assignment.scope === 'NIVEAU' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        message: "Seul le Super Administrateur peut publier des devoirs de niveau."
      });
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        published,
        workflowStatus: published ? 'PUBLIE' : 'BROUILLON',
        isNiveauWide: assignment.scope === 'NIVEAU' // Sync rétro-compat
      }
    });

    // Propager automatiquement si publication déclenchée
    let propagatedCount = 0;
    if (published) {
      try {
        propagatedCount = await propagateAssignment(id);
        
        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: req.user?.id,
            action: 'PUBLIE_DEVOIR',
            entity: 'Assignment',
            entityId: id,
            metadata: JSON.stringify({
              scope: assignment.scope,
              propagatedTo: propagatedCount,
              publishedAt: new Date().toISOString()
            })
          }
        });
      } catch (propagationError) {
        console.error('Propagation error:', propagationError);
        // Ne pas bloquer la publication si la propagation échoue
      }
    }

    res.json({ ...updated, propagatedTo: propagatedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating publish status", error });
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
            niveau: { nom: String(level) }
        };

        if ((req.user?.role as string) === 'DIRECTEUR' || (req.user?.role as string) === 'EDUCATEUR') {
            if (schoolId) whereClass.schoolId = schoolId;
        } else if ((req.user?.role as string) === 'ENSEIGNANT') {
            if (schoolId) whereClass.schoolId = schoolId;
            whereClass.teacherClasses = { some: { teacherId: req.user.id } };
        } else if ((req.user?.role as string) === 'APPRENANT') {
            if (schoolId) whereClass.schoolId = schoolId;
            whereClass.enrollments = { some: { studentId: req.user.id } };
        }

        const classes = await prisma.class.findMany({
            where: whereClass,
            select: { id: true, niveauId: true }
        });

        const classIds = classes.map(c => c.id);
        const classNiveauIds = classes.map(c => c.niveauId).filter(Boolean) as string[];

        // Find the actual Niveau IDs for global assignments (including school-specific and global)
        const niveaux = await prisma.niveau.findMany({
            where: { 
                nom: String(level),
                OR: [
                    { schoolId: schoolId || undefined },
                    { schoolId: null }
                ]
            }
        });
        const niveauIds = Array.from(new Set([...niveaux.map(n => n.id), ...classNiveauIds]));

        if (classIds.length === 0 && niveauIds.length === 0) {
            return res.json([]);
        }

        // Find assignments for courses in these classes AND global assignments for this level
        const assignmentWhere: any = {
            OR: [
                {
                    niveauId: { in: niveauIds }
                },
                {
                    course: {
                        niveauId: { in: niveauIds }
                    }
                }
            ],
            dueDate: {
                gte: start,
                lte: end
            }
        };

        // If APPRENANT, only show published assignments from OPEN terms
        if (req.user?.role === 'APPRENANT') {
            assignmentWhere.published = true;
            assignmentWhere.workflowStatus = { not: 'CLOTURE' };
            assignmentWhere.AND = [
                {
                    OR: [
                        { termId: null },
                        { term: { status: 'OPEN' } }
                    ]
                }
            ];
        }

        const assignments = await prisma.assignment.findMany({
            where: assignmentWhere,
            include: {
                course: {
                    include: {
                        subject: true,
                        niveau: true
                    }
                },
                subject: true,
                niveau: true
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
        subject: true,
        niveau: true,
        academicYear: true,
        term: true,
        course: {
          select: {
            id: true,
            subject: { select: { name: true } },
            niveau: { select: { nom: true } }
          }
        },
        questions: {
          include: {
            options: true
          },
          orderBy: { position: 'asc' }
        },
        submissions: {
            ...((req.user?.role as string) === 'APPRENANT' ? { where: { studentId: req.user.id } } : {}),
            include: { grade: true }
        }
      },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // For APPRENANT who hasn't submitted and the assignment is not auto-graded or corrected,
    // hide isCorrect from options to prevent cheating via browser devtools
    if ((req.user?.role as string) === 'APPRENANT') {
      const hasSubmitted = assignment.submissions && assignment.submissions.length > 0;
      if (!hasSubmitted && assignment.questions) {
        (assignment as any).questions = assignment.questions.map(q => ({
          ...q,
          expectedAnswer: null,
          options: q.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            imageUrl: opt.imageUrl,
            questionId: opt.questionId
          }))
        }));
      }
    }

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignment", error });
  }
};

export const getAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, global, academicYearId, termId, classId, niveauId, isCorrected } = req.query;

    const userRole = req.user?.role as string;
    
    if (global === 'true' && ['SUPER_ADMIN', 'ENSEIGNANT', 'APPRENANT', 'DIRECTEUR', 'EDUCATEUR'].includes(userRole)) {
        const whereClause: any = { courseId: null, niveauId: { not: null } };

        if (userRole === 'ENSEIGNANT') {
            // Un enseignant ne voit que les devoirs globaux des niveaux où il enseigne
            const teacherClasses = await prisma.teacherClass.findMany({
                where: { teacherId: req.user?.id },
                include: { class: true }
            });
            const niveauIds = Array.from(new Set(teacherClasses.map(tc => tc.class?.niveauId).filter((n): n is string => Boolean(n))));
            if (niveauIds.length === 0) return res.json([]);
            
            // Si on demande un niveau spécifique, on vérifie que le prof l'enseigne bien
            if (niveauId && niveauIds.includes(String(niveauId))) {
                whereClause.niveauId = String(niveauId);
            } else {
                whereClause.niveauId = { in: niveauIds };
            }
        } else if (userRole === 'APPRENANT') {
            const enrollment = await prisma.enrollment.findFirst({
                where: { studentId: req.user?.id },
                include: { class: true }
            });
            if (enrollment && enrollment.class?.niveauId) {
                whereClause.niveauId = enrollment.class.niveauId;
            } else {
                return res.json([]);
            }
        } else {
            if (niveauId) {
                whereClause.niveauId = String(niveauId);
            } else if (classId) {
                const classObj = await prisma.class.findUnique({ where: { id: String(classId) }});
                if (classObj && classObj.niveauId) {
                    whereClause.niveauId = classObj.niveauId;
                }
            }
        }

        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (termId) {
             const term = await prisma.term.findUnique({ where: { id: String(termId) }});
             if (term) {
                 startDate = term.startDate;
                 endDate = term.endDate;
             }
        } else if (academicYearId) {
             const year = await prisma.academicYear.findUnique({ where: { id: String(academicYearId) }});
             if (year) {
                 startDate = year.startDate;
                 endDate = year.endDate;
             }
        }

        if (startDate && endDate) {
             whereClause.dueDate = {
                 gte: startDate,
                 lte: endDate
             };
        }

        const assignments = await prisma.assignment.findMany({
            where: whereClause,
            include: {
                subject: true,
                niveau: true,
                questions: {
                    select: { id: true }
                },
                _count: { select: { submissions: true, questions: true } },
                submissions: {
                    select: { id: true, studentId: true, grade: { select: { id: true } } }
                }
            },
            orderBy: { dueDate: 'desc' }
        });

        let results = assignments.map(a => {
            const numSubmissions = a._count.submissions;
            const numGrades = a.submissions.filter(s => s.grade != null).length;
            const isFullyCorrected = numSubmissions > 0 && numSubmissions === numGrades;
            
            const { submissions, ...rest } = a;
            return { ...rest, isCorrected: isFullyCorrected };
        });

        if (isCorrected === 'true') {
            results = results.filter(r => r.isCorrected);
        } else if (isCorrected === 'false') {
            results = results.filter(r => !r.isCorrected);
        }

        return res.json(results);
    }

    if (!courseId) {
       return res.status(400).json({message: "courseId is required"});
    }

    const course = await prisma.course.findUnique({
        where: { id: String(courseId) },
        include: { niveau: true, subject: true }
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    const assignments = await prisma.assignment.findMany({
      where: { 
        OR: [
          { courseId: String(courseId) },
          { AND: [{ niveauId: course.niveauId }, { subjectId: course.subjectId }] }
        ]
      },
      include: {
        subject: true,
        niveau: true,
        term: true,
        questions: {
          include: {
            options: true
          },
          orderBy: { position: 'asc' }
        },
        _count: {
          select: { submissions: true, questions: true },
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
      orderBy: { dueDate: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignments", error });
  }
};

export const submitAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id); // assignmentId
    const { content } = req.body;
    let answers = req.body.answers;
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (_) {}
    }
    let fileUrl = req.body.fileUrl;

    if (req.file) {
        if (req.file.mimetype.startsWith('audio/')) {
            if (req.file.size > 20 * 1024 * 1024) {
                return res.status(400).json({ message: "Le fichier audio dépasse la taille limite de 20MB." });
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

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { 
        term: true,
        questions: { include: { options: true } } 
      }
    });

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    // Bloquer les soumissions si le trimestre est clôturé ou le devoir clôturé
    if (assignment.term?.status === 'CLOSED' || assignment.workflowStatus === 'CLOTURE') {
      return res.status(400).json({ 
        message: "Ce trimestre est clôturé. Aucune évaluation ne peut plus être passée ou soumise." 
      });
    }

    // Auto-grading logic for QCM
    let finalContent = content;
    let autoScore = null;
    let isFullyAutoGraded = false;

    if (answers && typeof answers === "object") {
        let totalPoints = 0;
        let earnedPoints = 0;
        let hasManualQuestions = false;

        const parsedAnswers = answers;

        for (const question of (assignment as any).questions) {
            totalPoints += (question.points || 1);
            if (question.type === "MULTIPLE_CHOICE" || question.type === "SINGLE_CHOICE") {
                const rawSelection = parsedAnswers[question.id];
                const userSelectedOptions = Array.isArray(rawSelection) 
                  ? rawSelection 
                  : (rawSelection ? [rawSelection] : []);
                const correctOptionIds = question.options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
                
                const isCorrect = userSelectedOptions.length === correctOptionIds.length && 
                                  userSelectedOptions.every((oid: string) => correctOptionIds.includes(oid));
                
                if (isCorrect) earnedPoints += (question.points || 1);
            } else if (question.type === "FILL_IN_BLANK") {
                const userText = (parsedAnswers[question.id] as string) || "";
                const correct = question.expectedAnswer || "";
                if (userText.trim().toLowerCase() === correct.trim().toLowerCase()) {
                    earnedPoints += (question.points || 1);
                }
            } else {
                hasManualQuestions = true;
            }
        }

        finalContent = JSON.stringify(parsedAnswers);
        
        if (totalPoints > 0) {
            autoScore = (earnedPoints / totalPoints) * 20;
            if (!hasManualQuestions || assignment.autoGrade) {
                isFullyAutoGraded = true;
            }
        }
    }

    const existingSubmission = await prisma.submission.findFirst({
        where: { assignmentId: id as string, studentId }
    });

    let submission;
    if (existingSubmission) {
        submission = await prisma.submission.update({
            where: { id: existingSubmission.id },
            data: {
                content: finalContent || existingSubmission.content,
                fileUrl: fileUrl || existingSubmission.fileUrl,
                submittedAt: new Date()
            }
        });
    } else {
        submission = await prisma.submission.create({
          data: {
            assignmentId: id as string,
            studentId,
            content: finalContent || null,
            fileUrl: fileUrl || null,
          },
        });
    }

    // Apply auto grade if applicable
    if (isFullyAutoGraded && autoScore !== null) {
        let finalCourseId = assignment.courseId;
        if (!finalCourseId && assignment.niveauId && assignment.subjectId) {
            const enrollment = await prisma.enrollment.findFirst({
                where: { studentId, status: "ACTIVE", class: { niveauId: assignment.niveauId } }
            });
            if (enrollment) {
                const course = await prisma.course.findFirst({
                    where: { niveauId: assignment.niveauId, subjectId: assignment.subjectId }
                });
                finalCourseId = course?.id ?? null;
            }
        }

        const gradeTypeMap: Record<string, string> = { EVALUATION: "EVALUATION", DEVOIR: "DEVOIR", EXAMEN: "EXAMEN", NIVEAU: "DEVOIR" };

        await prisma.grade.upsert({
            where: { submissionId: submission.id },
            create: {
                value: parseFloat(autoScore.toFixed(2)),
                coefficient: assignment.coefficient,
                comment: "Auto-corrigé",
                studentId,
                termId: assignment.termId,
                courseId: finalCourseId,
                assignmentId: assignment.id,
                submissionId: submission.id,
                type: (gradeTypeMap[assignment.type] ?? "DEVOIR") as any,
                validated: true,
                source: "ADMIN", // Notes auto-corrigées = source ADMIN (60%)
                isGraded: true
            },
            update: {
                value: parseFloat(autoScore.toFixed(2)),
                comment: "Auto-corrigé",
                source: "ADMIN"
            }
        });
    }

    // Marquer la propagation comme soumise
    try {
      await prisma.assignmentPropagation.upsert({
        where: { assignmentId_studentId: { assignmentId: id as string, studentId } },
        create: { assignmentId: id as string, studentId, submitted: true, submittedAt: new Date(), notified: true, viewed: true },
        update: { submitted: true, submittedAt: new Date() }
      });
    } catch (_) {
      // La propagation peut ne pas exister (devoir de classe sans propagation formelle)
    }

    res.status(existingSubmission ? 200 : 201).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error submitting assignment", error });
  }
};

export const deleteAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    if (!id) return res.status(400).json({ message: "ID required" });

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { course: true }
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Verify permission
    if ((req.user?.role as string) === "ENSEIGNANT") {
      if (assignment.createdById !== req.user.id && assignment.correctorId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (req.user?.role !== "SUPER_ADMIN" && req.user?.role !== "DIRECTEUR") {
        return res.status(403).json({ message: "Access denied" });
    }

    if (assignment.published) {
      return res.status(400).json({ message: "Vous ne pouvez pas supprimer une évaluation publiée." });
    }

    await prisma.assignment.delete({
      where: { id },
    });

    res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting assignment", error });
  }
};

export const updateAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { title, description, dueDate, courseId, niveauId, subjectId, type, coefficient, points, timeLimit } = req.body;
    let finalDescription = description || "";

    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { questions: { include: { options: true } } }
    });

    if (!existing) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Check if modifying is allowed:
    // If published, check if it has already started and has submissions
    const submissionsCount = await prisma.submission.count({ where: { assignmentId: id } });
    const isStarted = existing.startDate && new Date() > new Date(existing.startDate);

    if (existing.published && isStarted && submissionsCount > 0 && req.user?.role !== ROLES.SUPER_ADMIN) {
      return res.status(400).json({ message: "Vous ne pouvez plus modifier une évaluation en cours ayant déjà des participations." });
    }

    // Helper to find file in array or object
    const getFile = (name: string) => {
      if (Array.isArray(req.files)) {
        return (req.files as Express.Multer.File[]).find(f => f.fieldname === name);
      } else if (req.files && typeof req.files === 'object') {
        return (req.files as Record<string, Express.Multer.File[]>)[name]?.[0];
      }
      return undefined;
    };

    let attachments: string[] = req.body.attachments 
      ? (Array.isArray(req.body.attachments) ? req.body.attachments : JSON.parse(req.body.attachments)) 
      : existing.attachments;

    const mainFile = getFile('file') || (req.file as Express.Multer.File | undefined);
    if (mainFile) {
      const publicUrl = await uploadToSupabase(mainFile);
      if (publicUrl) {
        attachments = [publicUrl];
      }
    }

    let correctionUrl = existing.correctionUrl;
    const correctionFile = getFile('correction');
    if (correctionFile) {
      const uploadedCorrection = await uploadToSupabase(correctionFile);
      if (uploadedCorrection) {
        correctionUrl = uploadedCorrection;
      }
    }

    const voiceNoteFile = getFile('voiceNote');
    if (voiceNoteFile) {
      const voiceNoteUrl = await uploadToSupabase(voiceNoteFile);
      if (voiceNoteUrl) {
        finalDescription += `\n[Écouter la consigne vocale](${voiceNoteUrl})`;
      }
    }

    // Process questions
    let questionsInput: any = undefined;
    if (req.body.questions) {
      await prisma.assignmentQuestion.deleteMany({ where: { assignmentId: id } });

      let rawQuestions = typeof req.body.questions === 'string' ? JSON.parse(req.body.questions) : req.body.questions;
      if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
        const processedQuestions = [];
        for (let i = 0; i < rawQuestions.length; i++) {
          const q = rawQuestions[i];
          let qImgUrl = q.imageUrl || null;
          const qImgFile = getFile(`questionImage_${i}`) || getFile(`questions[${i}][image]`);
          if (qImgFile) {
            const uploaded = await uploadToSupabase(qImgFile);
            if (uploaded) qImgUrl = uploaded;
          }

          processedQuestions.push({
            text: q.text,
            type: q.type || 'SINGLE_CHOICE',
            points: Number(q.points) || 1,
            position: i,
            imageUrl: qImgUrl,
            expectedAnswer: q.expectedAnswer || null,
            options: q.options && Array.isArray(q.options) ? {
              create: q.options.map((opt: any) => ({
                text: opt.text,
                isCorrect: Boolean(opt.isCorrect),
                imageUrl: opt.imageUrl || null
              }))
            } : undefined
          });
        }
        questionsInput = { create: processedQuestions };
      }
    }

    const parsedDate = dueDate ? new Date(dueDate) : existing.dueDate;
    const parsedStartDate = req.body.startDate ? new Date(req.body.startDate) : existing.startDate;
    const parsedCoefficient = coefficient ? parseInt(coefficient) : existing.coefficient;
    const parsedPoints = points ? parseInt(points) : existing.points;
    const parsedTimeLimit = timeLimit ? parseInt(timeLimit) : existing.timeLimit;

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        title: title || existing.title,
        description: finalDescription || existing.description,
        dueDate: parsedDate,
        startDate: parsedStartDate,
        courseId: courseId || existing.courseId,
        niveauId: niveauId || existing.niveauId,
        subjectId: subjectId || existing.subjectId,
        academicYearId: req.body.academicYearId || existing.academicYearId,
        termId: req.body.termId || existing.termId,
        type: type || existing.type,
        coefficient: parsedCoefficient,
        points: parsedPoints,
        timeLimit: parsedTimeLimit,
        autoGrade: req.body.autoGrade !== undefined ? Boolean(req.body.autoGrade) : existing.autoGrade,
        isNiveauWide: req.body.isNiveauWide !== undefined ? Boolean(req.body.isNiveauWide) : existing.isNiveauWide,
        syncCalendar: req.body.syncCalendar !== undefined ? String(req.body.syncCalendar) === 'true' : existing.syncCalendar,
        published: req.body.published !== undefined ? String(req.body.published) === 'true' : existing.published,
        imageUrl: req.body.imageUrl || existing.imageUrl,
        correctionUrl,
        attachments,
        questions: questionsInput
      },
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating assignment", error });
  }
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // assignmentId
    
    if (!id) return res.status(400).json({ message: "ID required" });

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: id as string },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            enrollments: {
              select: {
                class: { select: { id: true, name: true } }
              }
            }
          },
        },
        grade: true,
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
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

    const assignment = submission.assignment;
    let termId = assignment?.termId;
    if (!termId) {
      const activeTerm = await prisma.term.findFirst({ where: { status: "OPEN" } });
      termId = activeTerm?.id || null;
    }
    let finalCourseId = assignment?.courseId || null;

    if (!finalCourseId && assignment?.niveauId && assignment?.subjectId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: submission.studentId, status: "ACTIVE", class: { niveauId: assignment.niveauId } }
      });
      if (enrollment) {
        const course = await prisma.course.findFirst({
          where: { niveauId: assignment.niveauId, subjectId: assignment.subjectId }
        });
        finalCourseId = course?.id ?? null;
      }
    }

    const resolvedType = assignment?.type ? ((assignment.type.startsWith('COMPOSITION') || assignment.type.startsWith('COMPO')) ? 'EXAMEN' : 'DEVOIR') : 'DEVOIR';
    const isTeacher = (req.user?.role as string) === "ENSEIGNANT";

    const grade = await prisma.grade.upsert({
      where: { submissionId: id as string },
      update: {
        value,
        comment: comment || null,
        assignmentId: submission.assignmentId,
        courseId: finalCourseId,
        termId,
        coefficient: assignment?.coefficient || 1,
        type: resolvedType as any,
        validated: true,
        isGraded: true,
        source: isTeacher ? "ENSEIGNANT" : "ADMIN",
      },
      create: {
        submissionId: id as string,
        assignmentId: submission.assignmentId,
        courseId: finalCourseId,
        value,
        comment: comment || null,
        studentId: submission.studentId,
        termId,
        coefficient: assignment?.coefficient || 1,
        type: resolvedType as any,
        validated: true,
        isGraded: true,
        source: isTeacher ? "ENSEIGNANT" : "ADMIN",
      },
    });

    res.json(grade);
  } catch (error) {
    res.status(500).json({ message: "Error grading submission", error });
  }
};

export const getAssignmentParticipants = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { classId } = req.query;
    if (!id) return res.status(400).json({ message: 'ID required' });
    
    const assignment = await prisma.assignment.findUnique({ where: { id: id as string } });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    
    let whereClause: any = { role: 'APPRENANT' };
    
    if (classId) {
      whereClause.enrollments = { some: { classId: String(classId) } };
    } else if (assignment.courseId) {
      const course = await prisma.course.findUnique({ where: { id: assignment.courseId } });
      if (course) whereClause.enrollments = { some: { class: { niveauId: course.niveauId } } };
    } else if (assignment.niveauId) {
      whereClause.enrollments = { some: { class: { niveauId: assignment.niveauId } } };
    }
    
    const students = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true, 
        firstName: true, 
        lastName: true, 
        avatarUrl: true,
        enrollments: { select: { class: { select: { id: true, name: true } } } },
        submissions: {
          where: { assignmentId: id as string },
          select: {
            id: true, 
            submittedAt: true, 
            content: true, 
            fileUrl: true,
            grade: { select: { id: true, value: true, comment: true } }
          }
        }
      }
    });
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching participants', error });
  }
};

export const gradeStudentAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // assignmentId
    const { studentId, value, comment } = req.body;
    
    if (!id || !studentId) return res.status(400).json({ message: 'Champs requis manquants' });

    const assignment = await prisma.assignment.findUnique({
      where: { id: String(id) },
      include: { course: true }
    });
    if (!assignment) return res.status(404).json({ message: 'Devoir non trouvé' });
    
    let submission = await prisma.submission.findFirst({ 
      where: { assignmentId: id as string, studentId: String(studentId) } 
    });
    
    if (!submission) {
      submission = await prisma.submission.create({
        data: {
          assignmentId: id as string,
          studentId: String(studentId),
          content: 'NON_RENDU' // Placeholder to signify they were graded without submitting
        }
      });
    }

    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
      return res.status(400).json({ message: 'La note doit être comprise entre 0 et 20' });
    }
    
    let finalCourseId = assignment.courseId;
    if (!finalCourseId && assignment.niveauId && assignment.subjectId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: String(studentId), status: "ACTIVE", class: { niveauId: assignment.niveauId } }
      });
      if (enrollment) {
        const course = await prisma.course.findFirst({
          where: { niveauId: assignment.niveauId, subjectId: assignment.subjectId }
        });
        finalCourseId = course?.id ?? null;
      }
    }

    const resolvedType = assignment.type ? ((assignment.type.startsWith('COMPOSITION') || assignment.type.startsWith('COMPO')) ? 'EXAMEN' : 'DEVOIR') : 'DEVOIR';
    const isTeacher = (req.user?.role as string) === "ENSEIGNANT";

    const grade = await prisma.grade.upsert({
      where: { submissionId: submission.id },
      create: {
        value: numValue,
        comment: comment || null,
        studentId: String(studentId),
        submissionId: submission.id,
        assignmentId: id as string,
        courseId: finalCourseId,
        termId: assignment.termId || null,
        coefficient: assignment.coefficient || 1,
        type: resolvedType as any,
        validated: true,
        isGraded: true,
        source: isTeacher ? 'ENSEIGNANT' : 'ADMIN'
      },
      update: {
        value: numValue,
        comment: comment || null,
        courseId: finalCourseId,
        termId: assignment.termId || null,
        coefficient: assignment.coefficient || 1,
        type: resolvedType as any,
        validated: true,
        isGraded: true
      }
    });
    
    res.json(grade);
  } catch (error) {
    console.error("Error grading student assignment:", error);
    res.status(500).json({ message: 'Erreur lors de la notation', error });
  }
};

export const uploadCorrectionFile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: "Veuillez fournir un fichier de correction." });
    }
    
    const correctionUrl = `/uploads/${req.file.filename}`;
    
    const assignment = await prisma.assignment.update({
      where: { id: String(id) },
      data: { correctionUrl }
    });
    
    res.json(assignment);
  } catch (error) {
    console.error("Error uploading correction file", error);
    res.status(500).json({ message: "Erreur lors de l'upload du corrigé", error });
  }
};

export const updateCorrectionQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // assignmentId
    const { questions } = req.body; // Array of { id, type, expectedAnswer, options: [{ id, isCorrect }] }
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: "Format invalide" });
    }
    
    // Perform updates in a transaction
    await prisma.$transaction(async (tx) => {
      for (const q of questions) {
        if (q.type === 'OPEN') {
          await tx.assignmentQuestion.update({
            where: { id: String(q.id) },
            data: { expectedAnswer: q.expectedAnswer || null }
          });
        } else if (q.type === 'MULTIPLE_CHOICE' && q.options) {
          for (const opt of q.options) {
            await tx.assignmentOption.update({
              where: { id: String(opt.id) },
              data: { isCorrect: Boolean(opt.isCorrect) }
            });
          }
        }
      }
    });
    
    res.json({ message: "Correction enregistrée avec succès" });
  } catch (error) {
    console.error("Error updating quiz correction", error);
    res.status(500).json({ message: "Erreur lors de l'enregistrement de la correction", error });
  }
};
