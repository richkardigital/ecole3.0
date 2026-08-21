
import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadToSupabase } from "../utils/supabase.js";

const createCourseSchema = z.object({
  academicYearId: z.string().optional().nullable(),
  niveauId: z.string(),
  subjectId: z.string(),
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
        subject: {
            select: {
                id: true,
                name: true,
                code: true,
                imageUrl: true
            }
        },
        niveau: true,
        createdBy: {
            select: {
                id: true,
                firstName: true,
                lastName: true
            }
        }
    };

    if ((role as string) === "ENSEIGNANT") {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: userId },
        include: { class: true }
      });
      const niveauIds = Array.from(new Set(teacherClasses.map(tc => tc.class?.niveauId).filter((n): n is string => Boolean(n))));
      resources = await prisma.resource.findMany({
        where: {
          OR: [
            { createdById: userId },
            { niveauId: { in: niveauIds } },
            { course: { niveauId: { in: niveauIds } } }
          ]
        },
        include: includeRelation.course.include ? includeRelation : undefined,
        orderBy: { createdAt: 'desc' }
      });
    } else if ((role as string) === "APPRENANT") {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: userId },
        include: { class: true }
      });
      
      const levels = Array.from(new Set(enrollments.map(e => e.class?.niveauId).filter((n): n is string => Boolean(n))));

      resources = await prisma.resource.findMany({
        where: {
          OR: [
            { niveauId: { in: levels } },
            { course: { niveauId: { in: levels } } },
            ...(schoolId ? [{ schoolId }] : [])
          ]
        },
        include: includeRelation.course.include ? includeRelation : undefined,
        orderBy: { createdAt: 'desc' }
      });
    } else if ((role as string) === "DIRECTEUR" || (role as string) === "EDUCATEUR") {
         resources = await prisma.resource.findMany({
            where: {
                OR: [
                    ...(schoolId ? [{ schoolId }] : []),
                    { isGlobal: true },
                    { scope: "NIVEAU" }
                ]
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
        niveau: true,
        subject: true,
        academicYear: { select: { id: true, name: true, isCurrent: true } }
      }
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course", error });
  }
};

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { academicYearId, niveauId, subjectId, coefficient } = createCourseSchema.parse(req.body);

    const course = await prisma.course.create({
      data: {
        academicYearId: academicYearId || null,
        niveauId,
        subjectId,
        coefficient,
        scope: 'NIVEAU',
      },
      include: {
        niveau: true,
        subject: true,
        academicYear: { select: { id: true, name: true, isCurrent: true } }
      }
    });

    res.status(201).json(course);
  } catch (error: any) {
    console.error("CREATE COURSE ERROR:", error);
    if (error.code === 'P2002') {
        return res.status(400).json({ message: "Un cours existe déjà pour cette matière et ce niveau." });
    }
    if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Données invalides. Veuillez vérifier le formulaire.", error: error.errors });
    }
    res.status(500).json({ message: "Erreur lors de la création du cours", error });
  }
};


export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const courseInclude = {
      niveau: true,
      subject: true,
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      _count: {
        select: { chapters: true, assignments: true }
      }
    };

    let courses;

    if (role === "SUPER_ADMIN") {
      courses = await prisma.course.findMany({
        include: courseInclude
      });
    } else if (role === "DIRECTEUR" || role === "EDUCATEUR") {
      const schoolId = req.user?.schoolId;
      if (schoolId) {
        const schoolClasses = await prisma.class.findMany({
          where: { schoolId },
          select: { niveauId: true }
        });
        const niveauIds = Array.from(new Set(schoolClasses.map(c => c.niveauId).filter((id): id is string => Boolean(id))));
        courses = await prisma.course.findMany({
          where: niveauIds.length > 0 ? { niveauId: { in: niveauIds } } : undefined,
          include: courseInclude
        });
      } else {
        courses = await prisma.course.findMany({
          include: courseInclude
        });
      }
    } else if (role === "ENSEIGNANT") {
      // Uniquement les cours pour lesquels le professeur a été assigné par le directeur (TeacherClass)
      const teacherAssignments = await prisma.teacherClass.findMany({
        where: { teacherId: userId },
        include: { class: { select: { niveauId: true } } }
      });

      const orConditions = teacherAssignments
        .filter(ta => ta.subjectId && ta.class?.niveauId)
        .map(ta => ({
          subjectId: ta.subjectId,
          niveauId: ta.class.niveauId
        }));

      if (orConditions.length === 0) {
        courses = [];
      } else {
        courses = await prisma.course.findMany({
          where: { OR: orConditions },
          include: courseInclude
        });
      }
    } else if (role === "APPRENANT") {
      // Uniquement les cours correspondant au niveau de la classe active de l'élève
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: userId },
        select: { class: { select: { niveauId: true } }, status: true }
      });

      const activeNiveaux = enrollments
        .filter(e => e.status === "ACTIVE" && e.class?.niveauId)
        .map(e => e.class.niveauId as string);

      const finalNiveaux = activeNiveaux.length > 0 
        ? activeNiveaux 
        : (enrollments.map(e => e.class?.niveauId).filter((id): id is string => Boolean(id)) as string[]);

      if (finalNiveaux.length === 0) {
        courses = [];
      } else {
        courses = await prisma.course.findMany({
          where: { niveauId: { in: finalNiveaux } },
          include: courseInclude
        });
      }
    } else if (role === "PARENT") {
      const parentChildren = await prisma.parentChild.findMany({
        where: { parentId: userId },
        select: { studentId: true }
      });
      const childIds = parentChildren.map(c => c.studentId);
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: { in: childIds } },
        select: { class: { select: { niveauId: true } } }
      });
      const childNiveaux = Array.from(new Set(enrollments.map(e => e.class?.niveauId).filter((id): id is string => Boolean(id))));

      courses = await prisma.course.findMany({
        where: childNiveaux.length > 0 ? { niveauId: { in: childNiveaux } } : undefined,
        include: courseInclude
      });
    } else {
      courses = await prisma.course.findMany({
        include: courseInclude
      });
    }

    const courseSubjectIds: string[] = Array.from(new Set(courses.map((c: any) => String(c.subjectId))));
    const courseNiveauIds: string[] = Array.from(new Set(courses.map((c: any) => String(c.niveauId))));

    const teacherClasses = await prisma.teacherClass.findMany({
      where: {
        subjectId: { in: courseSubjectIds },
        class: { niveauId: { in: courseNiveauIds } }
      },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, matricule: true, avatarUrl: true }
        },
        class: {
          select: { id: true, name: true, niveauId: true, school: { select: { id: true, name: true, code: true, ville: true } } }
        }
      }
    });

    const classesForSchools = await prisma.class.findMany({
      where: { niveauId: { in: courseNiveauIds } },
      select: { niveauId: true, schoolId: true }
    });

    const niveauSchoolsMap = new Map<string, Set<string>>();
    classesForSchools.forEach(c => {
        if (!c.niveauId || !c.schoolId) return;
        if (!niveauSchoolsMap.has(c.niveauId)) niveauSchoolsMap.set(c.niveauId, new Set());
        niveauSchoolsMap.get(c.niveauId)!.add(c.schoolId);
    });

    const coursesWithTeachers = courses.map((course: any) => {
      const matchingTeachersMap = new Map<string, any>();
      teacherClasses.forEach((tc: any) => {
        if (tc.subjectId === course.subjectId && tc.class?.niveauId === course.niveauId && tc.teacher) {
          if (!matchingTeachersMap.has(tc.teacher.id)) {
            matchingTeachersMap.set(tc.teacher.id, {
              ...tc.teacher,
              classes: [tc.class?.name].filter(Boolean),
              schools: tc.class?.school ? [tc.class.school] : []
            });
          } else {
            const existing = matchingTeachersMap.get(tc.teacher.id);
            if (tc.class?.name && !existing.classes.includes(tc.class.name)) {
              existing.classes.push(tc.class.name);
            }
            if (tc.class?.school && !existing.schools.some((s: any) => s.id === tc.class.school.id)) {
              existing.schools.push(tc.class.school);
            }
          }
        }
      });
      const teachersList = Array.from(matchingTeachersMap.values());
      return {
        ...course,
        teachers: teachersList,
        teachersCount: teachersList.length,
        schoolsCount: niveauSchoolsMap.get(course.niveauId)?.size || 0
      };
    });

    res.json(coursesWithTeachers);
  } catch (error) {
    console.error("Error in getCourses:", error);
    res.status(500).json({ message: "Error fetching courses", error });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { academicYearId, subjectId, niveauId, coefficient, isPublished } = req.body;

    const course = await prisma.course.findUnique({ where: { id: String(id) } });
    if (!course) return res.status(404).json({ message: "Cours non trouvé" });

    const updated = await prisma.course.update({
      where: { id: String(id) },
      data: {
        ...(academicYearId ? { academicYearId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(niveauId ? { niveauId } : {}),
        ...(typeof coefficient === 'number' && coefficient > 0 ? { coefficient } : {}),
        ...(typeof isPublished === 'boolean' ? { isPublished } : {})
      },
      include: {
        niveau: true,
        subject: true,
        academicYear: { select: { id: true, name: true, isCurrent: true } }
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating course", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "Un cours existe déjà pour cette matière et ce niveau." });
    }
    res.status(500).json({ message: "Erreur lors de la modification du cours", error });
  }
};

export const createChapter = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, content, termId } = req.body;

    if (!courseId || !title) return res.status(400).json({ message: "Course ID and Title required" });

    const course = await prisma.course.findUnique({
      where: { id: String(courseId) }
    });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const chapter = await prisma.chapter.create({
      data: {
        title,
        content: content || null,
        courseId: String(courseId),
        termId: termId || null
      },
      include: {
        term: { select: { id: true, name: true } }
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
                term: { select: { id: true, name: true } },
                resources: true,
                exercises: {
                    include: {
                        _count: { select: { questions: true } },
                        createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
                        ...(role === 'APPRENANT' && userId ? {
                            submissions: { where: { studentId: userId }, select: { id: true, score: true, maxScore: true } }
                        } : {})
                    },
                    orderBy: { createdAt: 'asc' }
                },
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
    const { title, content, termId } = req.body;

    if (!id) return res.status(400).json({ message: "ID required" });
    if (!title) return res.status(400).json({ message: "Title required" });

    if ((req.user?.role as string) === "EDUCATEUR" || (req.user?.role as string) === "APPRENANT" || (req.user?.role as string) === "PARENT") {
      return res.status(403).json({ message: "Access denied" });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: String(id) },
      include: {
        course: true,
      },
    });

    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    const updated = await prisma.chapter.update({
      where: { id: String(id) },
      data: {
        title,
        content: content || null,
        termId: termId || null,
        position: req.body.position !== undefined ? parseInt(req.body.position) : undefined,
      },
      include: {
        term: { select: { id: true, name: true } }
      }
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

    if ((req.user?.role as string) === "EDUCATEUR" || (req.user?.role as string) === "APPRENANT" || (req.user?.role as string) === "PARENT") {
      return res.status(403).json({ message: "Access denied" });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: String(id) },
      include: {
        course: true,
      },
    });

    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    await prisma.$transaction([
      prisma.resource.deleteMany({
        where: { chapterId: String(id) },
      }),
      prisma.chapterProgress.deleteMany({
        where: { chapterId: String(id) },
      }),
      prisma.chapter.delete({ where: { id: String(id) } }),
    ]);

    res.json({ message: "Chapter deleted" });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    res.status(500).json({ message: "Error deleting chapter" });
  }
};

const normalizeResourceType = (typeStr?: string, mimeType?: string, fileUrl?: string): "PDF" | "VIDEO" | "AUDIO" | "IMAGE" | "LIEN" => {
  const t = (typeStr || "").toUpperCase().trim();
  if (t === "LINK" || t === "LIEN" || t === "URL" || t === "WEB") return "LIEN";
  if (t === "VIDEO" || t === "VIDÉO" || t === "YOUTUBE" || t === "VIMEO") return "VIDEO";
  if (t === "AUDIO" || t === "MP3" || t === "VOCAL" || t === "VOICE") return "AUDIO";
  if (t === "IMAGE" || t === "PHOTO" || t === "PNG" || t === "JPG" || t === "JPEG" || t === "SVG") return "IMAGE";
  
  if (mimeType) {
    if (mimeType.includes("video")) return "VIDEO";
    if (mimeType.includes("audio")) return "AUDIO";
    if (mimeType.includes("image")) return "IMAGE";
  }

  if (fileUrl) {
    const lower = fileUrl.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com') || lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mkv')) {
      return "VIDEO";
    }
    if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.endsWith('.m4a')) {
      return "AUDIO";
    }
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.svg')) {
      return "IMAGE";
    }
  }
  
  return "PDF";
};

export const addMaterial = async (req: AuthRequest, res: Response) => {
  try {
    if ((req.user?.role as string) === "EDUCATEUR" || (req.user?.role as string) === "APPRENANT" || (req.user?.role as string) === "PARENT") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params; // courseId
    let { title, type, url, source, chapterId } = req.body;

    if (req.file) {
      const publicUrl = await uploadToSupabase(req.file);
      if (publicUrl) {
        url = publicUrl;
      } else {
        return res.status(500).json({ message: "Échec du téléversement du fichier sur le serveur." });
      }
    }

    const finalType = normalizeResourceType(type, req.file?.mimetype, url);

    if (!title || !url) {
      return res.status(400).json({ message: "Le titre et le fichier/lien sont obligatoires." });
    }

    if (!id) return res.status(400).json({ message: "ID cours manquant" });

    const course = await prisma.course.findUnique({ where: { id: id as string } });
    if (!course) {
      return res.status(404).json({ message: "Cours introuvable" });
    }

    const material = await prisma.resource.create({
      data: {
        title,
        type: finalType,
        url,
        source: source || null,
        chapterId: chapterId && String(chapterId).trim() !== "" ? String(chapterId).trim() : null,
        courseId: id as string,
        niveauId: course.niveauId || null,
        subjectId: course.subjectId || null,
        createdById: req.user?.id || null,
      },
    });

    res.status(201).json(material);
  } catch (error: any) {
    console.error("Error adding material:", error);
    res.status(500).json({ message: error.message || "Erreur lors de l'ajout du support de cours" });
  }
};

export const updateMaterial = async (req: AuthRequest, res: Response) => {
  try {
    if ((req.user?.role as string) === "EDUCATEUR" || (req.user?.role as string) === "APPRENANT" || (req.user?.role as string) === "PARENT") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params; // materialId
    let { title, type, url, source, chapterId } = req.body;

    if (!id) return res.status(400).json({ message: "ID support manquant" });

    const material = await prisma.resource.findUnique({
      where: { id: id as string },
      include: {
        course: true,
      },
    });

    if (!material) {
      return res.status(404).json({ message: "Support introuvable" });
    }

    if (req.file) {
      const publicUrl = await uploadToSupabase(req.file);
      if (publicUrl) {
        url = publicUrl;
      } else {
        return res.status(500).json({ message: "Échec du téléversement du fichier." });
      }
    } else {
      url = url || material.url;
    }

    const finalType = type ? normalizeResourceType(type, req.file?.mimetype, url) : material.type;

    const updated = await prisma.resource.update({
      where: { id: String(id) },
      data: {
        title: title || material.title,
        type: finalType,
        url,
        source: source || null,
        chapterId: chapterId !== undefined ? (chapterId && String(chapterId).trim() !== "" ? String(chapterId).trim() : null) : material.chapterId,
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating material:", error);
    res.status(500).json({ message: error.message || "Erreur lors de la modification du support" });
  }
};

export const deleteMaterial = async (req: AuthRequest, res: Response) => {
  try {
    if ((req.user?.role as string) === "EDUCATEUR" || (req.user?.role as string) === "APPRENANT" || (req.user?.role as string) === "PARENT") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params; // materialId

    if (!id) return res.status(400).json({ message: "ID required" });

    const material = await prisma.resource.findUnique({
      where: { id: id as string },
    });

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
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

    if (req.user?.role !== "SUPER_ADMIN" && req.user?.role !== "DIRECTEUR" && req.user?.role !== "ENSEIGNANT") {
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
    const niveauId = String(req.query.niveauId || "").trim();
    const termId = String(req.query.termId || "").trim();
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
      isPublished: true
    };

    if (niveauId && niveauId !== "ALL") {
       if (allowedNiveauIds && !allowedNiveauIds.includes(niveauId)) {
           return res.json([]);
       }
       where.niveauId = niveauId;
    } else if (allowedNiveauIds) {
       where.niveauId = { in: allowedNiveauIds };
    }

    if (termId && termId !== "ALL") {
      where.chapters = { some: { termId } };
    }

    if (q) {
      where.OR = [
        { subject: { name: { contains: q, mode: 'insensitive' } } },
        { niveau: { nom: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        niveau: { select: { id: true, nom: true } },
        subject: { select: { id: true, name: true, code: true, imageUrl: true } },
        academicYear: { select: { id: true, name: true } },
        chapters: {
          select: {
            id: true,
            title: true,
            termId: true,
            term: { select: { id: true, name: true } },
            _count: { select: { resources: true, exercises: true } }
          }
        },
        _count: { select: { chapters: true, assignments: true, resources: true } }
      },
      orderBy: [
        { subject: { name: "asc" } }
      ]
    });

    // Calculate total exercises count per course
    const enriched = courses.map(c => {
      const totalExercises = c.chapters.reduce((sum, ch) => sum + (ch._count?.exercises || 0), 0);
      const totalResources = c.chapters.reduce((sum, ch) => sum + (ch._count?.resources || 0), 0) + (c._count?.resources || 0);
      return {
        ...c,
        totalExercises,
        totalResources
      };
    });

    res.json(enriched);
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
        isPublished: true,
        ...(userNiveauId ? { niveauId: userNiveauId } : {})
      },
    };

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { course: { subject: { name: { contains: q, mode: "insensitive" } } } },
        { course: { niveau: { nom: { contains: q, mode: "insensitive" } } } }
      ];
    }

    const resources = await prisma.resource.findMany({
      where,
      include: {
        course: {
          include: {
            niveau: { select: { id: true, nom: true } },
            subject: { select: { id: true, name: true, code: true } }
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
      where: { studentId: userId, class: { niveauId: chapter.course.niveauId } }
    });
    if (!enrollment) return res.status(403).json({ message: "Non inscrit à ce cours" });

    const chapterId = String(id);
    let progress = await prisma.chapterProgress.findUnique({
      where: { studentId_chapterId: { studentId: userId, chapterId } }
    });

    // Règle métier : une fois coché/validé par l'apprenant, il ne peut plus le décocher
    if (progress && progress.completed && req.user?.role === 'APPRENANT') {
      return res.json(progress);
    }

    if (progress) {
      progress = await prisma.chapterProgress.update({
        where: { id: progress.id },
        data: { completed: true, completedAt: new Date() }
      });
    } else {
      progress = await prisma.chapterProgress.create({
        data: {
          studentId: userId,
          chapterId: chapterId,
          completed: true,
          completedAt: new Date()
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
      include: { _count: { select: { chapters: true } } }
    });

    if (!course) return res.status(404).json({ message: "Course not found" });

    const totalStudents = await prisma.enrollment.count({
      where: {
        class: { niveauId: course.niveauId },
        status: 'ACTIVE'
      }
    });
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
    const { isPublished, scope, niveauId } = req.body;
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
        niveauId: niveauId || course.niveauId || undefined,
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

export const getCourseSchools = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({ where: { id: String(id) } });
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Fetch unique schools that have classes in this course's niveau
    const classes = await prisma.class.findMany({
      where: {
        niveauId: course.niveauId,
        ...(req.user?.role === 'DIRECTEUR' && req.user.schoolId ? { schoolId: req.user.schoolId } : {})
      },
      include: {
        school: {
          select: { id: true, name: true, code: true, ville: true, address: true, phone: true, email: true }
        },
        _count: { select: { enrollments: true } }
      }
    });

    const schoolsMap = new Map<string, any>();
    classes.forEach(cls => {
      if (cls.school) {
        if (!schoolsMap.has(cls.school.id)) {
          schoolsMap.set(cls.school.id, {
            ...cls.school,
            classCount: 1,
            classes: [cls.name],
            studentCount: cls._count.enrollments
          });
        } else {
          const s = schoolsMap.get(cls.school.id);
          s.classCount += 1;
          if (!s.classes.includes(cls.name)) {
            s.classes.push(cls.name);
          }
          s.studentCount += cls._count.enrollments;
        }
      }
    });

    res.json(Array.from(schoolsMap.values()));
  } catch (error) {
    res.status(500).json({ message: "Error fetching course schools", error });
  }
};

export const getCourseStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id: String(id) },
      include: {
        subject: true,
        niveau: true,
        chapters: { select: { id: true, title: true, termId: true } }
      }
    });
    if (!course) return res.status(404).json({ message: "Course not found" });

    const totalChaptersCount = course.chapters.length;

    // Fetch students enrolled in classes that have the course's niveau
    const enrollments = await prisma.enrollment.findMany({
      where: {
        class: {
          niveauId: course.niveauId,
          ...(req.user?.role === 'DIRECTEUR' && req.user.schoolId ? { schoolId: req.user.schoolId } : {})
        },
        status: 'ACTIVE'
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            email: true,
            phone: true,
            avatarUrl: true,
            chapterProgress: {
              where: {
                chapter: { courseId: course.id },
                completed: true
              },
              select: { chapterId: true, completedAt: true }
            },
            grades: {
              where: {
                courseId: course.id
              },
              include: {
                assignment: {
                  select: { id: true, title: true, type: true, points: true, coefficient: true, dueDate: true }
                },
                term: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            school: { select: { id: true, name: true, code: true, ville: true } }
          }
        }
      }
    });

    const studentsWithStats = enrollments.map(enr => {
      const s = enr.student;
      const completedCount = s.chapterProgress ? s.chapterProgress.length : 0;
      const progressPercent = totalChaptersCount > 0
        ? Math.round((completedCount / totalChaptersCount) * 100)
        : 0;

      // Calcul des moyennes par trimestre
      const termGradesMap: { [termId: string]: { totalPoints: number; totalCoef: number; grades: any[] } } = {};
      let totalCourseWeighted = 0;
      let totalCourseCoef = 0;

      (s.grades || []).forEach(g => {
        const tid = g.termId || g.term?.id || 'DEFAULT';
        if (!termGradesMap[tid]) {
          termGradesMap[tid] = { totalPoints: 0, totalCoef: 0, grades: [] };
        }
        const coef = g.coefficient || g.assignment?.coefficient || 1;
        termGradesMap[tid].totalPoints += g.value * coef;
        termGradesMap[tid].totalCoef += coef;
        termGradesMap[tid].grades.push(g);

        totalCourseWeighted += g.value * coef;
        totalCourseCoef += coef;
      });

      const termAverages: { [termId: string]: number } = {};
      Object.keys(termGradesMap).forEach(tid => {
        const item = termGradesMap[tid];
        termAverages[tid] = item.totalCoef > 0 ? Number((item.totalPoints / item.totalCoef).toFixed(2)) : 0;
      });

      const overallAverage = totalCourseCoef > 0 ? Number((totalCourseWeighted / totalCourseCoef).toFixed(2)) : null;

      return {
        id: enr.id,
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        matricule: s.matricule || 'N/A',
        email: s.email,
        phone: s.phone,
        avatarUrl: s.avatarUrl,
        classId: enr.class?.id,
        className: enr.class?.name,
        school: enr.class?.school,
        completedChaptersCount: completedCount,
        totalChaptersCount,
        participationRate: progressPercent,
        grades: s.grades || [],
        termAverages,
        overallAverage
      };
    });

    res.json(studentsWithStats);
  } catch (error) {
    console.error("Error fetching course students:", error);
    res.status(500).json({ message: "Error fetching course students", error });
  }
};

export const getCourseTeachers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({ where: { id: String(id) } });
    if (!course) return res.status(404).json({ message: "Course not found" });

    // 1. If APPRENANT, first check teacher assigned directly to their enrolled class
    if (req.user?.role === 'APPRENANT') {
      const studentEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: req.user.id, status: 'ACTIVE' },
        include: { class: { include: { school: true } } }
      });

      if (studentEnrollment?.classId) {
        const myClassTeacher = await prisma.teacherClass.findFirst({
          where: {
            subjectId: course.subjectId,
            classId: studentEnrollment.classId
          },
          include: {
            teacher: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true, matricule: true, avatarUrl: true }
            },
            class: {
              select: { id: true, name: true, school: { select: { id: true, name: true, code: true, ville: true } } }
            }
          }
        });

        if (myClassTeacher?.teacher) {
          return res.json([{
            ...myClassTeacher.teacher,
            isMyTeacher: true,
            classes: [myClassTeacher.class?.name || studentEnrollment.class?.name].filter(Boolean),
            schools: myClassTeacher.class?.school ? [myClassTeacher.class.school] : (studentEnrollment.class?.school ? [studentEnrollment.class.school] : [])
          }]);
        }
      }
    }

    // 2. Fetch teachers assigned to this niveau and subject
    const whereClause: any = {
      subjectId: course.subjectId,
      class: {
        niveauId: course.niveauId,
        ...(req.user?.schoolId ? { schoolId: req.user.schoolId } : {})
      }
    };

    let teacherClasses = await prisma.teacherClass.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, matricule: true, avatarUrl: true }
        },
        class: {
          select: { id: true, name: true, school: { select: { id: true, name: true, code: true, ville: true } } }
        }
      }
    });

    // 3. Fallback: Check without school restriction for this subject & niveau
    if (teacherClasses.length === 0) {
      teacherClasses = await prisma.teacherClass.findMany({
        where: {
          subjectId: course.subjectId,
          class: { niveauId: course.niveauId }
        },
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, matricule: true, avatarUrl: true }
          },
          class: {
            select: { id: true, name: true, school: { select: { id: true, name: true, code: true, ville: true } } }
          }
        }
      });
    }

    // 4. Fallback: If still no teacher assigned via TeacherClass, find any active teacher in user school or system
    if (teacherClasses.length === 0) {
      const fallbackTeacher = await prisma.user.findFirst({
        where: {
          role: 'ENSEIGNANT',
          ...(req.user?.schoolId ? { schoolId: req.user.schoolId } : {})
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          matricule: true,
          avatarUrl: true,
          school: { select: { id: true, name: true, code: true, ville: true } }
        }
      }) || await prisma.user.findFirst({
        where: { role: 'ENSEIGNANT' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          matricule: true,
          avatarUrl: true,
          school: { select: { id: true, name: true, code: true, ville: true } }
        }
      });

      if (fallbackTeacher) {
        return res.json([{
          ...fallbackTeacher,
          classes: [],
          schools: fallbackTeacher.school ? [fallbackTeacher.school] : []
        }]);
      }
    }

    // Group by teacher
    const teachersMap = new Map<string, any>();
    teacherClasses.forEach(tc => {
      if (!tc.teacher) return;
      const tid = tc.teacher.id;
      if (!teachersMap.has(tid)) {
        teachersMap.set(tid, {
          ...tc.teacher,
          classes: [tc.class?.name].filter(Boolean),
          schools: tc.class?.school ? [tc.class.school] : []
        });
      } else {
        const existing = teachersMap.get(tid);
        if (tc.class?.name && !existing.classes.includes(tc.class.name)) {
          existing.classes.push(tc.class.name);
        }
        if (tc.class?.school && !existing.schools.some((s: any) => s.id === tc.class.school.id)) {
          existing.schools.push(tc.class.school);
        }
      }
    });

    res.json(Array.from(teachersMap.values()));
  } catch (error) {
    console.error("Error fetching course teachers:", error);
    res.status(500).json({ message: "Error fetching course teachers", error });
  }
};
