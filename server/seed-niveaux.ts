import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Suppression des anciens niveaux...");
  await prisma.niveau.deleteMany({});
  
  const niveaux = [
    { nom: 'Terminale', rang: 1 },
    { nom: '1ère', rang: 2 },
    { nom: '2nde', rang: 3 },
    { nom: '3ème', rang: 4 },
    { nom: '4ème', rang: 5 },
    { nom: '5ème', rang: 6 },
    { nom: '6ème', rang: 7 },
  ];
  
  console.log("Création des nouveaux niveaux (6ème à Terminale)...");
  for (const n of niveaux) {
    await prisma.niveau.create({ data: n });
    console.log(`Créé : ${n.nom}`);
  }
  
  console.log("Terminé avec succès !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
