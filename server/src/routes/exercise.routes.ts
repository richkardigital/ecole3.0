import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  getChapterExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  submitExercise,
  getExerciseSubmissions,
  gradeExerciseSubmission,
} from "../controllers/exercise.controller.js";

const router = Router();

router.use(authenticate);

// Exercices d'un chapitre
router.get("/chapters/:chapterId/exercises", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getChapterExercises);

// SUPER_ADMIN et ENSEIGNANT créent les exercices
router.post("/chapters/:chapterId/exercises", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT]), createExercise);

// Détail d'un exercice
router.get("/exercises/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getExercise);

// Modifier / Supprimer un exercice (SUPER_ADMIN ou créateur ENSEIGNANT)
router.put("/exercises/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT]), updateExercise);
router.delete("/exercises/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT]), deleteExercise);

// Soumission par un apprenant
router.post("/exercises/:id/submit", requireRole([ROLES.APPRENANT]), submitExercise);

// Voir les soumissions (enseignant / admin)
router.get("/exercises/:id/submissions", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), getExerciseSubmissions);

// Corriger une soumission (TEXTE_LIBRE)
router.patch("/exercises/submissions/:submissionId/grade", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT]), gradeExerciseSubmission);

export default router;
