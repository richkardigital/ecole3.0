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
  updateAcademicYearSchools,
  deleteAcademicYear,
  updateTerm,
  deleteTerm,
  toggleAcademicYearComplete,
  toggleAcademicYearActive,
  setCurrentAcademicYear,
  getAcademicYearStats,
} from "../controllers/academic.controller.js";

const router = Router();

router.use(authenticate);

// Lecture — tous les rôles authentifiés
router.get("/years", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]), getAcademicYears);
router.get("/years/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]), getAcademicYear);
router.get("/years/:id/stats", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT]), getAcademicYearStats);

// Écriture — restreint aux admins
router.use(requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]));

router.post("/years", createAcademicYear);
router.put("/years/:id", updateAcademicYear);
// FIX BUG: Route dédiée pour l'affectation/désaffectation des écoles
router.patch("/years/:id/schools", updateAcademicYearSchools);
router.delete("/years/:id", deleteAcademicYear);
router.patch("/years/:id/toggle-complete", toggleAcademicYearComplete);
router.patch("/years/:id/toggle-active", toggleAcademicYearActive);
router.patch("/years/:id/set-current", setCurrentAcademicYear);

router.post("/terms", createTerm);
router.put("/terms/:id", updateTerm);
router.delete("/terms/:id", deleteTerm);
router.patch("/terms/:id/status", toggleTermStatus);

export default router;
