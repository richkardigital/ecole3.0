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
  getSharedMaterials
} from "../controllers/course.controller.js";

const router = Router();

router.use(authenticate);

router.get("/library", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getLibrary); // Specific route first
router.get("/shared/schools", requireRole([ROLES.APPRENANT, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getSharedSchools);
router.get("/shared/schools/:schoolId/classes", requireRole([ROLES.APPRENANT, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getSharedSchoolClasses);
router.get("/shared/materials", requireRole([ROLES.APPRENANT, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getSharedMaterials);
router.post("/assign-multiple", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), bulkAssignCourses);
router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), createCourse);
router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getCourses);
router.get("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getCourse);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteCourse);

// Chapters
router.post("/:courseId/chapters", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), createChapter);
router.put("/chapters/:id", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), updateChapter);
router.delete("/chapters/:id", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), deleteChapter);
router.get("/:id/content", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getCourseChapters);

// Material routes nested under course
router.post("/:id/materials", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('file'), addMaterial);
router.get("/:id/materials", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getMaterials);
router.delete("/materials/:id", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteMaterial);

export default router;
