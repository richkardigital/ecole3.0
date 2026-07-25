import { UserRole } from '@prisma/client';

export const ROLES = {
  SUPER_ADMIN: UserRole.SUPER_ADMIN,
  DIRECTEUR: UserRole.DIRECTEUR,
  EDUCATEUR: UserRole.EDUCATEUR,
  ENSEIGNANT: UserRole.ENSEIGNANT,
  APPRENANT: UserRole.APPRENANT,
} as const;

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.DIRECTEUR]: 80,
  [ROLES.EDUCATEUR]: 60,
  [ROLES.ENSEIGNANT]: 40,
  [ROLES.APPRENANT]: 20,
};

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
