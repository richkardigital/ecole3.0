
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking and updating Message table schema...');

  try {
    // Add attachmentUrl column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Message" 
      ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
    `);
    console.log('Verified attachmentUrl column.');

    // Add attachmentType column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Message" 
      ADD COLUMN IF NOT EXISTS "attachmentType" TEXT;
    `);
    console.log('Verified attachmentType column.');

    console.log('Schema update completed successfully.');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
