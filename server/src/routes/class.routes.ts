import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import {
  createClass,
  getClasses,
  enrollStudent,
  unenrollStudent,
  getClassStudents,
  deleteClass,
  importStudents,
  updateClass,
  transferStudent,
  previewImportStudents,
  getClassById,
  assignTeacherToClass,
  unassignTeacherFromClass,
  getClassCourses
} from "../controllers/class.controller.js";

const router = Router();

router.use(authenticate);

// Only Admins can create classes and enroll/transfer students
router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), createClass);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), updateClass);
router.post("/enroll", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR]), enrollStudent);
router.post("/unenroll", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR]), unenrollStudent);
router.post("/transfer", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), transferStudent);
router.post("/assign-teacher", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), assignTeacherToClass);
router.post("/unassign-teacher", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), unassignTeacherFromClass);
router.post("/:id/students/import", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('file'), importStudents);
router.post("/:id/students/import-preview", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('file'), previewImportStudents);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteClass);

// View classes & class resources
router.get("/", getClasses);
router.get("/:id", getClassById);
router.get("/:id/students", getClassStudents);
router.get("/:id/courses", getClassCourses);

export default router;
