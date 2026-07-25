import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  createSchool,
  getSchools,
  getSchoolById,
  updateSchool,
  deleteSchool,
} from "../controllers/school.controller.js";

const router = Router();

// Only SUPER_ADMIN can manage schools
router.use(authenticate, requireRole([ROLES.SUPER_ADMIN]));

router.post("/", createSchool);
router.get("/", getSchools);
router.get("/:id", getSchoolById);
router.put("/:id", updateSchool);
router.delete("/:id", deleteSchool);

export default router;
