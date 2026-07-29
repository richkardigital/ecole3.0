import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    include: {
      class: {
        include: {
          school: true,
          academicYear: true,
        }
      },
      subject: true,
      teacher: true,
      _count: {
        select: { chapters: true, assignments: true }
      }
    }
  });

  console.log(`TOTAL COURSES IN DB: ${courses.length}`);
  courses.forEach(c => {
    console.log(`- Course ID: ${c.id}`);
    console.log(`  Subject: ${c.subject?.name}`);
    console.log(`  Class: ${c.class?.name} (School: ${c.class?.school?.name || 'NONE'})`);
    console.log(`  Teacher: ${c.teacher?.firstName} ${c.teacher?.lastName} (${c.teacher?.email})`);
    console.log(`  Chapters: ${c._count.chapters}, Assignments: ${c._count.assignments}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
