import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";
import { ROLES } from "../config/constants.js";
import type { UserRole } from "@prisma/client";
import prisma from "../utils/prisma.js";

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié." });
    }
    
    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ message: "Accès refusé. Rôle insuffisant." });
    }
    
    next();
  };
};

export const requireSchoolAccess = () => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next(); // Super admin a accès à toutes les écoles
    }

    const targetSchoolId = req.params.schoolId || req.query.schoolId || req.body.schoolId;

    if (targetSchoolId && req.user.schoolId !== targetSchoolId) {
       return res.status(403).json({ message: "Accès refusé. Vous n'appartenez pas à cette école." });
    }

    next();
  };
};

/**
 * Middleware CNED — Vérification de la portée du contenu
 * 
 * Règles métier :
 * - NIVEAU : SUPER_ADMIN uniquement (matières, cours, évals notées)
 * - ECOLE : SUPER_ADMIN, DIRECTEUR, ENSEIGNANT (éval de classe)
 * - CLASSE : SUPER_ADMIN, DIRECTEUR, ENSEIGNANT
 * - APPRENANT / PARENT : jamais de création
 */
export const requireContentScope = (scope: "NIVEAU" | "ECOLE" | "CLASSE") => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    const role = req.user.role as string;

    // Bloqué pour les apprenants et parents dans tous les cas
    if (["APPRENANT", "PARENT"].includes(role)) {
      return res.status(403).json({ message: "Accès refusé. Les apprenants et parents ne peuvent pas créer de contenu." });
    }

    if (scope === "NIVEAU") {
      // Seul SUPER_ADMIN peut créer du contenu de niveau (matières, cours, évals notées)
      if (role !== "SUPER_ADMIN") {
        return res.status(403).json({
          message: "Seul le Super Administrateur peut créer du contenu au niveau (matières, cours, évaluations notées)."
        });
      }
    }

    if (scope === "ECOLE") {
      if (!["SUPER_ADMIN", "DIRECTEUR", "ENSEIGNANT"].includes(role)) {
        return res.status(403).json({ message: "Accès refusé pour publier à l'échelle de l'école." });
      }
    }

    next();
  };
};

/**
 * Middleware CNED — Restriction des exercices enseignants
 * Un ENSEIGNANT peut créer uniquement des exercices non notés (EXERCICE_MAISON)
 * Les évaluations notées de classe (DEVOIR_CLASSE) sont créées par ENSEIGNANT mais validées par DIRECTEUR
 */
export const requireTeacherContentAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: "Non authentifié." });

  const role = req.user.role as string;
  const { type, scope, niveauId } = req.body;

  if (role === "ENSEIGNANT") {
    // Un enseignant ne peut PAS créer de contenu de niveau
    if (scope === "NIVEAU" || niveauId) {
      return res.status(403).json({
        message: "Les enseignants ne peuvent pas créer de contenu au niveau. Contactez le Super Administrateur."
      });
    }
    // Un enseignant ne peut créer que EXERCICE_MAISON (non noté) ou DEVOIR_CLASSE (noté, 40%)
    if (type && !["EXERCICE_MAISON", "DEVOIR_CLASSE", "DEVOIR_MAISON"].includes(type)) {
      return res.status(403).json({
        message: "Les enseignants ne peuvent créer que des exercices maison ou des devoirs de classe."
      });
    }
  }

  next();
};

/**
 * Middleware — Accès parent en lecture seule
 * Vérifie que l'utilisateur PARENT a bien un enfant lié à la ressource demandée
 */
export const requireParentAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: "Non authentifié." });

  const role = req.user.role as string;
  if (role !== "PARENT") return next(); // Non-parent : passer

  const { studentId } = req.params;
  if (!studentId) return res.status(400).json({ message: "studentId requis pour l'accès parent." });

  const link = await prisma.parentChild.findUnique({
    where: { parentId_studentId: { parentId: req.user.id, studentId: studentId as string } }
  });

  if (!link) {
    return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas le parent de cet élève." });
  }

  next();
};
