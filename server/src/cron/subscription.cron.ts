import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Fonction pour vérifier et expirer les abonnements dépassés
 * On pourrait utiliser node-cron, mais pour Vercel ou des environnements sans process continu, 
 * on peut l'appeler via une route secrète ou un setInterval basique si on tourne en continu.
 */
export const checkExpiredSubscriptions = async () => {
  try {
    console.log("[CRON] Vérification des abonnements expirés...");
    const now = new Date();

    const expiredSchools = await prisma.school.updateMany({
      where: {
        subscriptionStatus: "ACTIVE",
        subscriptionEndDate: {
          lt: now
        }
      },
      data: {
        subscriptionStatus: "EXPIRED"
      }
    });

    if (expiredSchools.count > 0) {
      console.log(`[CRON] ${expiredSchools.count} école(s) passée(s) en EXPIRED.`);
    } else {
      console.log("[CRON] Aucune école expirée trouvée.");
    }
  } catch (error) {
    console.error("[CRON] Erreur lors de la vérification des abonnements:", error);
  }
};

// Fonction utilitaire pour lancer le cron en tâche de fond (setInterval 12h)
export const startSubscriptionCron = () => {
  // Exécuter une fois au démarrage
  checkExpiredSubscriptions();

  // Puis toutes les 12 heures (12 * 60 * 60 * 1000 = 43200000 ms)
  setInterval(() => {
    checkExpiredSubscriptions();
  }, 43200000);
};
