import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { yearId } = req.query; // Capture yearId query param
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    let stats: any = {};

    switch (user.role) {
      case "SUPER_ADMIN": {
        let schoolsCount = 0;
        let usersCount = 0;
        let teachersCount = 0;
        let educatorsCount = 0;
        let classesCount = 0;
        let studentsCount = 0;
        let boysCount = 0;
        let girlsCount = 0;
        let effectifsData: any[] = [];
        
        if (yearId && typeof yearId === 'string' && yearId !== 'ALL') {
          schoolsCount = await prisma.school.count({
            where: { academicYears: { some: { id: yearId } } }
          });
          usersCount = await prisma.user.count();
          teachersCount = await prisma.user.count({ where: { role: 'ENSEIGNANT' } });
          educatorsCount = await prisma.user.count({ where: { role: 'EDUCATEUR' } });
          classesCount = await prisma.class.count({ where: { academicYearId: yearId } });

          // Total enrolled students for the specific year
          studentsCount = await prisma.enrollment.count({
            where: {
              class: { academicYearId: yearId }
            }
          });
          
          boysCount = await prisma.enrollment.count({
            where: {
              class: { academicYearId: yearId },
              student: { gender: 'MASCULIN' }
            }
          });
          
          girlsCount = await prisma.enrollment.count({
            where: {
              class: { academicYearId: yearId },
              student: { gender: 'FEMININ' }
            }
          });

          const schools = await prisma.school.findMany({
            where: { academicYears: { some: { id: yearId } } },
            include: {
              classes: {
                where: { academicYearId: yearId },
                include: {
                  _count: { select: { enrollments: true } }
                }
              }
            }
          });

          for (const school of schools) {
            const schoolStudents = school.classes.reduce((sum, cls) => sum + cls._count.enrollments, 0);
            effectifsData.push({ name: school.name, v: schoolStudents });
          }
        } else {
           schoolsCount = await prisma.school.count();
           usersCount = await prisma.user.count();
           teachersCount = await prisma.user.count({ where: { role: 'ENSEIGNANT' } });
           educatorsCount = await prisma.user.count({ where: { role: 'EDUCATEUR' } });
           classesCount = await prisma.class.count();
           
           studentsCount = await prisma.user.count({ where: { role: 'APPRENANT' } });
           boysCount = await prisma.user.count({ where: { role: 'APPRENANT', gender: 'MASCULIN' } });
           girlsCount = await prisma.user.count({ where: { role: 'APPRENANT', gender: 'FEMININ' } });
           const schools = await prisma.school.findMany({
             include: {
                _count: {
                  select: { users: { where: { role: 'APPRENANT' } } }
                }
             }
           });
           for (const school of schools) {
             effectifsData.push({ name: school.name, v: school._count.users });
           }
        }

        effectifsData.sort((a, b) => b.v - a.v);

        stats = {
          schools: schoolsCount,
          users: usersCount,
          teachers: teachersCount,
          educators: educatorsCount,
          classes: classesCount,
          students: studentsCount,
          boys: boysCount,
          girls: girlsCount,
          effectifsData,
        };
        break;
      }

      case "DIRECTEUR":
      case "EDUCATEUR": {
        if (!user.schoolId) break;
        const classesCount = await prisma.class.count({
          where: { schoolId: user.schoolId },
        });
        const teachersCount = await prisma.user.count({
          where: { schoolId: user.schoolId, role: "ENSEIGNANT" },
        });
        const educatorsCount = await prisma.user.count({
          where: { schoolId: user.schoolId, role: "EDUCATEUR" },
        });
        const studentsCount = await prisma.user.count({
          where: { schoolId: user.schoolId, role: "APPRENANT" },
        });
        stats = {
          classes: classesCount,
          teachers: teachersCount,
          educators: educatorsCount,
          students: studentsCount
        };
        break;
      }

      case "ENSEIGNANT": {
        const teacherClasses = await prisma.teacherClass.findMany({
          where: { teacherId: user.id },
          include: { class: true }
        });
        const distinctClassIds = Array.from(new Set(teacherClasses.map(tc => tc.classId)));
        
        const ungradedSubmissionsCount = await prisma.submission.count({
          where: {
            assignment: {
              OR: [
                { createdById: user.id },
                { correctorId: user.id }
              ]
            },
            grade: null
          }
        });

        stats = {
          courses: teacherClasses.length,
          classes: distinctClassIds.length,
          ungradedSubmissions: ungradedSubmissionsCount,
        };
        break;
      }

      case "APPRENANT": {
        const enrollment = await prisma.enrollment.findFirst({
            where: { studentId: user.id },
            include: { class: { include: { niveau: true } } }
        });

        let enrolledCoursesCount = 0;
        let pendingAssignmentsCount = 0;

        if (enrollment?.class?.niveauId) {
          enrolledCoursesCount = await prisma.course.count({
            where: { niveauId: enrollment.class.niveauId }
          });

          const totalAssignments = await prisma.assignment.count({
            where: {
              OR: [
                { niveauId: enrollment.class.niveauId },
                { course: { niveauId: enrollment.class.niveauId } }
              ]
            }
          });

          const submittedAssignments = await prisma.submission.count({
            where: { studentId: user.id }
          });
          
          pendingAssignmentsCount = Math.max(0, totalAssignments - submittedAssignments);
        }

        stats = {
          enrolledCourses: enrolledCoursesCount,
          pendingAssignments: pendingAssignmentsCount,
        };
        break;
      }
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching stats" });
  }
};
