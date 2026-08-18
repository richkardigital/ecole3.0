import type { Response } from "express";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import {
  linkParentToChild,
  unlinkParentFromChild,
  getMyChildren,
  getChildProgress,
  getSchoolParents,
  lookupChildByCredentials,
  linkChildByCredentials,
  unlinkChildByParent,
  getPublicTerms,
  getPublicStudentBulletin
} from "../controllers/parent.controller.js";

const router = Router();

// =============================================
// ROUTES PUBLIQUES (SANS AUTHENTIFICATION) :
// Consultation Express 360°, Liste des Trimestres & Bulletin Officiel
// =============================================
router.post("/lookup", lookupChildByCredentials);
router.get("/terms", getPublicTerms);
router.get("/public-bulletin/:studentId", getPublicStudentBulletin);

// =============================================
// ROUTES AUTHENTIFIÉES
// =============================================
router.use(authenticate);

// Admin : gérer les liens parent-enfant
router.post("/link", requireRole(["SUPER_ADMIN", "DIRECTEUR"]), linkParentToChild);
router.post("/unlink", requireRole(["SUPER_ADMIN", "DIRECTEUR"]), unlinkParentFromChild);
router.get("/school", requireRole(["SUPER_ADMIN", "DIRECTEUR"]), getSchoolParents);

// Parent : lier ou délier un enfant par matricule & date de naissance
router.post("/link-by-credentials", requireRole(["PARENT", "SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR"]), linkChildByCredentials);
router.post("/unlink-child", requireRole(["PARENT", "SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR"]), unlinkChildByParent);

// Parent : voir ses enfants et leur progression
router.get("/children", requireRole(["PARENT", "SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR"]), getMyChildren);
router.get("/children/:studentId/progress", requireRole(["PARENT", "SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR", "ENSEIGNANT"]), getChildProgress);

export default router;

