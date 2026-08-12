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
        },
        niveau: true
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

    // Access control for viewing a course
    if ((role as string) === 'APPRENANT') {
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId: userId },
            include: { class: true }
        });
        
        const isEnrolledDirectly = enrollments.some(e => e.classId === course.classId);
        const hasMatchingNiveau = course.class?.niveauId && enrollments.some(e => e.class.niveauId === course.class?.niveauId);
        
        if (!isEnrolledDirectly && !hasMatchingNiveau) {
            return res.status(403).json({ message: "Ce cours ne correspond pas à votre niveau et vous n'y êtes pas inscrit." });
        }
    }
    // Teachers, Directors, Educators, and Super Admins can view ANY course details across the network
    // Note: Edit endpoints (POST/PUT/DELETE) have their own strict ownership checks.

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
    let schoolId = req.user?.schoolId;

    if (!userId || !role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Auto-lookup managed school for DIRECTEUR/EDUCATEUR if schoolId is missing
    if (["DIRECTEUR", "EDUCATEUR"].includes(role as string) && !schoolId) {
      const managedSchool = await prisma.school.findFirst({ where: { managerId: userId } });
      if (managedSchool) {
        schoolId = managedSchool.id;
      }
    }

    const courseInclude = {
      class: {
        include: {
          school: { select: { id: true, name: true, code: true } },
          academicYear: { select: { id: true, name: true, isCurrent: true } },
          niveau: true
        }
      },
      subject: true,
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      _count: {
        select: { chapters: true, assignments: true }
      }
    };

    let courses;

    const classIdFilter = req.query.classId ? { classId: String(req.query.classId) } : {};

    if ((role as string) === "SUPER_ADMIN") {
      courses = await prisma.course.findMany({
        where: classIdFilter,
        include: courseInclude
      });
    } else if (["DIRECTEUR", "EDUCATEUR"].includes(role as string)) {
      courses = await prisma.course.findMany({
        where: {
            ...classIdFilter,
            ...(schoolId ? { class: { schoolId } } : {})
        },
        include: courseInclude
      });
    } else if ((role as string) === "ENSEIGNANT") {
      courses = await prisma.course.findMany({
        where: {
          ...classIdFilter,
          teacherId: userId,
          ...(schoolId ? { class: { schoolId } } : {})
        },
        include: courseInclude
      });
    } else if ((role as string) === "APPRENANT") {
      courses = await prisma.course.findMany({
        where: {
          ...classIdFilter,
          AND: [
            {
              class: {
                academicYear: {
                  OR: [
                    { isCurrent: true },
                    { status: 'EN_COURS' }
                  ]
                }
              }
            },
            {
              OR: [
                {
                  class: {
                    enrollments: {
                      some: { studentId: userId }
                    }
                  }
                },
                ...(schoolId ? [{ class: { schoolId } }] : [])
              ]
            }
          ]
        },
        include: courseInclude
      });
    } else {
      courses = await prisma.course.findMany({
        include: courseInclude
      });
    }

    res.json(courses);
  } catch (error) {
    console.error("Error in getCourses:", error);
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
        const userId = req.user?.id;
        const role = req.user?.role as string;

        if (!id) return res.status(400).json({ message: "ID required" });

        // Get chapters with resources
        const chapters = await prisma.chapter.findMany({
            where: { courseId: String(id) },
            include: {
                resources: true,
                ...(role === 'APPRENANT' && userId ? {
                    progress: { where: { studentId: userId } }
                } : {})
            },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
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
        position: req.body.position !== undefined ? parseInt(req.body.position) : undefined,
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

export const updateMaterial = async (req: AuthRequest, res: Response) => {
  try {
    if ((req.user?.role as string) === "EDUCATEUR") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params; // materialId
    let { title, type, url, source, chapterId } = req.body;

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

    if (req.file) {
        const publicUrl = await uploadToSupabase(req.file);
        if (publicUrl) {
            url = publicUrl;
        } else {
             return res.status(500).json({ message: "Failed to upload file" });
        }
        
        if (!type) {
            if (req.file.mimetype.includes('video')) type = 'VIDEO';
            else type = 'PDF';
        }
    } else {
        url = url || material.url;
        type = type || material.type;
    }

    const updated = await prisma.resource.update({
      where: { id: String(id) },
      data: {
        title: title || material.title,
        type,
        url,
        source: source || null,
        chapterId: chapterId || null,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating material:", error);
    res.status(500).json({ message: "Error updating material" });
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

    let niveauId: string | null = null;
    if (role === "APPRENANT") {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: req.user?.id },
        include: { class: true }
      });
      if (enrollment?.class?.niveauId) {
        niveauId = enrollment.class.niveauId;
      }
    }

    const whereClause: any = { isActive: true };
    
    // We return all active schools for all roles, including APPRENANT.
    // They will filter classes inside the school later based on their niveau.

    const schools = await prisma.school.findMany({
      where: whereClause,
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
    if (!["APPRENANT", "ENSEIGNANT", "DIRECTEUR", "EDUCATEUR", "SUPER_ADMIN"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { schoolId } = req.params;
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const school = await prisma.school.findUnique({
      where: { id: String(schoolId) },
      select: { id: true, isActive: true },
    });
    if (!school || !school.isActive) return res.status(404).json({ message: "School not found" });

    let allowedNiveauIds: string[] | null = null;
    if (role === "APPRENANT") {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user?.id },
        include: { class: true }
      });
      allowedNiveauIds = [...new Set(enrollments.map(e => e.class.niveauId).filter(Boolean))] as string[];
    }

    const where: any = { schoolId: String(schoolId) };
    if (allowedNiveauIds) {
      if (allowedNiveauIds.length === 0) return res.json([]);
      where.niveauId = { in: allowedNiveauIds };
    }

    const classes = await prisma.class.findMany({
      where,
      select: { id: true, name: true, niveauId: true },
      orderBy: [{ niveauId: "asc" }, { name: "asc" }],
    });

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching shared classes", error });
  }
};

export const getSharedCourses = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });

    const schoolId = String(req.query.schoolId || "").trim();
    const classId = String(req.query.classId || "").trim();
    const niveauId = String(req.query.niveauId || "").trim();
    const q = String(req.query.q || "").trim();

    let allowedNiveauIds: string[] | null = null;
    if (role === "APPRENANT") {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user?.id },
        include: { class: true }
      });
      allowedNiveauIds = [...new Set(enrollments.map(e => e.class.niveauId).filter(Boolean))] as string[];
      
      if (allowedNiveauIds.length === 0) {
        return res.json([]);
      }
    }

    const where: any = {
      class: {
        academicYear: {
          isCurrent: true
        }
      }
    };

    if (schoolId && schoolId !== "ALL") {
      where.class.schoolId = schoolId;
    }
    
    if (classId && classId !== "ALL") {
      where.class.id = classId;
    }

    if (niveauId && niveauId !== "ALL") {
       if (allowedNiveauIds && !allowedNiveauIds.includes(niveauId)) {
           return res.json([]);
       }
       where.class.niveauId = niveauId;
    } else if (allowedNiveauIds) {
       where.class.niveauId = { in: allowedNiveauIds };
    }

    if (q) {
      where.OR = [
        { subject: { name: { contains: q } } },
        { class: { name: { contains: q } } }
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        class: {
          include: {
            school: { select: { id: true, name: true, code: true, logoUrl: true } },
            niveau: { select: { id: true, nom: true } }
          }
        },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { chapters: true, resources: true } }
      },
      orderBy: [
        { subject: { name: "asc" } },
        { class: { name: "asc" } }
      ]
    });

    console.log(`[getSharedCourses] returning ${courses.length} courses for user ${req.user?.id} with role ${role}. Query params: schoolId=${schoolId}, niveauId=${niveauId}, classId=${classId}`);
    res.json(courses);
  } catch (error: any) {
    console.error("[getSharedCourses] Error:", error.message);
    res.status(500).json({ message: "Error fetching shared courses", error });
  }
};

export const getSharedMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });
    if (!["SUPER_ADMIN", "APPRENANT", "ENSEIGNANT", "DIRECTEUR", "EDUCATEUR"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const schoolId = String(req.query.schoolId || "").trim();
    const classId = String(req.query.classId || "").trim();
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "").trim();

    if (schoolId && schoolId !== "ALL") {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, isActive: true },
        });
        if (!school || !school.isActive) return res.status(404).json({ message: "School not found" });
    }

    let userNiveauId: string | null = null;
    if (role === "APPRENANT") {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: req.user?.id },
        include: { class: true }
      });
      if (enrollment?.class?.niveauId) {
        userNiveauId = enrollment.class.niveauId;
      }
    }

    const where: any = {
      course: {
        class: {
          ...(schoolId ? { schoolId } : {}),
          ...(userNiveauId ? { niveauId: userNiveauId } : {})
        },
      },
    };

    if (classId && classId !== "ALL" && role !== "APPRENANT") {
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

export const toggleChapterProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // chapterId
    const userId = req.user?.id;
    const role = req.user?.role as string;
    const { completed } = req.body;

    if (!userId || role !== "APPRENANT") return res.status(403).json({ message: "Seuls les apprenants peuvent marquer un chapitre" });
    if (!id) return res.status(400).json({ message: "ID required" });

    // Verify access
    const chapter = await prisma.chapter.findUnique({
      where: { id: String(id) },
      include: { course: true }
    });
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: userId, classId: chapter.course.classId }
    });
    if (!enrollment) return res.status(403).json({ message: "Non inscrit à ce cours" });

    let progress = await prisma.chapterProgress.findUnique({
      where: { studentId_chapterId: { studentId: userId, chapterId: id } }
    });

    if (progress) {
      progress = await prisma.chapterProgress.update({
        where: { id: progress.id },
        data: { completed: Boolean(completed), completedAt: completed ? new Date() : null }
      });
    } else {
      progress = await prisma.chapterProgress.create({
        data: {
          studentId: userId,
          chapterId: id,
          completed: Boolean(completed),
          completedAt: completed ? new Date() : null
        }
      });
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour de la progression", error });
  }
};

export const getCourseStats = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // courseId
    const userId = req.user?.id;
    const role = req.user?.role as string;

    const course = await prisma.course.findUnique({
      where: { id: String(id) },
      include: { class: { include: { enrollments: true } }, _count: { select: { chapters: true } } }
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    if (role === "ENSEIGNANT" && course.teacherId !== userId) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const totalStudents = course.class.enrollments.length;
    const totalChapters = course._count.chapters;

    // Get progress for this course's chapters
    const progressList = await prisma.chapterProgress.findMany({
      where: { chapter: { courseId: String(id) }, completed: true }
    });

    res.json({
      totalStudents,
      totalChapters,
      totalProgressMarked: progressList.length,
      averageProgress: totalStudents > 0 && totalChapters > 0 ? (progressList.length / (totalStudents * totalChapters)) * 100 : 0
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des stats", error });
  }
};

// =============================================
// PUBLISH COURSE — Publication avec propagation CNED
// =============================================

import { propagateCourse } from "../services/propagation.js";

export const publishCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isPublished, scope, niveauId, schoolId: bodySchoolId } = req.body;
    const role = req.user?.role as string;

    const course = await prisma.course.findUnique({ where: { id: String(id) } });
    if (!course) return res.status(404).json({ message: "Cours non trouvé" });

    // Seul SUPER_ADMIN peut publier un cours de niveau NIVEAU
    const effectiveScope = scope || course.scope || "CLASSE";
    if (effectiveScope === "NIVEAU" && role !== "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Seul le Super Administrateur peut publier des cours au niveau."
      });
    }

    const updated = await prisma.course.update({
      where: { id: String(id) },
      data: {
        isPublished: Boolean(isPublished),
        scope: effectiveScope as any,
        niveauId: niveauId || course.niveauId || null,
        schoolId: bodySchoolId || course.schoolId || req.user?.schoolId || null
      }
    });

    // Propagation automatique si publication déclenchée
    let propagatedCount = 0;
    if (isPublished) {
      try {
        propagatedCount = await propagateCourse(String(id));

        await prisma.auditLog.create({
          data: {
            userId: req.user?.id,
            action: "PUBLIE_COURS",
            entity: "Course",
            entityId: String(id),
            metadata: JSON.stringify({
              scope: effectiveScope,
              propagatedTo: propagatedCount,
              publishedAt: new Date().toISOString()
            })
          }
        });
      } catch (propagationError) {
        console.error("Course propagation error:", propagationError);
        // Ne pas bloquer la publication
      }
    }

    res.json({ ...updated, propagatedTo: propagatedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la publication du cours", error });
  }
};
