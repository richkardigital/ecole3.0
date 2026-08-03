
import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

// Helper to calculate average
const calculateAverage = (grades: any[]) => {
  if (grades.length === 0) return 0;
  const sum = grades.reduce((acc, curr) => acc + curr.value, 0);
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

    // 1. Get Student Enrollments to know which classes/courses they have
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: String(studentId) },
        include: { class: true }
    });

    if (enrollments.length === 0) {
        return res.json({ studentId, averages: [], globalAverage: 0 });
    }

    // 2. Get all courses for these classes
    const classIds = enrollments.map(e => e.classId);
    const courses = await prisma.course.findMany({
        where: { classId: { in: classIds } },
        include: { 
            subject: true,
            assignments: {
                include: {
                    grades: {
                        where: { studentId: String(studentId) }
                    }
                }
            }
        }
    });

    // 3. Calculate averages per course
    const courseAverages = courses.map(course => {
        // Collect all grades from all assignments
        // Note: This assumes grades are linked to assignments. 
        // If a grade is direct (oral), it might not have assignmentId? 
        // Schema: Grade has assignmentId? and submissionId?. 
        // Let's assume for MVP all grades come via assignments or we fetch all grades for student & course.
        // Better: Fetch grades directly for student where assignment.courseId is X.
        
        const grades = course.assignments.flatMap(a => a.grades);
        const average = calculateAverage(grades);
        
        return {
            courseId: course.id,
            subjectName: course.subject.name,
            coefficient: course.coefficient,
            average,
            gradesCount: grades.length
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

        const courses = await prisma.course.findMany({
            where: { classId: String(classId) },
            include: { subject: true }
        });

        const reports = [];

        for (const student of students) {
             const grades = await prisma.grade.findMany({
                 where: {
                     studentId: student.id,
                     ...(termId ? { termId: String(termId) } : {})
                 },
                 include: { assignment: true }
             });

             const courseAverages = courses.map(course => {
                 const cGrades = grades.filter(g => 
                     g.courseId === course.id || 
                     g.assignment?.courseId === course.id ||
                     (g.assignment?.subjectId && g.assignment.subjectId === course.subjectId)
                 );

                 const sum = cGrades.reduce((acc, curr) => acc + curr.value, 0);
                 const count = cGrades.length;
                 const average = count > 0 ? parseFloat((sum / count).toFixed(2)) : null;

                 return {
                     subjectName: course.subject.name,
                     average: average,
                     coefficient: (course as any).coefficient || 1,
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
