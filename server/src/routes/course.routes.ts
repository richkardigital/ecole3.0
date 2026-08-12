import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import {
  createCourse,
  getCourses,
  getCourse,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterials,
  deleteCourse,
  getLibrary,
  createChapter,
  getCourseChapters,
  updateChapter,
  deleteChapter,
  bulkAssignCourses,
  getSharedSchools,
  getSharedSchoolClasses,
  getSharedCourses,
  getSharedMaterials,
  toggleChapterProgress,
  getCourseStats,
  publishCourse
} from "../controllers/course.controller.js";

const router = Router();

router.use(authenticate);

router.get("/library", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getLibrary); // Specific route first
router.get("/shared/schools", requireRole([ROLES.APPRENANT, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.SUPER_ADMIN]), getSharedSchools);
router.get("/shared/schools/:schoolId/classes", requireRole([ROLES.APPRENANT, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.SUPER_ADMIN]), getSharedSchoolClasses);
router.get("/shared/courses", requireRole([ROLES.APPRENANT, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.SUPER_ADMIN]), getSharedCourses);
router.get("/shared/materials", requireRole([ROLES.APPRENANT, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getSharedMaterials);

// Seul le DIRECTEUR peut affecter un enseignant à une matière dans plusieurs classes
router.post("/assign-multiple", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), bulkAssignCourses);

// Seul le SUPER_ADMIN crée les cours (templates de niveau)
router.post("/", requireRole([ROLES.SUPER_ADMIN]), createCourse);
router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getCourses);
router.get("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getCourse);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), deleteCourse);

// Chapitres — Seul le SUPER_ADMIN crée/modifie/supprime les chapitres (contenu pédagogique officiel)
router.post("/:courseId/chapters", requireRole([ROLES.SUPER_ADMIN]), createChapter);
router.put("/chapters/:id", requireRole([ROLES.SUPER_ADMIN]), updateChapter);
router.delete("/chapters/:id", requireRole([ROLES.SUPER_ADMIN]), deleteChapter);
router.get("/:id/content", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getCourseChapters);
router.post("/chapters/:id/progress", requireRole([ROLES.APPRENANT]), toggleChapterProgress);
router.get("/:id/stats", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getCourseStats);

// Publication d'un cours avec propagation CNED
router.patch("/:id/publish", requireRole([ROLES.SUPER_ADMIN]), publishCourse);

// Material routes — Seul le SUPER_ADMIN ajoute les contenus (supports de cours)
router.post("/:id/materials", requireRole([ROLES.SUPER_ADMIN]), upload.single('file'), addMaterial);
router.put("/materials/:id", requireRole([ROLES.SUPER_ADMIN]), upload.single('file'), updateMaterial);
router.get("/:id/materials", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getMaterials);
router.delete("/materials/:id", requireRole([ROLES.SUPER_ADMIN]), deleteMaterial);

export default router;
