import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running raw SQL to deduplicate academic years...');
  
  // Find all duplicates
  const duplicates: any[] = await prisma.$queryRaw`
    SELECT name, array_agg(id) as ids 
    FROM "AcademicYear" 
    GROUP BY name 
    HAVING count(id) > 1
  `;

  for (const row of duplicates) {
    const ids = row.ids as string[];
    const targetId = ids[0];
    const duplicateIds = ids.slice(1);

    console.log(`Duplicate found for ${row.name}. Target: ${targetId}, Duplicates: ${duplicateIds.join(', ')}`);

    for (const dupId of duplicateIds) {
      await prisma.$executeRaw`UPDATE "Term" SET "academicYearId" = ${targetId} WHERE "academicYearId" = ${dupId}`;
      await prisma.$executeRaw`UPDATE "Class" SET "academicYearId" = ${targetId} WHERE "academicYearId" = ${dupId}`;
      await prisma.$executeRaw`UPDATE "Assignment" SET "academicYearId" = ${targetId} WHERE "academicYearId" = ${dupId}`;
      
      await prisma.$executeRaw`DELETE FROM "AcademicYear" WHERE id = ${dupId}`;
    }
  }

  console.log('Deduplication completed. Trying to create the unique constraint...');
  try {
    await prisma.$executeRaw`CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name")`;
    console.log('Constraint created!');
  } catch (e: any) {
    console.log('Constraint might already exist or failed:', e.message);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
