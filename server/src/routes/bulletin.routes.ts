import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { ROLES } from "../config/constants.js";
import {
  generateClassBulletins,
  getBulletinEleve,
  getClassBulletins,
  getBulletinsToValidate,
  soumettreBulletin,
  soumettreClasseBulletins,
  validerBulletin,
  validerClasseBulletins,
  rejeterBulletin,
  updateBulletinAppreciations,
} from "../controllers/bulletin.controller.js";

const router = Router();
router.use(authenticate);

const ALL_STAFF = [
  ROLES.SUPER_ADMIN,
  ROLES.DIRECTEUR,
  ROLES.EDUCATEUR,
  ROLES.ENSEIGNANT,
];

// ─── Génération ───────────────────────────────────────────────────────────────

// Générer/recalculer les bulletins d'une classe
router.post(
  "/generate",
  requireRole(ALL_STAFF),
  generateClassBulletins
);

// ─── Lecture ─────────────────────────────────────────────────────────────────

// Bulletin individuel d'un élève
router.get(
  "/student/:studentId",
  requireRole([...ALL_STAFF, ROLES.APPRENANT, ROLES.PARENT]),
  getBulletinEleve
);

// Bulletins d'une classe
router.get(
  "/class/:classId",
  requireRole(ALL_STAFF),
  getClassBulletins
);

// Bulletins en attente de validation (pour éducateur, directeur, super admin)
router.get(
  "/pending",
  requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]),
  getBulletinsToValidate
);

// ─── Workflow ────────────────────────────────────────────────────────────────

// Soumettre un bulletin individuel (ENSEIGNANT)
router.post(
  "/:bulletinId/soumettre",
  requireRole([ROLES.ENSEIGNANT, ROLES.SUPER_ADMIN]),
  soumettreBulletin
);

// Soumettre en lot tous les bulletins d'une classe (ENSEIGNANT)
router.post(
  "/soumettre-classe",
  requireRole([ROLES.ENSEIGNANT, ROLES.SUPER_ADMIN]),
  soumettreClasseBulletins
);

// Valider un bulletin individuel (EDUCATEUR, DIRECTEUR, SUPER_ADMIN)
router.post(
  "/:bulletinId/valider",
  requireRole([ROLES.EDUCATEUR, ROLES.DIRECTEUR, ROLES.SUPER_ADMIN]),
  validerBulletin
);

// Valider en lot tous les bulletins d'une classe
router.post(
  "/valider-classe",
  requireRole([ROLES.EDUCATEUR, ROLES.DIRECTEUR, ROLES.SUPER_ADMIN]),
  validerClasseBulletins
);

// Rejeter un bulletin
router.post(
  "/:bulletinId/rejeter",
  requireRole([ROLES.EDUCATEUR, ROLES.DIRECTEUR, ROLES.SUPER_ADMIN]),
  rejeterBulletin
);

// Mettre à jour appréciations/commentaires
router.patch(
  "/:bulletinId/appreciations",
  requireRole(ALL_STAFF),
  updateBulletinAppreciations
);

export default router;
