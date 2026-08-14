import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { ROLES } from "../config/constants.js";
import {
  getSystemSettings,
  updateSystemSettings
} from "../controllers/system-settings.controller.js";

const router = Router();

// Public / Authenticated route to get current platform branding & contact
router.get("/", getSystemSettings);

// SUPER_ADMIN only to update system settings
router.put("/", authenticate, requireRole([ROLES.SUPER_ADMIN]), updateSystemSettings);

export default router;
