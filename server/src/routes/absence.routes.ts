import { ROLES } from "../config/constants.js";
import express from "express";
import { createAbsence, getAbsences, updateAbsence, deleteAbsence } from "../controllers/absence.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

router.use(authenticate);

router.post("/", requireRole([ROLES.DIRECTEUR, ROLES.EDUCATEUR]), createAbsence);
router.get("/", requireRole([ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]), getAbsences);
router.put("/:id", requireRole([ROLES.DIRECTEUR, ROLES.EDUCATEUR]), updateAbsence);
router.delete("/:id", requireRole([ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteAbsence);

export default router;
