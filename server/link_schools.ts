import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Linking schools to academic years...');
  
  const years = await prisma.academicYear.findMany();
  const schools = await prisma.school.findMany();

  for (const year of years) {
    console.log(`Linking ${schools.length} schools to year ${year.name}`);
    await prisma.academicYear.update({
      where: { id: year.id },
      data: {
        schools: {
          connect: schools.map(s => ({ id: s.id }))
        }
      }
    });
  }
  
  console.log('Linking completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
