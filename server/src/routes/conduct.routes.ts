import { ROLES } from "../config/constants.js";
import express from "express";
import {
  createConduct,
  getConducts,
  updateConduct,
  deleteConduct,
  calculateStudentConduct,
  calculateClassConduct,
  saveClassConduct,
} from "../controllers/conduct.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = express.Router();

router.use(authenticate);

// Calculs automatiques & Sauvegarde en lot
router.post("/calculate-student", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), calculateStudentConduct);
router.post("/calculate-class", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), calculateClassConduct);
router.post("/save-class", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), saveClassConduct);

// CRUD
router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), createConduct);
router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT, ROLES.PARENT]), getConducts);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), updateConduct);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteConduct);

export default router;
