import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { ROLES } from "../config/constants.js";
import { getCalendarEvents } from "../controllers/calendar.controller.js";

const router = Router();

router.use(authenticate);

// Accessible à tous les rôles connectés
router.get(
  "/",
  requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT, ROLES.APPRENANT]),
  getCalendarEvents
);

export default router;
