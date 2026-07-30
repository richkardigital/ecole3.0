import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Re-affectation des classes aux niveaux...");
  
  const niveaux = await prisma.niveau.findMany();
  const classes = await prisma.class.findMany();
  
  let affected = 0;
  
  for (const c of classes) {
    const nameLower = c.name.toLowerCase();
    
    // Simple matching logic
    let targetNiveau = null;
    if (nameLower.includes('terminale') || nameLower.includes('tle')) {
      targetNiveau = niveaux.find(n => n.nom === 'Terminale');
    } else if (nameLower.includes('1ère') || nameLower.includes('1ere')) {
      targetNiveau = niveaux.find(n => n.nom === '1ère');
    } else if (nameLower.includes('2nde') || nameLower.includes('seconde')) {
      targetNiveau = niveaux.find(n => n.nom === '2nde');
    } else if (nameLower.includes('3ème') || nameLower.includes('3eme')) {
      targetNiveau = niveaux.find(n => n.nom === '3ème');
    } else if (nameLower.includes('4ème') || nameLower.includes('4eme')) {
      targetNiveau = niveaux.find(n => n.nom === '4ème');
    } else if (nameLower.includes('5ème') || nameLower.includes('5eme')) {
      targetNiveau = niveaux.find(n => n.nom === '5ème');
    } else if (nameLower.includes('6ème') || nameLower.includes('6eme')) {
      targetNiveau = niveaux.find(n => n.nom === '6ème');
    }

    if (targetNiveau) {
      await prisma.class.update({
        where: { id: c.id },
        data: { niveauId: targetNiveau.id }
      });
      console.log(`Classe '${c.name}' => rattachée à '${targetNiveau.nom}'`);
      affected++;
    } else {
      console.log(`Classe '${c.name}' => aucun niveau trouvé (vérification manuelle nécessaire)`);
    }
  }
  
  console.log(`Terminé ! ${affected} classe(s) réaffectée(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
