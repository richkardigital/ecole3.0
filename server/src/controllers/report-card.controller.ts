import type { Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

// Helper to calculate average
const calculateAverage = (grades: any[]) => {
  if (grades.length === 0) return 0;
  const sum = grades.reduce((acc, curr) => acc + (curr.value ?? 0), 0);
  return parseFloat((sum / grades.length).toFixed(2));
};

export const getStudentReportCard = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { termId } = req.query; // Optional: filter by term

    if (!studentId) return res.status(400).json({ message: "Student ID required" });

    // RBAC: Student can only see own, Teacher/Admin can see any
    if ((req.user?.role as string) === 'APPRENANT' && req.user.id !== studentId) {
        return res.status(403).json({ message: "Access denied" });
    }

    // 1. Get Student Enrollments to know which classes they belong to
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: String(studentId) },
        include: { 
          class: {
            include: {
              teacherClasses: {
                include: { subject: true }
              }
            }
          }
        }
    });

    if (enrollments.length === 0) {
        return res.json({ studentId, courses: [], globalAverage: 0 });
    }

    // 2. Fetch all grades for this student
    const grades = await prisma.grade.findMany({
      where: {
        studentId: String(studentId),
        ...(termId ? { termId: String(termId) } : {})
      },
      include: {
        course: { include: { subject: true } },
        assignment: { include: { subject: true } }
      }
    });

    // 3. Extract unique subjects for the student
    const subjectsMap = new Map<string, { id: string; name: string; coefficient: number }>();
    for (const enr of enrollments) {
      for (const tc of enr.class.teacherClasses) {
        if (tc.subject) {
          subjectsMap.set(tc.subject.id, {
            id: tc.subject.id,
            name: tc.subject.name,
            coefficient: tc.subject.coefficient || 1
          });
        }
      }
    }

    // If no teacherClasses assigned yet, use subjects found in grades
    for (const g of grades) {
      const subj = g.course?.subject || g.assignment?.subject;
      if (subj && !subjectsMap.has(subj.id)) {
        subjectsMap.set(subj.id, {
          id: subj.id,
          name: subj.name,
          coefficient: subj.coefficient || 1
        });
      }
    }

    const courseAverages = Array.from(subjectsMap.values()).map(subject => {
      const subjectGrades = grades.filter(g => 
        (g.course?.subjectId === subject.id) || 
        (g.assignment?.subjectId === subject.id)
      );
      const avg = calculateAverage(subjectGrades);
      return {
        courseId: subject.id,
        subjectName: subject.name,
        coefficient: subject.coefficient,
        average: avg,
        gradesCount: subjectGrades.length
      };
    });

    // 4. Calculate Global Average (Weighted)
    let totalWeightedScore = 0;
    let totalCoefficients = 0;

    courseAverages.forEach(c => {
        if (c.gradesCount > 0) {
            totalWeightedScore += c.average * c.coefficient;
            totalCoefficients += c.coefficient;
        }
    });

    const globalAverage = totalCoefficients > 0 
        ? parseFloat((totalWeightedScore / totalCoefficients).toFixed(2)) 
        : 0;

    res.json({
        studentId,
        reportDate: new Date(),
        courses: courseAverages,
        globalAverage
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generating report card", error });
  }
};

export const getClassReportCard = async (req: AuthRequest, res: Response) => {
    try {
        const { classId } = req.params;
        const { termId } = req.query;
        
        if (req.user?.role !== 'DIRECTEUR' && req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'EDUCATEUR' && req.user?.role !== 'ENSEIGNANT') {
            return res.status(403).json({ message: "Access denied" });
        }

        const students = await prisma.user.findMany({
            where: {
                enrollments: {
                    some: { classId: String(classId) }
                },
                role: 'APPRENANT'
            },
            select: { id: true, firstName: true, lastName: true },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
        });

        const teacherClasses = await prisma.teacherClass.findMany({
            where: { classId: String(classId) },
            include: { subject: true }
        });

        const subjects = teacherClasses
          .map(tc => tc.subject)
          .filter(Boolean);

        const reports = [];

        for (const student of students) {
             const grades = await prisma.grade.findMany({
                 where: {
                     studentId: student.id,
                     ...(termId ? { termId: String(termId) } : {})
                 },
                 include: {
                     course: { include: { subject: true } },
                     assignment: { include: { subject: true } }
                 }
             });

             const courseAverages = subjects.map(subj => {
                 const cGrades = grades.filter(g => 
                     (g.course?.subjectId === subj.id) || 
                     (g.assignment?.subjectId === subj.id)
                 );
                 const count = cGrades.length;
                 const average = count > 0 ? calculateAverage(cGrades) : null;

                 return {
                     subjectName: subj.name,
                     average: average,
                     coefficient: subj.coefficient || 1,
                     hasGrades: count > 0
                 };
             });

             let totalWeighted = 0;
             let totalCoeff = 0;
             courseAverages.forEach(c => {
                 if (c.hasGrades && c.average !== null) {
                     totalWeighted += c.average * c.coefficient;
                     totalCoeff += c.coefficient;
                 }
             });
             const globalAvg = totalCoeff > 0 ? (totalWeighted / totalCoeff) : 0;

             reports.push({
                 student,
                 globalAverage: parseFloat(globalAvg.toFixed(2)),
                 details: courseAverages
             });
        }

        res.json({ classId, reports });

    } catch (error) {
        res.status(500).json({ message: "Error generating class report", error });
    }
};


