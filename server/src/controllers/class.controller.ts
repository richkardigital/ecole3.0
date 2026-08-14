import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';

const createClassSchema = z.object({
  name: z.string(),
  niveauId: z.string().optional(),
  schoolId: z.string().optional(),
  academicYearId: z.string().optional(),
  isActive: z.boolean().optional(),
});

const enrollStudentSchema = z.object({
  studentId: z.string(),
  classId: z.string(),
});

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const { name, niveauId, schoolId: bodySchoolId, academicYearId, isActive } = createClassSchema.parse(req.body);
    
    // Use bodySchoolId if provided and user is SUPER_ADMIN, otherwise use user's schoolId
    const schoolId = (req.user?.role === 'SUPER_ADMIN' && bodySchoolId) 
        ? bodySchoolId 
        : req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: "School ID required" });
    }

    // Auto-associate active academic year if not provided
    let finalAcademicYearId = academicYearId || null;
    if (!finalAcademicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true, isActive: true }
      });
      if (activeYear) finalAcademicYearId = activeYear.id;
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        schoolId,
        niveauId: niveauId || null,
        academicYearId: finalAcademicYearId,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        niveau: true,
        school: true,
        academicYear: true,
      }
    });

    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: "Error creating class", error });
  }
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, niveauId, academicYearId, isActive } = createClassSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "Missing id" });

    const updatedClass = await prisma.class.update({
      where: { id: String(id) },
      data: {
        name,
        niveauId: niveauId || null,
        academicYearId: academicYearId !== undefined ? academicYearId : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: {
        niveau: true,
        school: true,
        academicYear: true,
      }
    });

    res.json(updatedClass);
  } catch (error) {
    res.status(500).json({ message: "Error updating class", error });
  }
};

export const getClassById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cls = await prisma.class.findUnique({
      where: { id: String(id) },
      include: {
        school: true,
        niveau: {
          include: {
            courses: {
              include: {
                subject: true,
                _count: { select: { chapters: true, assignments: true, quizzes: true } }
              }
            },
            _count: {
              select: { courses: true }
            }
          }
        },
        academicYear: true,
        teacherClasses: {
          include: {
            teacher: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, matricule: true }
            },
            subject: {
              select: { id: true, name: true, coefficient: true, code: true }
            }
          }
        },
        enrollments: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, matricule: true, isActive: true }
            }
          }
        },
        _count: {
          select: { enrollments: true, teacherClasses: true },
        },
      },
    });

    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }

    const courseCount = cls.niveau?._count?.courses || cls.teacherClasses?.length || 0;
    const enrichedClass = {
      ...cls,
      _count: {
        ...cls._count,
        courses: courseCount
      }
    };

    res.json(enrichedClass);
  } catch (error) {
    res.status(500).json({ message: "Error fetching class", error });
  }
};

export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const where: any = {};
    
    if ((user?.role as string) === 'SUPER_ADMIN') {
        if (req.query.schoolId) {
            where.schoolId = String(req.query.schoolId);
        }
    } else if ((user?.role as string) === 'DIRECTEUR' || (user?.role as string) === 'EDUCATEUR') {
        if (!user?.schoolId) {
            return res.status(400).json({ message: "User not associated with a school" });
        }
        where.schoolId = user.schoolId;
    } else if ((user?.role as string) === 'ENSEIGNANT') {
        if (!user?.schoolId) return res.status(400).json({ message: "User not associated with a school" });
        where.schoolId = user.schoolId;
        where.teacherClasses = {
            some: { teacherId: user.id }
        };
    } else if ((user?.role as string) === 'APPRENANT') {
        if (!user?.schoolId) return res.status(400).json({ message: "User not associated with a school" });
        where.schoolId = user.schoolId;
        where.enrollments = {
            some: { studentId: user.id }
        };
    }

    if (req.query.niveauId) {
      where.niveauId = String(req.query.niveauId);
    }
    if (req.query.academicYearId) {
      where.academicYearId = String(req.query.academicYearId);
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        niveau: {
          include: {
            _count: {
              select: { courses: true }
            }
          }
        },
        school: true,
        academicYear: true,
        teacherClasses: {
          include: {
            teacher: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, matricule: true }
            },
            subject: {
              select: { id: true, name: true, coefficient: true }
            }
          }
        },
        _count: {
          select: { enrollments: true, teacherClasses: true },
        },
      },
    });

    // Helper to determine sort rank based on class name
    const getClassRank = (name: string): number => {
        const n = name.toLowerCase();
        // Primary School
        if (n.includes("ps") || n.includes("petite section")) return 1;
        if (n.includes("ms") || n.includes("moyenne section")) return 2;
        if (n.includes("gs") || n.includes("grande section")) return 3;
        if (n.includes("cp")) return 10;
        if (n.includes("ce1")) return 11;
        if (n.includes("ce2")) return 12;
        if (n.includes("cm1")) return 13;
        if (n.includes("cm2")) return 14;
        // Middle School (College)
        if (n.includes("6ème") || n.includes("6eme")) return 20;
        if (n.includes("5ème") || n.includes("5eme")) return 21;
        if (n.includes("4ème") || n.includes("4eme")) return 22;
        if (n.includes("3ème") || n.includes("3eme")) return 23;
        // High School (Lycee)
        if (n.includes("2nde") || n.includes("seconde")) return 30;
        if (n.includes("1ère") || n.includes("1ere") || n.includes("première")) return 31;
        if (n.includes("terminale") || n.includes("tle")) return 32;
        
        return 100; // Others
    };

    // Sort classes by rank, then alphabetically
    const sortedClasses = classes.sort((a, b) => {
        const rankA = getClassRank(a.name);
        const rankB = getClassRank(b.name);
        
        if (rankA !== rankB) {
            return rankA - rankB;
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    const enrichedClasses = sortedClasses.map(cls => ({
      ...cls,
      _count: {
        enrollments: cls._count.enrollments,
        teacherClasses: cls._count.teacherClasses,
        courses: cls.niveau?._count?.courses || cls.teacherClasses?.length || 0
      }
    }));

    res.json(enrichedClasses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching classes", error });
  }
};

export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const { studentId, classId } = enrollStudentSchema.parse(req.body);

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      select: { academicYearId: true }
    });

    if (!targetClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (targetClass.academicYearId) {
       const existingEnrollment = await prisma.enrollment.findFirst({
         where: {
            studentId,
            class: { academicYearId: targetClass.academicYearId }
         }
       });

       if (existingEnrollment) {
          if (existingEnrollment.classId === classId) {
            return res.status(400).json({ message: "L'élève est déjà inscrit dans cette classe." });
          }
          // Move from previous class to this class
          await prisma.enrollment.delete({ where: { id: existingEnrollment.id } });
       }
    } else {
       const exactEnrollment = await prisma.enrollment.findUnique({
           where: { studentId_classId: { studentId, classId } }
       });
       if (exactEnrollment) {
           return res.status(400).json({ message: "L'élève est déjà inscrit dans cette classe." });
       }
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId,
        academicYearId: targetClass.academicYearId || null,
        status: 'ACTIVE'
      },
      include: {
        student: true,
        class: true
      }
    });

    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ message: "Error enrolling student", error });
  }
};

export const unenrollStudent = async (req: Request, res: Response) => {
  try {
    const { studentId, classId } = req.body;
    
    if (!studentId || !classId) {
      return res.status(400).json({ message: "Missing studentId or classId" });
    }
    
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, classId }
    });

    if (!enrollment) {
      return res.status(404).json({ message: "L'élève n'est pas inscrit dans cette classe." });
    }

    await prisma.enrollment.delete({
      where: { id: enrollment.id }
    });

    res.json({ message: "Élève retiré de la classe avec succès (le compte utilisateur reste conservé)" });
  } catch (error) {
    res.status(500).json({ message: "Error unenrolling student", error });
  }
};

export const getClassStudents = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "Missing id" });
        
        const enrollments = await prisma.enrollment.findMany({
            where: { classId: String(id) },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        matricule: true,
                        phone: true,
                        avatarUrl: true,
                        gender: true,
                        isActive: true
                    }
                }
            }
        });

        const students = enrollments.map((e: any) => ({
            ...e.student,
            enrollmentId: e.id,
            enrollmentStatus: e.status,
            joinedAt: e.joinedAt
        }));

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: "Error fetching students", error });
    }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Missing id" });

    await prisma.class.delete({
      where: { id: String(id) },
    });
    res.status(200).json({ message: "Class deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting class", error });
  }
};

export const transferStudent = async (req: Request, res: Response) => {
    try {
        const { studentId, studentIds, fromClassId, toClassId, targetClassId } = req.body;
        const targetId = toClassId || targetClassId;

        if (!targetId) {
            return res.status(400).json({ message: "Target class ID is required" });
        }

        const targetClass = await prisma.class.findUnique({
            where: { id: String(targetId) },
            select: { id: true, academicYearId: true, name: true }
        });

        if (!targetClass) {
            return res.status(404).json({ message: "Target class not found" });
        }

        const idsToTransfer: string[] = Array.isArray(studentIds) 
            ? studentIds 
            : studentId 
                ? [studentId] 
                : [];

        if (idsToTransfer.length === 0) {
            return res.status(400).json({ message: "No students specified for transfer" });
        }

        let transferredCount = 0;

        for (const sId of idsToTransfer) {
            // Delete any existing enrollments for the student in the source class or for the same academic year
            if (fromClassId) {
                await prisma.enrollment.deleteMany({
                    where: { studentId: sId, classId: String(fromClassId) }
                });
            }

            if (targetClass.academicYearId) {
                await prisma.enrollment.deleteMany({
                    where: {
                        studentId: sId,
                        class: { academicYearId: targetClass.academicYearId }
                    }
                });
            } else {
                await prisma.enrollment.deleteMany({
                    where: { studentId: sId, classId: targetClass.id }
                });
            }

            // Create new single enrollment in the target class
            await prisma.enrollment.create({
                data: {
                    studentId: sId,
                    classId: targetClass.id,
                    academicYearId: targetClass.academicYearId || null,
                    status: 'ACTIVE'
                }
            });
            transferredCount++;
        }

        res.json({ 
            message: `${transferredCount} élève(s) transféré(s) avec succès vers la classe ${targetClass.name}.`,
            transferredCount,
            targetClass: targetClass.name
        });
    } catch (error) {
        console.error("Error transferring students:", error);
        res.status(500).json({ message: "Error transferring student(s)", error });
    }
};

export const assignTeacherToClass = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, teacherId, subjectId } = req.body;
    if (!classId || !teacherId || !subjectId) {
      return res.status(400).json({ message: "classId, teacherId and subjectId are required" });
    }

    const assignment = await prisma.teacherClass.upsert({
      where: {
        teacherId_classId_subjectId: { 
          teacherId: String(teacherId), 
          classId: String(classId), 
          subjectId: String(subjectId) 
        }
      },
      update: {},
      create: {
        teacherId: String(teacherId),
        classId: String(classId),
        subjectId: String(subjectId)
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, matricule: true } },
        subject: { select: { id: true, name: true, coefficient: true } }
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Error assigning teacher to class", error });
  }
};

export const unassignTeacherFromClass = async (req: AuthRequest, res: Response) => {
  try {
    const { teacherClassId, classId, teacherId, subjectId } = req.body;

    if (teacherClassId) {
      await prisma.teacherClass.delete({ where: { id: String(teacherClassId) } });
    } else if (classId && teacherId && subjectId) {
      await prisma.teacherClass.delete({
        where: {
          teacherId_classId_subjectId: {
            teacherId: String(teacherId),
            classId: String(classId),
            subjectId: String(subjectId)
          }
        }
      });
    } else {
      return res.status(400).json({ message: "Missing identifier for teacher assignment" });
    }

    res.json({ message: "Affectation retirée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Error unassigning teacher from class", error });
  }
};

export const getClassCourses = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cls = await prisma.class.findUnique({
      where: { id: String(id) },
      select: { id: true, name: true, niveauId: true }
    });

    if (!cls) return res.status(404).json({ message: "Class not found" });
    if (!cls.niveauId) return res.json([]);

    const courses = await prisma.course.findMany({
      where: { niveauId: cls.niveauId },
      include: {
        subject: true,
        niveau: true,
        _count: {
          select: { chapters: true, assignments: true, quizzes: true }
        }
      }
    });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching class courses", error });
  }
};

export const previewImportStudents = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier fourni" });
        }
        if (!req.file.buffer) {
             return res.status(400).json({ message: "File buffer is empty" });
        }
        
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("Excel file is empty");
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet) as any[];

        const previewData = [];

        for (const row of data) {
            const firstName = row['Prénom'] || row['Prenom'] || row['firstname'] || row['First Name'];
            const lastName = row['Nom'] || row['lastname'] || row['Last Name'];
            const email = row['Email'] || row['email'] || row['Email Ecole']; 
            const password = row['Password'] || row['Mot de passe'] || row['password'];

            const status = {
                firstName,
                lastName,
                email,
                password: password ? '******' : 'Manquant',
                providedEmail: !!email,
                providedPassword: !!password,
                status: 'VALID',
                reasons: [] as string[]
            };

            if (!firstName) { status.status = 'INVALID'; status.reasons.push('Prénom manquant'); }
            if (!lastName) { status.status = 'INVALID'; status.reasons.push('Nom manquant'); }
            if (!email) { status.status = 'INVALID'; status.reasons.push('Email manquant'); }
            if (!password) { status.status = 'INVALID'; status.reasons.push('Mot de passe manquant'); }
            
            let checkEmail = email;
            if (!checkEmail && firstName && lastName) {
                 const cleanFirstName = firstName.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                 const cleanLastName = lastName.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                 checkEmail = `${cleanFirstName}.${cleanLastName}@ecole.com`;
                 status.email = checkEmail + " (Généré)";
            } else if (checkEmail) {
                 status.email = checkEmail;
            }

            if (checkEmail) {
                const existingUser = await prisma.user.findUnique({ where: { email: checkEmail } });
                if (existingUser) {
                    status.status = 'EXISTS';
                    status.reasons.push('Compte existant (sera inscrit)');
                }
            } else {
                 status.status = 'INVALID'; status.reasons.push('Email manquant/impossible');
            }

            previewData.push(status);
        }

        res.json(previewData);

    } catch (error) {
        console.error("Preview error", error);
        res.status(500).json({ message: "Error previewing import", error });
    }
};

export const importStudents = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // classId
        if (!id) return res.status(400).json({ message: "Missing id" });

        const schoolId = req.user?.schoolId;

        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        if (!req.file.buffer) {
             return res.status(400).json({ message: "File buffer is empty" });
        }
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("Excel file is empty");
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet) as any[];

        const targetClass = await prisma.class.findUnique({
            where: { id: String(id) },
            select: { academicYearId: true }
        });
        if (!targetClass) return res.status(404).json({ message: "Class not found" });

        let createdCount = 0;
        let enrolledCount = 0;

        for (const row of data) {
            const firstName = row['Prénom'] || row['Prenom'] || row['firstname'] || row['First Name'];
            const lastName = row['Nom'] || row['lastname'] || row['Last Name'];

            if (!firstName || !lastName) continue;

            const cleanFirstName = firstName.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanLastName = lastName.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
            let baseEmail = row['Email'] || row['email'] || row['Email Ecole'] || `${cleanFirstName}.${cleanLastName}@ecole.com`;
            
            let user = await prisma.user.findUnique({ where: { email: baseEmail } });
            
            if (!user) {
                 const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                 let generatedPassword = "";
                 for (let i = 0; i < 10; i++) {
                     generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
                 }
                 
                 const hashedPassword = await bcrypt.hash(generatedPassword, 10);
                 try {
                    user = await prisma.user.create({
                        data: {
                            email: baseEmail,
                            password: hashedPassword,
                            firstName: firstName.toString(),
                            lastName: lastName.toString(),
                            role: "APPRENANT",
                            schoolId: schoolId || null
                        }
                    });
                    createdCount++;
                 } catch (e) {
                     console.log(`Skipping ${baseEmail} due to error`, e);
                     continue;
                 }
            }

            // Clean previous enrollment in this academic year if any
            if (targetClass.academicYearId) {
                await prisma.enrollment.deleteMany({
                    where: {
                        studentId: user.id,
                        class: { academicYearId: targetClass.academicYearId }
                    }
                });
            } else {
                await prisma.enrollment.deleteMany({
                    where: { studentId: user.id, classId: String(id) }
                });
            }

            await prisma.enrollment.create({
                data: {
                    studentId: user.id,
                    classId: String(id),
                    academicYearId: targetClass.academicYearId || null,
                    status: 'ACTIVE'
                }
            });
            enrolledCount++;
        }

        res.json({ message: "Import terminé avec succès", created: createdCount, enrolled: enrolledCount });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de l'import", error });
    }
};
