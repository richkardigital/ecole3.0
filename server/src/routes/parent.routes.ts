import type { Response } from "express";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  linkParentToChild,
  unlinkParentFromChild,
  getMyChildren,
  getChildProgress,
  getSchoolParents
} from "../controllers/parent.controller.js";

const router = Router();

router.use(authenticate);

// Admin : gérer les liens parent-enfant
router.post("/link", requireRole(["SUPER_ADMIN", "DIRECTEUR"]), linkParentToChild);
router.post("/unlink", requireRole(["SUPER_ADMIN", "DIRECTEUR"]), unlinkParentFromChild);
router.get("/school", requireRole(["SUPER_ADMIN", "DIRECTEUR"]), getSchoolParents);

// Parent : voir ses enfants
router.get("/children", requireRole(["PARENT", "SUPER_ADMIN", "DIRECTEUR"]), getMyChildren);
router.get("/children/:studentId/progress", getChildProgress);

export default router;
