import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SUBSCRIPTIONS = [
  {
    name: "Plan Découverte",
    planKey: "decouverte",
    description: "Essai gratuit 14 jours",
    price: 0,
    period: "Essai gratuit",
    features: ["Gestion des élèves", "Notes basiques", "Agenda scolaire"],
    isActive: true
  },
  {
    name: "Établissement Pro",
    planKey: "pro",
    description: "La solution complète pour votre établissement",
    price: 45000,
    period: "par trimestre",
    features: ["Gestion illimitée", "Bulletins avancés", "Messagerie et Annonces", "Support prioritaire"],
    isActive: true
  },
  {
    name: "Complexe Mixte",
    planKey: "mixte",
    description: "Sur Devis",
    price: 0,
    period: "sur-mesure",
    features: ["Toutes les options Pro", "Multi-établissements", "Formation sur site", "Personnalisation poussée"],
    isActive: true
  }
];

async function main() {
  console.log('Seeding subscriptions...');

  // 1. Créer ou mettre à jour les abonnements par défaut
  for (const sub of DEFAULT_SUBSCRIPTIONS) {
    await prisma.subscription.upsert({
      where: { planKey: sub.planKey },
      update: {},
      create: sub,
    });
  }

  // 2. Assigner l'abonnement par défaut ('pro') aux écoles existantes qui n'ont pas d'abonnement
  const defaultSub = await prisma.subscription.findUnique({ where: { planKey: 'pro' } });
  
  if (defaultSub) {
    const updatedSchools = await prisma.school.updateMany({
      where: { subscriptionId: null },
      data: { subscriptionId: defaultSub.id }
    });
    console.log(`Assigned default subscription 'pro' to ${updatedSchools.count} existing schools.`);
  }

  console.log('Subscriptions seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
