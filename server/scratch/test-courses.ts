import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany({ where: { role: 'APPRENANT' }});
  const student = users[0];
  console.log("Student:", student?.email);

  if (!student) return;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: { class: { include: { niveau: true } } }
  });
  console.log("Enrollments:", enrollments.map(e => ({ class: e.class.name, niveau: e.class.niveau?.nom })));

  const allowedNiveauIds = [...new Set(enrollments.map(e => e.class.niveauId).filter(Boolean))] as string[];
  console.log("Allowed Niveau IDs:", allowedNiveauIds);

  const courses = await prisma.course.findMany({
    where: {
      class: {
        academicYear: { isCurrent: true },
        niveauId: { in: allowedNiveauIds }
      }
    },
    include: {
      class: {
        include: {
          school: true,
          academicYear: true
        }
      },
      subject: true
    }
  });

  console.log(`Found ${courses.length} courses for this student.`);
  for (const c of courses) {
    console.log(`Course: ${c.subject.name} - ${c.class.name} (${c.class.school.name}) - Current Year: ${c.class.academicYear?.isCurrent}`);
  }
}
test().catch(console.error).finally(() => prisma.$disconnect());
