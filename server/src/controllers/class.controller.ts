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
  isActive: z.boolean().optional(),
});

const enrollStudentSchema = z.object({
  studentId: z.string(),
  classId: z.string(),
});

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const { name, niveauId, schoolId: bodySchoolId, isActive } = createClassSchema.parse(req.body);
    
    // Use bodySchoolId if provided and user is SUPER_ADMIN, otherwise use user's schoolId
    const schoolId = (req.user?.role === 'SUPER_ADMIN' && bodySchoolId) 
        ? bodySchoolId 
        : req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ message: "School ID required" });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        schoolId,
        niveauId: niveauId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: "Error creating class", error });
  }
};

// ... skip to updateClass ...

export const updateClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, niveauId, isActive } = createClassSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "Missing id" });

    const updatedClass = await prisma.class.update({
      where: { id: String(id) },
      data: {
        name,
        niveauId: niveauId || null,
        isActive: isActive !== undefined ? isActive : undefined,
      },
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
        niveau: true,
        _count: {
          select: { enrollments: true, courses: true },
        },
      },
    });

    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.json(cls);
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
        where.courses = {
            some: { teacherId: user.id }
        };
    } else if ((user?.role as string) === 'APPRENANT') {
        if (!user?.schoolId) return res.status(400).json({ message: "User not associated with a school" });
        where.schoolId = user.schoolId;
        where.enrollments = {
            some: { studentId: user.id }
        };
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        niveau: true,
        school: true,
        _count: {
          select: { enrollments: true, courses: true },
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
        // Secondary sort: alphabetical with numeric support (e.g. "6ème A" vs "6ème B")
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    res.json(sortedClasses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching classes", error });
  }
};

export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const { studentId, classId } = enrollStudentSchema.parse(req.body);

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId,
      },
    });

    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ message: "Error enrolling student", error });
  }
};

export const getClassStudents = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "Missing id" });
        
        const students = await prisma.enrollment.findMany({
            where: { classId: String(id) },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        res.json(students.map((e: any) => e.student));
    } catch (error) {
        res.status(500).json({ message: "Error fetching students", error });
    }
}


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

export const importStudents = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // classId
        if (!id) return res.status(400).json({ message: "Missing id" });

        const schoolId = req.user?.schoolId;

        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        // Use buffer since we are using memoryStorage
        if (!req.file.buffer) {
             return res.status(400).json({ message: "File buffer is empty" });
        }
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("Excel file is empty");
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("Sheet not found");
        const data = xlsx.utils.sheet_to_json(sheet) as any[];

        let createdCount = 0;
        let enrolledCount = 0;

        for (const row of data) {
            const firstName = row['Prénom'] || row['Prenom'] || row['firstname'] || row['First Name'];
            const lastName = row['Nom'] || row['lastname'] || row['Last Name'];

            if (!firstName || !lastName) continue;

            // Generate email: prenom.nom@ecole.com (simplified)
            const cleanFirstName = firstName.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanLastName = lastName.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
            let baseEmail = row['Email'] || row['email'] || row['Email Ecole'] || `${cleanFirstName}.${cleanLastName}@ecole.com`;
            
            // Check if user exists
            let user = await prisma.user.findUnique({ where: { email: baseEmail } });
            
            if (!user) {
                 // Generate random password
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
                    
                    // Simulate email sending
                    console.log(`[EMAIL ENVOYÉ] À : ${baseEmail}`);
                    console.log(`[EMAIL ENVOYÉ] Sujet : Bienvenue sur École Connectée`);
                    console.log(`[EMAIL ENVOYÉ] Message : Bonjour ${firstName},\nVotre compte a été créé. Voici vos identifiants :\nEmail: ${baseEmail}\nMot de passe: ${generatedPassword}`);
                    
                 } catch (e) {
                     console.log(`Skipping ${baseEmail} due to error`, e);
                     continue;
                 }
            }

            // Enroll in class
            const enrollment = await prisma.enrollment.findFirst({
                where: {
                    studentId: user.id,
                    classId: String(id)
                }
            });

            if (!enrollment) {
                await prisma.enrollment.create({
                    data: {
                        studentId: user.id,
                        classId: String(id)
                    }
                });
                enrolledCount++;
            }
        }

        res.json({ message: "Import terminé", created: createdCount, enrolled: enrolledCount });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de l'import", error });
    }
};

export const transferStudent = async (req: Request, res: Response) => {
    try {
        const { studentId, fromClassId, toClassId } = req.body;
        if (!studentId || !fromClassId || !toClassId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const enrollment = await prisma.enrollment.findFirst({
            where: { studentId, classId: fromClassId }
        });

        if (!enrollment) {
            return res.status(404).json({ message: "Enrollment not found in source class" });
        }

        // Check if already enrolled in target class
        const existingTargetEnrollment = await prisma.enrollment.findFirst({
            where: { studentId, classId: toClassId }
        });

        if (existingTargetEnrollment) {
            // Already there, just remove old enrollment
            await prisma.enrollment.delete({ where: { id: enrollment.id } });
            return res.json({ message: "Student was already in target class. Removed from old class." });
        }

        await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { classId: toClassId }
        });

        res.json({ message: "Student transferred successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error transferring student", error });
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
            // Explicitly check for 'Email Ecole' or 'Email'
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
            
            // Generate or validate email
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
