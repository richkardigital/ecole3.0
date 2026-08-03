import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { getGradebook, saveGrade, getStudentReportCard, getConductGrades, getTeacherGrid, saveTeacherGrid } from "../controllers/grade.controller.js";

const router = Router();

router.use(authenticate);

// Get student report card (bulletin) - Self (Student)
router.get("/report-card", requireRole([ROLES.APPRENANT, ROLES.ENSEIGNANT, ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getStudentReportCard);

// Get student report card (bulletin) - Specific Student (Teacher/Admin)
router.get("/report-card/:studentId", requireRole([ROLES.ENSEIGNANT, ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getStudentReportCard);

// Get gradebook for a course
router.get("/:courseId/gradebook", requireRole([ROLES.ENSEIGNANT, ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getGradebook);

// Teacher Grading Grid Endpoints
router.get("/teacher-grid/view", requireRole([ROLES.ENSEIGNANT, ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), getTeacherGrid);
router.post("/teacher-grid/save", requireRole([ROLES.ENSEIGNANT, ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), saveTeacherGrid);

// Get conduct grades for a course
router.get("/:courseId/conduct", requireRole([ROLES.ENSEIGNANT, ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getConductGrades);

// Save or update a grade
router.post("/save", requireRole([ROLES.ENSEIGNANT, ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), saveGrade);

export default router;
