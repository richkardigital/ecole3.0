/**
 * Script de migration des rôles utilisateur.
 * 
 * Transforme les anciens rôles (SCHOOL_ADMIN, EDUCATOR, TEACHER, STUDENT, IT_ADMIN)
 * vers les nouveaux (DIRECTEUR, EDUCATEUR, ENSEIGNANT, APPRENANT).
 * 
 * Usage: node --loader ts-node/esm src/scripts/migrate-roles.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import prisma from '../utils/prisma.js';

async function migrateRoles(): Promise<void> {
  console.log('🔄 Migration des rôles utilisateur...\n');

  const roleMapping: Record<string, string> = {
    'SCHOOL_ADMIN': 'DIRECTEUR',
    'EDUCATOR':     'EDUCATEUR',
    'IT_ADMIN':     'EDUCATEUR',  // IT_ADMIN absorbé par EDUCATEUR
    'TEACHER':      'ENSEIGNANT',
    'STUDENT':      'APPRENANT',
  };

  let totalMigrated = 0;

  for (const [oldRole, newRole] of Object.entries(roleMapping)) {
    try {
      const result = await prisma.$executeRawUnsafe(
        `UPDATE "User" SET role = '${newRole}' WHERE role = '${oldRole}'`
      );
      if (result > 0) {
        console.log(`  ✅ ${oldRole} → ${newRole} : ${result} utilisateur(s) migré(s)`);
        totalMigrated += result;
      } else {
        console.log(`  ⏭️  ${oldRole} → ${newRole} : aucun utilisateur à migrer`);
      }
    } catch (error) {
      console.error(`  ❌ Erreur migration ${oldRole} → ${newRole}:`, error);
    }
  }

  console.log(`\n✅ Migration terminée. ${totalMigrated} utilisateur(s) au total migré(s).`);

  // Vérification
  const counts = await prisma.$queryRawUnsafe<Array<{ role: string; count: bigint }>>(
    `SELECT role, COUNT(*) as count FROM "User" GROUP BY role ORDER BY role`
  );
  console.log('\n📊 Distribution actuelle des rôles :');
  for (const row of counts) {
    console.log(`  ${row.role}: ${row.count}`);
  }

  await prisma.$disconnect();
}

migrateRoles().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
