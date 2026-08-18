import { ROLES } from "../config/constants.js";
import express from "express";
import { createAbsence, getAbsences, updateAbsence, deleteAbsence } from "../controllers/absence.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

router.use(authenticate);

router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT]), createAbsence);
router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT, ROLES.PARENT]), getAbsences);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), updateAbsence);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteAbsence);

export default router;
