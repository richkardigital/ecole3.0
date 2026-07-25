import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    let stats = {};

    switch (user.role) {
      case "SUPER_ADMIN":
        const schoolsCount = await prisma.school.count();
        const usersCount = await prisma.user.count();
        stats = {
          schools: schoolsCount,
          users: usersCount,
        };
        break;

      case "DIRECTEUR":
      case "EDUCATEUR":
        if (!user.schoolId) break;
        const classesCount = await prisma.class.count({
          where: { schoolId: user.schoolId },
        });
        const teachersCount = await prisma.user.count({
          where: { schoolId: user.schoolId, role: "ENSEIGNANT" },
        });
        const studentsCount = await prisma.user.count({
            where: { schoolId: user.schoolId, role: "APPRENANT" },
        });
        stats = {
          classes: classesCount,
          teachers: teachersCount,
          students: studentsCount
        };
        break;

      case "ENSEIGNANT":
        const coursesCount = await prisma.course.count({
          where: { teacherId: user.id },
        });
        // Count submissions for assignments in courses taught by this teacher where grade is null
        const ungradedSubmissionsCount = await prisma.submission.count({
            where: {
                assignment: {
                    course: {
                        teacherId: user.id
                    }
                },
                grade: null
            }
        });
        stats = {
          courses: coursesCount,
          ungradedSubmissions: ungradedSubmissionsCount,
        };
        break;

      case "APPRENANT":
        const enrolledCoursesCount = await prisma.course.count({
          where: {
            class: {
              enrollments: {
                some: {
                  studentId: user.id,
                },
              },
            },
          },
        });
        
        // Pending assignments: Assignments in enrolled courses that user hasn't submitted yet
        // This is a bit complex query, simplifying for now to just assignments count in enrolled courses
        // Or better: fetch all assignments and filter in memory or complex query.
        // Let's try a cleaner query:
        // 1. Get student's class ID
        const enrollment = await prisma.enrollment.findFirst({
            where: { studentId: user.id }
        });

        let pendingAssignmentsCount = 0;
        if (enrollment) {
             const classId = enrollment.classId;
             // Count assignments for this class where NO submission exists for this student
             // Prisma doesn't support "where not exists" easily in count without raw query or advanced filtering.
             // Alternative: Count total assignments - Count submitted assignments
             
             const totalAssignments = await prisma.assignment.count({
                 where: {
                     course: {
                         classId: classId
                     }
                 }
             });

             const submittedAssignments = await prisma.submission.count({
                 where: {
                     studentId: user.id
                 }
             });
             
             pendingAssignmentsCount = Math.max(0, totalAssignments - submittedAssignments);
        }

        stats = {
          enrolledCourses: enrolledCoursesCount,
          pendingAssignments: pendingAssignmentsCount,
        };
        break;
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching stats" });
  }
};
