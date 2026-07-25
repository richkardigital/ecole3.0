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
} from "../controllers/assignment.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.fields([{ name: 'file', maxCount: 1 }, { name: 'voiceNote', maxCount: 1 }, { name: 'correction', maxCount: 1 }]), createAssignment);
router.get("/agenda", getAgenda); // Must be before /:id
router.get("/", getAssignments);
router.get("/:id", getAssignmentById);
router.delete("/:id", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteAssignment);

// Student submits
router.post("/:id/submit", requireRole([ROLES.APPRENANT]), upload.single('file'), submitAssignment);

// Teacher/Admin views submissions and grades
router.get("/:id/submissions", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getSubmissions);
router.post("/submissions/:id/grade", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), gradeSubmission);

export default router;
