import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { createSubject, getSubjects, updateSubject, deleteSubject } from "../controllers/subject.controller.js";

const router = Router();

router.use(authenticate);

// Seul le SUPER_ADMIN peut créer/modifier/supprimer des matières
router.post("/", requireRole([ROLES.SUPER_ADMIN]), createSubject);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN]), updateSubject);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN]), deleteSubject);
// Lecture pour tous les rôles authentifiés
router.get("/", getSubjects);

export default router;
