import prisma from '../utils/prisma.js';
import { getDefaultSubjectImage } from '../controllers/subject.controller.js';

async function main() {
  const subjects = await prisma.subject.findMany();
  console.log(`Found ${subjects.length} subjects.`);

  for (const s of subjects) {
    const defaultImg = getDefaultSubjectImage(s.name);
    await prisma.subject.update({
      where: { id: s.id },
      data: { imageUrl: defaultImg }
    });
    console.log(`Updated subject "${s.name}" -> imageUrl: "${defaultImg}"`);
  }

  console.log('Backfill completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
