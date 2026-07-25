import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  createAcademicYear,
  getAcademicYears,
  getAcademicYear,
  createTerm,
  toggleTermStatus,
  updateAcademicYear,
  deleteAcademicYear,
  updateTerm,
  deleteTerm,
  toggleAcademicYearStatus,
  toggleAcademicYearActive,
  setCurrentAcademicYear,
} from "../controllers/academic.controller.js";

const router = Router();

router.use(authenticate);

// Public read for authenticated users
router.get("/years", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]), getAcademicYears);
router.get("/years/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]), getAcademicYear);

// Restricted write access
router.use(requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]));

router.post("/years", createAcademicYear);
router.put("/years/:id", updateAcademicYear);
router.delete("/years/:id", deleteAcademicYear);
router.patch("/years/:id/toggle-status", toggleAcademicYearStatus);
router.patch("/years/:id/toggle-active", toggleAcademicYearActive);
router.patch("/years/:id/set-current", setCurrentAcademicYear);

router.post("/terms", createTerm);
router.put("/terms/:id", updateTerm);
router.delete("/terms/:id", deleteTerm);
router.patch("/terms/:id/status", toggleTermStatus);

export default router;
