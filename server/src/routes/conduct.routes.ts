import { ROLES } from "../config/constants.js";
import express from "express";
import { createConduct, getConducts, updateConduct, deleteConduct } from "../controllers/conduct.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

router.use(authenticate);

router.post("/", requireRole([ROLES.DIRECTEUR, ROLES.EDUCATEUR]), createConduct);
router.get("/", requireRole([ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]), getConducts);
router.put("/:id", requireRole([ROLES.DIRECTEUR, ROLES.EDUCATEUR]), updateConduct);
router.delete("/:id", requireRole([ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteConduct);

export default router;
