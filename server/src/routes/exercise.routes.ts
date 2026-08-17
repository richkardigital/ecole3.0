import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
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

// SUPER_ADMIN, DIRECTEUR et ENSEIGNANT créent les exercices
router.post("/chapters/:chapterId/exercises", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT]), upload.any(), createExercise);

// Détail d'un exercice
router.get("/exercises/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getExercise);

// Modifier / Supprimer un exercice (SUPER_ADMIN, DIRECTEUR ou créateur ENSEIGNANT)
router.put("/exercises/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT]), upload.any(), updateExercise);
router.delete("/exercises/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT]), deleteExercise);

// Soumission par un apprenant (ou test par enseignant / admin)
router.post("/exercises/:id/submit", requireRole([ROLES.APPRENANT, ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), submitExercise);

// Voir les soumissions (enseignant / admin)
router.get("/exercises/:id/submissions", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), getExerciseSubmissions);

// Corriger une soumission (TEXTE_LIBRE)
router.patch("/exercises/submissions/:submissionId/grade", requireRole([ROLES.SUPER_ADMIN, ROLES.ENSEIGNANT]), gradeExerciseSubmission);

export default router;
