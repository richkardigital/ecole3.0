import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { ROLES } from "../config/constants.js";
import { 
  getSchoolTypes, getSchoolTypeById, createSchoolType, 
  updateSchoolType, toggleActiveSchoolType, deleteSchoolType 
} from "../controllers/school-type.controller.js";

const router = Router();

// Public/Auth endpoints
router.get("/", getSchoolTypes);
router.get("/:id", getSchoolTypeById);

// Admin-only endpoints
router.use(authenticate);
router.post("/", requireRole([ROLES.SUPER_ADMIN]), createSchoolType);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN]), updateSchoolType);
router.patch("/:id/toggle-active", requireRole([ROLES.SUPER_ADMIN]), toggleActiveSchoolType);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN]), deleteSchoolType);

export default router;
