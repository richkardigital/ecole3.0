import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  createQuiz,
  getQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizAttempts,
  getAttemptDetail,
  submitQuizAttempt,
  getMyAttempts,
  getQuizStats,
} from "../controllers/quiz.controller.js";

const router = Router();

router.use(authenticate);

// Lecture — tous les rôles
router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]), getQuizzes);
router.get("/attempts/me", requireRole([ROLES.APPRENANT]), getMyAttempts);

// Quiz spécifique
router.get("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]), getQuiz);
router.get("/:id/attempts", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getQuizAttempts);
router.get("/:id/stats", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getQuizStats);
router.get("/attempts/:id/detail", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]), getAttemptDetail);

// Écriture — création/modification
router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), createQuiz);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), updateQuiz);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), deleteQuiz);

// Soumission par l'apprenant
router.post("/:id/submit", requireRole([ROLES.APPRENANT]), submitQuizAttempt);

export default router;
