import type { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const saveGradeSchema = z.object({
  studentId: z.string(),
  assignmentId: z.string().optional(),
  courseId: z.string().optional(),
  value: z.number().min(0).max(20),
  comment: z.string().optional(),
  type: z.enum(["DEVOIR", "EVALUATION", "EXAMEN", "PARTICIPATION", "CONDUITE", "QUIZ", "INTERRO"]).optional(),
}).refine(data => data.assignmentId || data.courseId, {
    message: "Either assignmentId or courseId must be provided"
});

const saveParticipationSchema = z.object({
  courseId: z.string(),
  termId: z.string(),
  grades: z.array(z.object({
    studentId: z.string(),
    value: z.number().min(0).max(20).nullable(),
  }))
});


export const getConductGrades = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params;
        if (!courseId || typeof courseId !== 'string') return res.status(400).json({ message: "Course ID required" });

        const course = await prisma.course.findUnique({ 
            where: { id: courseId },
            include: { niveau: true }
        });
        
        if (!course) return res.status(404).json({ message: "Course not found" });

        let classWhereClause: any = { niveauId: course.niveauId };

        if ((req.user?.role as string) === 'ENSEIGNANT') {
            const teaches = await prisma.teacherClass.findMany({
                where: { teacherId: req.user.id, subjectId: course.subjectId, class: { niveauId: course.niveauId } }
            });
            if (teaches.length === 0) return res.status(403).json({ message: "Access denied" });
            classWhereClause.id = { in: teaches.map(t => t.classId) };
        }

        const enrollments = await prisma.enrollment.findMany({
            where: { class: classWhereClause, status: 'ACTIVE' },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            },
            orderBy: { student: { lastName: 'asc' } }
        });

        const students = enrollments.map(e => e.student);

        const grades = await prisma.grade.findMany({
            where: {
                courseId: courseId,
                assignmentId: null
            }
        });

        res.json({ students, grades });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching conduct grades", error });
    }
};

export const getTeacherGrid = async (req: AuthRequest, res: Response) => {
    try {
        const { classId, termId, subjectId } = req.query;
        if (!classId || !termId) {
            return res.status(400).json({ message: "classId and termId are required" });
        }

        // Get class info
        const targetClass = await prisma.class.findUnique({
          where: { id: String(classId) },
          include: { niveau: true }
        });
        if (!targetClass) return res.status(404).json({ message: "Classe introuvable" });

        // Get students in the class
        const enrollments = await prisma.enrollment.findMany({
            where: { classId: String(classId) },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, matricule: true }
                }
            },
            orderBy: { student: { lastName: 'asc' } }
        });
        const students = enrollments.map(e => e.student);

        // Get assignments for this class / niveau
        const assignments = await prisma.assignment.findMany({
            where: {
                OR: [
                    ...(targetClass.niveauId ? [{ niveauId: targetClass.niveauId }] : []),
                    ...(subjectId ? [{ subjectId: String(subjectId) }] : [])
                ]
            },
            orderBy: { createdAt: 'asc' }
        });

        // Get grades for assignments in this term
        const grades = await prisma.grade.findMany({
            where: {
                termId: String(termId),
                studentId: { in: students.map(s => s.id) }
            }
        });

        res.json({
            class: targetClass,
            students,
            assignments,
            grades,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching teacher grid", error });
    }
};


export const getGradebook = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ message: "Course ID required" });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { niveau: true }
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    let classWhereClause: any = { niveauId: course.niveauId };

    if ((req.user?.role as string) === "ENSEIGNANT") {
      const teaches = await prisma.teacherClass.findMany({
        where: { teacherId: req.user.id, subjectId: course.subjectId, class: { niveauId: course.niveauId } }
      });
      if (teaches.length === 0) return res.status(403).json({ message: "Access denied" });
      classWhereClause.id = { in: teaches.map(t => t.classId) };
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { class: classWhereClause, status: 'ACTIVE' },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { student: { lastName: 'asc' } }
    });

    const students = enrollments.map(e => e.student);

    const assignments = await prisma.assignment.findMany({
      where: { courseId: courseId },
      orderBy: { dueDate: 'asc' }
    });

    const quizzes = await prisma.quiz.findMany({
      where: { courseId: courseId },
      orderBy: { endDate: 'asc' }
    });

    const grades = await prisma.grade.findMany({
      where: { courseId: courseId },
      include: {
        assignment: { select: { id: true, title: true, type: true, coefficient: true } },
        term: { select: { id: true, name: true } }
      }
    });

    res.json({ students, assignments, quizzes, grades });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching gradebook", error });
  }
};

const saveGridSchema = z.object({
    termId: z.string(),
    courseId: z.string().optional(),
    grades: z.array(z.object({
        studentId: z.string(),
        assignmentId: z.string(),
        value: z.number().min(0).max(20).nullable()
    }))
});

export const saveTeacherGrid = async (req: AuthRequest, res: Response) => {
    try {
        const { termId, courseId, grades } = saveGridSchema.parse(req.body);

        await prisma.$transaction(async (tx) => {
            for (const g of grades) {
                if (g.value === null) {
                    await tx.grade.deleteMany({
                        where: {
                            studentId: g.studentId,
                            assignmentId: g.assignmentId,
                            termId
                        }
                    });
                    continue;
                }

                const existing = await tx.grade.findFirst({
                    where: {
                        studentId: g.studentId,
                        assignmentId: g.assignmentId,
                        termId
                    }
                });

                if (existing) {
                    await tx.grade.update({
                        where: { id: existing.id },
                        data: { value: g.value }
                    });
                } else {
                    await tx.grade.create({
                        data: {
                            studentId: g.studentId,
                            assignmentId: g.assignmentId,
                            courseId: courseId || null,
                            termId: termId,
                            value: g.value,
                            source: ((req.user?.role as string) === "ENSEIGNANT") ? "ENSEIGNANT" : "ADMIN",
                            isGraded: true
                        }
                    });
                }
            }
        });

        res.json({ message: "Grades saved successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving grades", error });
    }
};

export const saveGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, assignmentId, courseId, value, comment } = saveGradeSchema.parse(req.body);

    const activeTerm = await prisma.term.findFirst({
        where: { status: 'OPEN' }
    });

    let submission = null;
    if (assignmentId) {
        submission = await prisma.submission.findFirst({
            where: { assignmentId, studentId }
        });
    }

    const whereClause: any = { studentId };
    if (assignmentId) whereClause.assignmentId = assignmentId;
    if (courseId) whereClause.courseId = courseId;

    const existingGrade = await prisma.grade.findFirst({
        where: whereClause
    });

    let result;
    if (existingGrade) {
        result = await prisma.grade.update({
            where: { id: existingGrade.id },
            data: {
                value,
                comment: comment || null
            }
        });
    } else {
        result = await prisma.grade.create({
            data: {
                studentId,
                assignmentId: assignmentId || null,
                courseId: courseId || null,
                value,
                comment: comment || null,
                termId: activeTerm?.id || null,
                submissionId: submission?.id || null,
                source: ((req.user?.role as string) === "ENSEIGNANT") ? "ENSEIGNANT" : "ADMIN",
                isGraded: true
            }
        });
    }

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving grade", error });
  }
};

export const getStudentReportCard = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.params.studentId || req.user?.id;
    const { termId } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: "Student ID required" });
    }

    if ((req.user?.role as string) === "APPRENANT" && req.user.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
    }

    const student = await prisma.user.findUnique({
        where: { id: studentId as string },
        include: {
            school: true,
            enrollments: {
                include: {
                    class: true
                },
                orderBy: { joinedAt: 'desc' },
                take: 1
            }
        }
    });

    if (!student) {
        return res.status(404).json({ message: "Student not found" });
    }

    let term;
    if (termId) {
        term = await prisma.term.findUnique({ where: { id: termId as string } });
    } else if (student.schoolId) {
        term = await prisma.term.findFirst({
            where: {
                academicYear: {
                    schools: { some: { id: student.schoolId } }
                },
                status: 'OPEN'
            }
        });
        if (!term) {
            term = await prisma.term.findFirst({
                where: {
                    academicYear: {
                        schools: { some: { id: student.schoolId } }
                    }
                },
                orderBy: { endDate: 'desc' }
            });
        }
    }

    if (!term) {
        return res.status(404).json({ message: "No term found" });
    }

    const enrollment = student.enrollments[0];
    if (!enrollment) {
         return res.status(400).json({ message: "Student not enrolled in any class" });
    }

    const teacherClasses = await prisma.teacherClass.findMany({
        where: { classId: enrollment.classId },
        include: {
            subject: true,
            teacher: {
                select: { firstName: true, lastName: true }
            }
        }
    });

    const grades = await prisma.grade.findMany({
        where: {
            studentId: studentId as string,
            termId: term.id
        },
        include: {
            assignment: true,
            course: { include: { subject: true } }
        }
    });

    const subjectStats = teacherClasses.map(tc => {
        const courseGrades = grades.filter(g => 
            (g.course?.subjectId === tc.subject.id) ||
            (g.assignment?.subjectId === tc.subject.id)
        );
        
        const sum = courseGrades.reduce((acc, g) => acc + g.value, 0);
        const count = courseGrades.length;
        const average = count > 0 ? sum / count : null;
        
        return {
            id: tc.subject.id,
            subject: tc.subject.name,
            subjectCode: tc.subject.code,
            teacher: `${tc.teacher.firstName} ${tc.teacher.lastName}`,
            average: average,
            coefficient: tc.subject.coefficient || 1,
            grades: courseGrades.map(g => ({
                value: g.value,
                assignment: g.assignment?.title
            }))
        };
    });

    const validSubjects = subjectStats.filter(s => s.average !== null);
    const overallWeightedSum = validSubjects.reduce((acc, s) => acc + ((s.average || 0) * s.coefficient), 0);
    const totalCoefficients = validSubjects.reduce((acc, s) => acc + s.coefficient, 0);
    const overallAverage = totalCoefficients > 0 ? overallWeightedSum / totalCoefficients : null;

    res.json({
        student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            class: enrollment.class.name
        },
        school: student.school,
        term: term,
        subjects: subjectStats,
        overallAverage
    });

  } catch (error) {
    console.error("Error generating report card", error);
    res.status(500).json({ message: "Error generating report card" });
  }
};

export const saveParticipationGrades = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, termId, grades } = saveParticipationSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      for (const g of grades) {
        if (g.value === null) {
          await tx.grade.deleteMany({
            where: {
              studentId: g.studentId,
              courseId,
              termId,
              type: 'PARTICIPATION'
            }
          });
          continue;
        }

        const existing = await tx.grade.findFirst({
          where: {
            studentId: g.studentId,
            courseId,
            termId,
            type: 'PARTICIPATION'
          }
        });

        if (existing) {
          await tx.grade.update({
            where: { id: existing.id },
            data: { value: g.value }
          });
        } else {
          await tx.grade.create({
            data: {
              studentId: g.studentId,
              courseId,
              termId,
              value: g.value,
              type: 'PARTICIPATION',
              coefficient: 1
            }
          });
        }
      }
    });

    res.json({ message: "Notes de participation sauvegardées" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la sauvegarde des notes de participation", error });
  }
};

export const getParticipationGrades = async (req: AuthRequest, res: Response) => {
  try {
    const courseId = String(req.params.courseId);
    const termId = req.query.termId ? String(req.query.termId) : undefined;

    if (!courseId || !termId) {
      return res.status(400).json({ message: "courseId et termId requis" });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { niveau: true }
    });

    if (!course) return res.status(404).json({ message: "Cours introuvable" });

    const enrollments = await prisma.enrollment.findMany({
      where: { class: { niveauId: course.niveauId } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } }
      },
      orderBy: { student: { lastName: 'asc' } }
    });

    const grades = await prisma.grade.findMany({
      where: {
        courseId,
        termId: termId,
        type: 'PARTICIPATION'
      }
    });

    res.json({
      students: enrollments.map(e => e.student),
      grades
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
