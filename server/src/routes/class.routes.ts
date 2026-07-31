import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import { requireRole } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import {
  createClass,
  getClasses,
  enrollStudent,
  getClassStudents,
  deleteClass,
  importStudents,
  updateClass,
  transferStudent,
  previewImportStudents,
  getClassById
} from "../controllers/class.controller.js";

const router = Router();

router.use(authenticate);

// Only Admins can create classes and enroll students
router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), createClass);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), updateClass);
router.post("/enroll", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR]), enrollStudent);
router.post("/transfer", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), transferStudent);
router.post("/:id/students/import", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('file'), importStudents);
router.post("/:id/students/import-preview", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('file'), previewImportStudents);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteClass);

// Teachers and Students can view classes (Students only their own, implemented in filtering logic ideally)
// For now, let's allow all authenticated users to view classes (filtering by school is done in controller)
router.get("/", getClasses);
router.get("/:id", getClassById);
router.get("/:id/students", getClassStudents);

export default router;
