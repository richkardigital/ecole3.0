import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadToSupabase } from "../utils/supabase.js";

const createCourseSchema = z.object({
  classId: z.string(),
  subjectId: z.string(),
  teacherId: z.string(),
  coefficient: z.number().optional().default(1),
});

const createMaterialSchema = z.object({
  title: z.string(),
  type: z.string(),
  url: z.string(),
});

export const getLibrary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const schoolId = req.user?.schoolId;

    if (!userId || !role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let resources;

    const includeRelation = {
        course: {
            include: {
                class: true,
                subject: true,
                teacher: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        }
    };

    if ((role as string) === "ENSEIGNANT") {
      resources = await prisma.resource.findMany({
        where: {
            course: {
                teacherId: userId
            }
        },
        include: includeRelation.course.include ? includeRelation : undefined,
        orderBy: { createdAt: 'desc' }
      });
    } else if ((role as string) === "APPRENANT") {
      // Logic MVP: Access by Level
      // 1. Get student's enrollments to find their level(s)
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: userId },
        include: { class: true }
      });
      
      const levels = [...new Set(enrollments.map(e => e.class.niveauId).filter(l => l !== null))];
      const enrolledClassIds = enrollments.map(e => e.classId);

      resources = await prisma.resource.findMany({
        where: {
          course: {
            class: {
              OR: [
                // Option 1: Direct enrollment (Legacy/Fallback)
                { id: { in: enrolledClassIds } },
                // Option 2: Same level in same school
                {
                   niveauId: { in: levels as string[] },
                   schoolId: schoolId // Ensure same school
                }
              ]
            },
          },
        },
        include: includeRelation.course.include ? includeRelation : undefined,
        orderBy: { createdAt: 'desc' }
      });
    } else if ((role as string) === "DIRECTEUR" || (role as string) === "EDUCATEUR" || (role as string) === "EDUCATEUR") {
         if (!schoolId) return res.status(400).json({message: "No school ID"});
         resources = await prisma.resource.findMany({
            where: {
                course: {
                    class: {
                        schoolId: schoolId
                    }
                }
            },
            include: includeRelation.course.include ? includeRelation : undefined,
            orderBy: { createdAt: 'desc' }
         });
    } else {
        // Super Admin
        resources = await prisma.resource.findMany({
            include: includeRelation.course.include ? includeRelation : undefined,
            orderBy: { createdAt: 'desc' }
        });
    }

    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: "Error fetching library", error });
  }
};

export const getCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;
    const schoolId = req.user?.schoolId;

    if (!id) return res.status(400).json({ message: "ID required" });

    const course = await prisma.course.findUnique({
      where: { id: String(id) },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            niveauId: true,
            schoolId: true,
            school: {
              select: { name: true },
            },
          },
        },
        subject: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Access control
    if ((role as string) === 'ENSEIGNANT' && course.teacherId !== userId) {
        // Allow if teacher teaches this course
        // Already checked by id? No, ensure teacher owns it.
        // Actually, maybe allow viewing if they are in same school? 
        // For now, strict: only own courses.
        return res.status(403).json({ message: "Access denied" });
    }
    
    if ((role as string) === 'APPRENANT') {
        // Check enrollment
        const enrollment = await prisma.enrollment.findFirst({
            where: {
                studentId: userId,
                classId: course.classId
            }
        });
        if (!enrollment) return res.status(403).json({ message: "Not enrolled in this class" });
    }

    if ((role as string) === 'DIRECTEUR' || (role as string) === 'EDUCATEUR' || (role as string) === 'EDUCATEUR') {
        if (!schoolId) return res.status(400).json({ message: "No school ID" });
        if (course.class.schoolId !== schoolId) {
            return res.status(403).json({ message: "Ce cours n'appartient pas à votre école" });
        }
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course", error });
  }
};

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subjectId, teacherId, coefficient } = createCourseSchema.parse(req.body);

    let finalTeacherId = teacherId;
    if ((req.user?.role as string) === 'ENSEIGNANT') {
        finalTeacherId = req.user.id;
    }

    const course = await prisma.course.create({
      data: {
        classId,
        subjectId,
        teacherId: finalTeacherId,
        coefficient,
      },
    });

    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: "Error creating course", error });
  }
};

export const bulkAssignCourses = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId: bodySchoolId, teacherId, subjectId, classIds, coefficient } = req.body as {
      schoolId?: string;
      teacherId: string;
      subjectId: string;
      classIds: string[];
      coefficient?: number;
    };

    if (!teacherId || !subjectId || !Array.isArray(classIds) || classIds.length === 0) {
      return res.status(400).json({ message: "teacherId, subjectId et classIds sont requis" });
    }

    const role = req.user?.role;
    const userSchoolId = req.user?.schoolId || null;

    let effectiveSchoolId: string | null = null;

    if ((role as string) === "SUPER_ADMIN") {
      effectiveSchoolId = bodySchoolId || null;
    } else if ((role as string) === "DIRECTEUR" || (role as string) === "EDUCATEUR" || (role as string) === "EDUCATEUR") {
      effectiveSchoolId = userSchoolId;
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!effectiveSchoolId) {
      return res.status(400).json({ message: "Aucune école associée" });
    }

    const teacher = await prisma.user.findFirst({
      where: {
        id: teacherId,
        role: "ENSEIGNANT",
        schoolId: effectiveSchoolId
      }
    });

    if (!teacher) {
      return res.status(400).json({ message: "Enseignant invalide pour cette école" });
    }

    const classes = await prisma.class.findMany({
      where: {
        id: { in: classIds },
        schoolId: effectiveSchoolId
      },
      select: { id: true }
    });

    if (classes.length === 0) {
      return res.status(400).json({ message: "Aucune classe valide trouvée pour cette école" });
    }

    const validClassIds = classes.map(c => c.id);
    const coeff = typeof coefficient === "number" && coefficient > 0 ? coefficient : 1;

    const existingCourses = await prisma.course.findMany({
      where: {
        classId: { in: validClassIds },
        subjectId,
        teacherId
      },
      select: { classId: true }
    });

    const existingClassIds = new Set(existingCourses.map(c => c.classId));
    const classIdsToCreate = validClassIds.filter(id => !existingClassIds.has(id));

    if (classIdsToCreate.length === 0) {
      return res.status(200).json({ created: [], skipped: validClassIds });
    }

    const created = await prisma.$transaction(
      classIdsToCreate.map(classId =>
        prisma.course.create({
          data: {
            classId,
            subjectId,
            teacherId,
            coefficient: coeff
          }
        })
      )
    );

    res.status(201).json({ created, skipped: Array.from(existingClassIds) });
  } catch (error) {
    res.status(500).json({ message: "Error assigning courses", error });
  }
};

export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const schoolId = req.user?.schoolId;

    if (!userId || !role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let courses;

    if ((role as string) === "ENSEIGNANT") {
      courses = await prisma.course.findMany({
        where: { teacherId: userId },
        include: {
          class: true,
          subject: true,
          teacher: {
             select: {
                id: true,
                firstName: true,
                lastName: true
             }
          }
        },
      });
    } else if ((role as string) === "APPRENANT") {
      // Log for debugging
      console.log(`Fetching courses for student ${userId}`);
      courses = await prisma.course.findMany({
        where: {
          class: {
            enrollments: {
              some: {
                studentId: userId,
              },
            },
          },
        },
        include: {
          class: true, // Include class info for students too
          subject: true,
          teacher: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      console.log(`Found ${courses.length} courses for student ${userId}`);
    } else if (["DIRECTEUR", "EDUCATEUR", "EDUCATEUR"].includes(role)) {
        if (!schoolId) {
             return res.status(400).json({ message: "School ID not found for admin user" });
        }
        courses = await prisma.course.findMany({
            where: {
                class: {
                    schoolId: schoolId
                }
            },
            include: {
                class: true,
                subject: true,
                teacher: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        })
    } else if ((role as string) === "SUPER_ADMIN") {
        // Super admin sees everything
        courses = await prisma.course.findMany({
            include: {
                class: true,
                subject: true,
                teacher: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
    } else {
        // Unknown role or unauthorized
        return res.status(403).json({ message: "Access denied" });
    }

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses", error });
  }
};

export const createChapter = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, content } = req.body;

    if (!courseId || !title) return res.status(400).json({ message: "Course ID and Title required" });

    if ((req.user?.role as string) === "EDUCATEUR" || (req.user?.role as string) === "EDUCATEUR") {
      return res.status(403).json({ message: "Seuls les professeurs et les administrateurs d'école peuvent créer un chapitre" });
    }

    const course = await prisma.course.findUnique({
      where: { id: String(courseId) },
      include: { class: { select: { schoolId: true } } },
    });
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!course.class) return res.status(500).json({ message: "Cours invalide (classe manquante)" });

    if ((req.user?.role as string) === "ENSEIGNANT") {
      if (course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Vous ne pouvez créer un chapitre que pour vos propres cours" });
      }
    }

    if ((req.user?.role as string) === "DIRECTEUR") {
      if (!req.user.schoolId) return res.status(400).json({ message: "No school ID" });
      if (course.class.schoolId !== req.user.schoolId) {
        return res.status(403).json({ message: "Ce cours n'appartient pas à votre école" });
      }
    }

    const chapter = await prisma.chapter.create({
      data: {
        title,
        content: content || null,
        courseId: String(courseId)
      }
    });

    res.status(201).json(chapter);
  } catch (error) {
    console.error("Error creating chapter:", error);

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return res.status(500).json({
        message:
          "Connexion base de données impossible (Prisma). Vérifie DATABASE_URL sur Vercel et l'accès à Supabase.",
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021") {
        return res.status(500).json({
          message:
            "Base de données non à jour (table manquante). Applique les changements Prisma sur la DB de production (prisma db push / migrate).",
          code: error.code,
        });
      }

      if (error.code === "P2022") {
        return res.status(500).json({
          message:
            "Base de données non à jour (colonne manquante). Applique les changements Prisma sur la DB de production (prisma db push / migrate).",
          code: error.code,
        });
      }

      return res.status(500).json({
        message: "Erreur Prisma lors de la création du chapitre",
        code: error.code,
      });
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return res.status(500).json({ message: "Erreur Prisma (validation) lors de la création du chapitre" });
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return res.status(500).json({ message: "Erreur Prisma (requête inconnue) lors de la création du chapitre" });
    }

    res.status(500).json({ message: "Erreur serveur lors de la création du chapitre" });
  }
};

export const getCourseChapters = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // courseId
        if (!id) return res.status(400).json({ message: "ID required" });

        // Get chapters with resources
        const chapters = await prisma.chapter.findMany({
            where: { courseId: String(id) },
            include: {
                resources: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Get orphans resources (no chapter)
        const orphanMaterials = await prisma.resource.findMany({
            where: { 
                courseId: String(id),
                chapterId: null
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ chapters, orphanMaterials });
    } catch (error) {
        res.status(500).json({ message: "Error fetching course content", error });
    }
};

export const updateChapter = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // chapterId
    const { title, content } = req.body;

    if (!id) return res.status(400).json({ message: "ID required" });
    if (!title) return res.status(400).json({ message: "Title required" });

    if ((req.user?.role as string) === "EDUCATEUR" || (req.user?.role as string) === "EDUCATEUR") {
      return res.status(403).json({ message: "Access denied" });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: String(id) },
      include: {
        course: {
          include: { class: { select: { schoolId: true } } },
        },
      },
    });

    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (!chapter.course.class) return res.status(500).json({ message: "Cours invalide (classe manquante)" });

    if ((req.user?.role as string) === "ENSEIGNANT") {
      if (chapter.course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    if ((req.user?.role as string) === "DIRECTEUR") {
      if (!req.user.schoolId) return res.status(400).json({ message: "No school ID" });
      if (chapter.course.class.schoolId !== req.user.schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const updated = await prisma.chapter.update({
      where: { id: String(id) },
      data: {
        title,
        content: content || null,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating chapter:", error);
    res.status(500).json({ message: "Error updating chapter" });
  }
};

export const deleteChapter = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // chapterId
    if (!id) return res.status(400).json({ message: "ID required" });

    if ((req.user?.role as string) === "EDUCATEUR" || (req.user?.role as string) === "EDUCATEUR") {
      return res.status(403).json({ message: "Access denied" });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: String(id) },
      include: {
        course: {
          include: { class: { select: { schoolId: true } } },
        },
      },
    });

    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    if (!chapter.course.class) return res.status(500).json({ message: "Cours invalide (classe manquante)" });

    if ((req.user?.role as string) === "ENSEIGNANT") {
      if (chapter.course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    if ((req.user?.role as string) === "DIRECTEUR") {
      if (!req.user.schoolId) return res.status(400).json({ message: "No school ID" });
      if (chapter.course.class.schoolId !== req.user.schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    await prisma.$transaction([
      prisma.resource.updateMany({
        where: { chapterId: String(id) },
        data: { chapterId: null },
      }),
      prisma.chapter.delete({ where: { id: String(id) } }),
    ]);

    res.json({ message: "Chapter deleted" });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    res.status(500).json({ message: "Error deleting chapter" });
  }
};

export const addMaterial = async (req: AuthRequest, res: Response) => {
  try {
    if ((req.user?.role as string) === "EDUCATEUR") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params; // courseId
    // If file uploaded, url comes from file path
    let { title, type, url, source, chapterId } = req.body;

    if (req.file) {
        const publicUrl = await uploadToSupabase(req.file);
        if (publicUrl) {
            url = publicUrl;
        } else {
             return res.status(500).json({ message: "Failed to upload file" });
        }
        
        // If type not provided, deduce from mime type roughly or default to PDF
        if (!type) {
            if (req.file.mimetype.includes('video')) type = 'VIDEO';
            else type = 'PDF';
        }
    } else {
        // Validation for manual URL (if schema check is strict)
        // const { title, type, url } = createMaterialSchema.parse(req.body);
    }

    if (!title || !type || !url) {
        return res.status(400).json({ message: "Title, type and file/url are required" });
    }

    if (!id) return res.status(400).json({ message: "ID required" });

    // Verify teacher owns the course
    if ((req.user?.role as string) === "ENSEIGNANT") {
      const course = await prisma.course.findUnique({ where: { id: id as string } });
      if (!course || course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }
    if ((req.user?.role as string) === "DIRECTEUR") {
      if (!req.user.schoolId) return res.status(400).json({ message: "No school ID" });
      const course = await prisma.course.findUnique({
        where: { id: id as string },
        include: { class: { select: { schoolId: true } } },
      });
      if (!course || course.class.schoolId !== req.user.schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const material = await prisma.resource.create({
      data: {
        title,
        type,
        url,
        source: source || null,
        chapterId: chapterId || null,
        courseId: id as string,
      },
    });

    res.status(201).json(material);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding material", error });
  }
};

export const deleteMaterial = async (req: AuthRequest, res: Response) => {
  try {
    if ((req.user?.role as string) === "EDUCATEUR") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params; // materialId

    if (!id) return res.status(400).json({ message: "ID required" });

    const material = await prisma.resource.findUnique({
      where: { id: id as string },
      include: {
        course: {
          include: { class: { select: { schoolId: true } } },
        },
      },
    });

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    // Verify teacher owns the course
    if ((req.user?.role as string) === "ENSEIGNANT") {
      if (material.course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }
    if ((req.user?.role as string) === "DIRECTEUR") {
      if (!req.user.schoolId) return res.status(400).json({ message: "No school ID" });
      if (material.course.class.schoolId !== req.user.schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    await prisma.resource.delete({
      where: { id: id as string },
    });

    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting material", error });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ message: "ID required" });

    const course = await prisma.course.findUnique({
      where: { id: id as string },
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Verify permission (Teacher must own the course, or be Admin)
    if ((req.user?.role as string) === "ENSEIGNANT") {
      if (course.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (req.user?.role !== "SUPER_ADMIN" && req.user?.role !== "DIRECTEUR") {
        return res.status(403).json({ message: "Access denied" });
    }

    await prisma.course.delete({
      where: { id: id as string },
    });

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting course", error });
  }
};

export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // courseId
    
    if (!id) return res.status(400).json({ message: "ID required" });

    const resources = await prisma.resource.findMany({
      where: { courseId: id as string },
      orderBy: { createdAt: "desc" },
    });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: "Error fetching resources", error });
  }
};

export const getSharedSchools = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });
    if (!["APPRENANT", "ENSEIGNANT", "DIRECTEUR", "EDUCATEUR"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const schools = await prisma.school.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    res.json(schools);
  } catch (error) {
    res.status(500).json({ message: "Error fetching shared schools", error });
  }
};

export const getSharedSchoolClasses = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });
    if (!["APPRENANT", "ENSEIGNANT", "DIRECTEUR", "EDUCATEUR"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { schoolId } = req.params;
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const school = await prisma.school.findUnique({
      where: { id: String(schoolId) },
      select: { id: true, isActive: true },
    });
    if (!school || !school.isActive) return res.status(404).json({ message: "School not found" });

    const classes = await prisma.class.findMany({
      where: { schoolId: String(schoolId) },
      select: { id: true, name: true, niveauId: true },
      orderBy: [{ niveauId: "asc" }, { name: "asc" }],
    });

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching shared classes", error });
  }
};

export const getSharedMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });
    if (!["APPRENANT", "ENSEIGNANT", "DIRECTEUR", "EDUCATEUR"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const schoolId = String(req.query.schoolId || "").trim();
    const classId = String(req.query.classId || "").trim();
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "").trim();

    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, isActive: true },
    });
    if (!school || !school.isActive) return res.status(404).json({ message: "School not found" });

    const where: any = {
      course: {
        class: {
          schoolId,
        },
      },
    };

    if (classId && classId !== "ALL") {
      where.course.class.id = classId;
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { course: { subject: { name: { contains: q, mode: "insensitive" } } } },
        { course: { class: { name: { contains: q, mode: "insensitive" } } } },
        {
          course: {
            teacher: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    const resources = await prisma.resource.findMany({
      where,
      include: {
        course: {
          include: {
            class: {
              include: {
                school: { select: { id: true, name: true } },
              },
            },
            subject: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: "Error fetching shared resources", error });
  }
};
