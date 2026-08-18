import { ROLES } from "../config/constants.js";

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { getStudentReportCard, getClassReportCard } from "../controllers/report-card.controller.js";

const router = Router();

router.use(authenticate);

// Get specific student report (Student sees own, Admin/Teacher/Parent sees any)
router.get("/student/:studentId", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT, ROLES.EDUCATEUR, ROLES.PARENT]), getStudentReportCard);

// Get global class report (School Admin/Teacher)
router.get("/class/:classId", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR]), getClassReportCard);

export default router;
