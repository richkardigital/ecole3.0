import prisma from '../utils/prisma.js';

async function main() {
  const assignments = await prisma.assignment.findMany({
    include: {
      subject: true,
      course: { include: { subject: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${assignments.length} assignments to schedule realistically starting today (August 2026)...`);

  const schedulePlan = [
    { subject: 'Mathématiques', title: 'Devoir surveillé N°1 — Nombres Relatifs & Calcul Littéral', startDay: 10, dueDay: 14, month: 7, year: 2026, type: 'DEVOIR_CLASSE' }, // 14 Aug (Today!)
    { subject: 'Français', title: 'Devoir N°1 — Analyse de Texte & Grammaire', startDay: 12, dueDay: 14, month: 7, year: 2026, type: 'DEVOIR_CLASSE' }, // 14 Aug (Today!)
    { subject: 'Physique-Chimie', title: 'Devoir N°1 — Masse volumique & Solutions aqueuses', startDay: 14, dueDay: 18, month: 7, year: 2026, type: 'DEVOIR_CLASSE' }, // 18 Aug
    { subject: 'SVT', title: 'Devoir N°1 — La respiration et les milieux de vie', startDay: 15, dueDay: 20, month: 7, year: 2026, type: 'DEVOIR_CLASSE' }, // 20 Aug
    { subject: 'Histoire-Géographie', title: 'Devoir N°1 — Les grandes découvertes maritimes', startDay: 16, dueDay: 22, month: 7, year: 2026, type: 'DEVOIR_CLASSE' }, // 22 Aug
    { subject: 'Anglais', title: 'Devoir N°1 — Present Perfect & Vocabulary Test', startDay: 18, dueDay: 25, month: 7, year: 2026, type: 'DEVOIR_CLASSE' }, // 25 Aug
    { subject: 'EPS', title: 'Devoir Théorique N°1 — Règles des sports collectifs', startDay: 20, dueDay: 26, month: 7, year: 2026, type: 'DEVOIR_CLASSE' }, // 26 Aug
    { subject: 'EDHC', title: "Devoir N°1 — Les droits de l'enfant et devoirs civiques", startDay: 20, dueDay: 28, month: 7, year: 2026, type: 'DEVOIR_CLASSE' }, // 28 Aug

    // September 2026
    { subject: 'Mathématiques', title: 'Devoir de Niveau N°1 — Théorème de Pythagore', startDay: 5, dueDay: 15, month: 8, year: 2026, type: 'DEVOIR_NIVEAU' }, // 15 Sep
    { subject: 'Français', title: 'Devoir de Niveau N°1 — Rédaction & Expression écrite', startDay: 10, dueDay: 20, month: 8, year: 2026, type: 'DEVOIR_NIVEAU' }, // 20 Sep
    { subject: 'Physique-Chimie', title: 'Devoir de Niveau N°1 — Circuits électriques', startDay: 15, dueDay: 25, month: 8, year: 2026, type: 'DEVOIR_NIVEAU' }, // 25 Sep

    // October / November 2026
    { subject: 'Mathématiques', title: 'Composition Trimestrielle N°1 — Mathématiques', startDay: 15, dueDay: 20, month: 10, year: 2026, type: 'COMPO_NIVEAU' }, // 20 Nov
    { subject: 'Français', title: 'Composition Trimestrielle N°1 — Français', startDay: 20, dueDay: 25, month: 10, year: 2026, type: 'COMPO_NIVEAU' }, // 25 Nov
    { subject: 'Physique-Chimie', title: 'Composition Trimestrielle N°1 — Physique-Chimie', startDay: 20, dueDay: 25, month: 10, year: 2026, type: 'COMPO_NIVEAU' }, // 25 Nov
    { subject: 'SVT', title: 'Composition Trimestrielle N°1 — SVT', startDay: 20, dueDay: 25, month: 10, year: 2026, type: 'COMPO_NIVEAU' }, // 25 Nov
    { subject: 'Histoire-Géographie', title: 'Composition Trimestrielle N°1 — Histoire-Géo', startDay: 20, dueDay: 25, month: 10, year: 2026, type: 'COMPO_NIVEAU' }, // 25 Nov
    { subject: 'Anglais', title: 'Composition Trimestrielle N°1 — Anglais', startDay: 20, dueDay: 25, month: 10, year: 2026, type: 'COMPO_NIVEAU' }, // 25 Nov
  ];

  for (let i = 0; i < assignments.length; i++) {
    const asgn = assignments[i];
    const plan = schedulePlan[i % schedulePlan.length];

    const startDate = new Date(Date.UTC(plan.year, plan.month, plan.startDay, 8, 0, 0));
    const dueDate = new Date(Date.UTC(plan.year, plan.month, plan.dueDay, 18, 0, 0));

    await prisma.assignment.update({
      where: { id: asgn.id },
      data: {
        title: plan.title,
        startDate: startDate,
        dueDate: dueDate,
        published: true,
        syncCalendar: true,
        workflowStatus: 'PUBLIE'
      }
    });

    console.log(`Updated [${asgn.id.slice(0, 8)}] ${plan.title} -> Due: ${dueDate.toISOString().slice(0, 10)}`);
  }

  console.log('All assignments rescheduled successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
