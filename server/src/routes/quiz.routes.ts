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
    getMyAttempts 
} from "../controllers/quiz.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), createQuiz);
router.get("/", getQuizzes); // Filter by courseId in query
router.get("/attempts", requireRole([ROLES.APPRENANT]), getMyAttempts);
router.get("/:id", getQuiz);
router.get("/:id/attempts", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), getQuizAttempts);
router.get("/attempts/:id", getAttemptDetail);
router.put("/:id", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), updateQuiz);
router.delete("/:id", requireRole([ROLES.ENSEIGNANT, ROLES.DIRECTEUR]), deleteQuiz);
router.post("/:id/submit", requireRole([ROLES.APPRENANT]), submitQuizAttempt);

export default router;
