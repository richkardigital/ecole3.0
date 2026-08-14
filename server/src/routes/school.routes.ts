import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  createSchool,
  getSchools,
  getSchoolById,
  getMySchool,
  updateMySchool,
  updateSchool,
  deleteSchool,
} from "../controllers/school.controller.js";

const router = Router();

router.use(authenticate);

// Endpoints for school members / Director
router.get("/my-school", requireRole([ROLES.DIRECTEUR, ROLES.SUPER_ADMIN, ROLES.EDUCATEUR, ROLES.ENSEIGNANT]), getMySchool);
router.put("/my-school", requireRole([ROLES.DIRECTEUR, ROLES.SUPER_ADMIN]), updateMySchool);

// SUPER_ADMIN only for global management
router.post("/", requireRole([ROLES.SUPER_ADMIN]), createSchool);
router.get("/", requireRole([ROLES.SUPER_ADMIN]), getSchools);
router.get("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), getSchoolById);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN]), updateSchool);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN]), deleteSchool);

export default router;
