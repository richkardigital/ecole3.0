import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_SUBSCRIPTIONS = [
  {
    name: "Pack Standard",
    planKey: "standard",
    description: "Idéal pour les collèges et établissements de proximité (jusqu'à 500 élèves)",
    price: 75000,
    period: "par trimestre",
    features: [
      "Gestion complète des élèves & classes",
      "Notes, évaluations & relevés",
      "Bulletins automatisés officiels",
      "Agenda scolaire synchronisé",
      "Cahier de texte numérique",
      "Support technique par email"
    ],
    isActive: true
  },
  {
    name: "Pack Pro Établissement",
    planKey: "pro",
    description: "La solution complète pour tout le secondaire (collèges & lycées d'excellence)",
    price: 150000,
    period: "par trimestre",
    features: [
      "Tous les avantages du Pack Standard",
      "Collèges & Lycées (1er et 2nd cycles)",
      "Effectifs élèves & professeurs illimités",
      "Bulletins officiels SEEEC + Registre de Conduite",
      "Messagerie directe & Annonces Flash News",
      "Librairie numérique 3.0 (Manuels & Annales)",
      "Accompagnement & Support prioritaire"
    ],
    isActive: true
  },
  {
    name: "Pack Élite Complexe",
    planKey: "elite",
    description: "Pour les grands groupes scolaires, complexes mixtes et réseaux multi-établissements",
    price: 250000,
    period: "par trimestre",
    features: [
      "Tous les avantages du Pack Pro",
      "Multi-établissements & Gestion centralisée",
      "Enseignement Général, Technique & Mixte",
      "Module Examens Blancs & Statistiques avancées",
      "Personnalisation & Intégration SEEEC",
      "Formation des équipes pédagogiques sur site",
      "Chef de projet dédié & Support 24/7"
    ],
    isActive: true
  }
];

export async function seedSubscriptions() {
  console.log('📦 Initialisation des 3 packs d\'abonnement payants...');

  for (const sub of DEFAULT_SUBSCRIPTIONS) {
    await prisma.subscription.upsert({
      where: { planKey: sub.planKey },
      update: {
        name: sub.name,
        description: sub.description,
        price: sub.price,
        period: sub.period,
        features: sub.features,
        isActive: sub.isActive,
      },
      create: sub,
    });
  }

  // Assigner l'abonnement 'pro' aux écoles existantes sans abonnement
  const defaultSub = await prisma.subscription.findUnique({ where: { planKey: 'pro' } });
  
  if (defaultSub) {
    const updatedSchools = await prisma.school.updateMany({
      where: { subscriptionId: null },
      data: { 
        subscriptionId: defaultSub.id,
        subscriptionStatus: 'ACTIVE'
      }
    });
    console.log(`✅ Abonnement par défaut 'Pack Pro' assigné à ${updatedSchools.count} établissements.`);
  }

  console.log('✅ Abonnements initialisés avec succès.');
}

async function main() {
  await seedSubscriptions();
  await prisma.$disconnect();
}

if (process.argv[1]?.includes('seed-subscriptions')) {
  main().catch(err => {
    console.error('Erreur seed subscriptions:', err);
    process.exit(1);
  });
}
