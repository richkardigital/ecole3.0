const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const niveaux = await prisma.niveau.findMany();
  console.log('Niveaux in DB:', niveaux);
}

main().catch(console.error).finally(() => prisma.$disconnect());
