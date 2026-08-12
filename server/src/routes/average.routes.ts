import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  getTermAverages,
  getAnnualAverages,
  triggerAnnualCalculation,
  getStudentAverages
} from "../controllers/average.controller.js";

const router = Router();

router.use(authenticate);

// Moyennes trimestrielles d'une classe (enseignants, éducateurs, admin)
router.get(
  "/term/:classId/:termId",
  requireRole(["SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR", "ENSEIGNANT"]),
  getTermAverages
);

// Moyennes annuelles d'une classe
router.get(
  "/annual/:classId/:academicYearId",
  requireRole(["SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR", "ENSEIGNANT"]),
  getAnnualAverages
);

// Déclencher le calcul des moyennes annuelles (admin/directeur/éducateur)
router.post(
  "/calculate",
  requireRole(["SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR"]),
  triggerAnnualCalculation
);

// Moyennes d'un élève (vue élève ou parent)
router.get(
  "/student/:studentId",
  requireRole(["SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR", "ENSEIGNANT", "APPRENANT", "PARENT"]),
  getStudentAverages
);

export default router;
