import prisma from '../utils/prisma.js';

async function main() {
  const student = await prisma.user.findFirst({
    where: { role: 'APPRENANT' },
    include: {
      enrollments: { include: { class: { include: { niveau: true } } } }
    }
  });
  console.log('Test Student:', student?.firstName, student?.lastName, 'Class:', student?.enrollments[0]?.class?.name, 'Niveau:', student?.enrollments[0]?.class?.niveau?.nom);

  const start = new Date('2026-08-01T00:00:00.000Z');
  const end = new Date('2026-08-31T23:59:59.999Z');

  const niveauId = student?.enrollments[0]?.class?.niveauId;

  const assignments = await prisma.assignment.findMany({
    where: {
      syncCalendar: true,
      OR: [
        { startDate: { gte: start, lte: end } },
        { dueDate: { gte: start, lte: end } },
        { startDate: { lte: start }, dueDate: { gte: end } },
        { startDate: null, dueDate: { gte: start, lte: end } },
      ],
      AND: [
        {
          OR: [
            ...(niveauId ? [
              { niveauId },
              { course: { niveauId } }
            ] : []),
            { isNiveauWide: true }
          ]
        }
      ]
    },
    include: {
      course: { select: { subject: { select: { name: true } } } },
      subject: { select: { name: true } },
      niveau: { select: { nom: true } }
    }
  });

  console.log('=== CALENDAR EVENTS FOUND FOR STUDENT IN OCT-NOV 2026 ===', assignments.length);
  console.log(assignments.map(a => `${a.title} (${a.type}) - ${a.dueDate.toISOString().slice(0, 10)} - Subject: ${a.subject?.name || a.course?.subject?.name}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
