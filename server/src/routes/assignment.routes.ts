import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import {
  createAssignment,
  getAssignments,
  getAgenda,
  getAssignmentById,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
  deleteAssignment,
  publishAssignment,
  updateAssignment,
} from "../controllers/assignment.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.fields([{ name: 'file', maxCount: 1 }, { name: 'voiceNote', maxCount: 1 }, { name: 'correction', maxCount: 1 }]), createAssignment);
router.get("/agenda", getAgenda); // Must be before /:id
router.get("/", getAssignments);
router.get("/:id", getAssignmentById);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT]), updateAssignment);
router.patch("/:id/publish", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT]), publishAssignment);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteAssignment);

// Student submits
router.post("/:id/submit", requireRole([ROLES.APPRENANT]), upload.single('file'), submitAssignment);

// Teacher/Admin views submissions and grades
router.get("/:id/submissions", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getSubmissions);
router.post("/submissions/:id/grade", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), gradeSubmission);

export default router;
