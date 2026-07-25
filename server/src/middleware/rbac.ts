import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";
import { ROLES } from "../config/constants.js";
import type { UserRole } from "@prisma/client";

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
