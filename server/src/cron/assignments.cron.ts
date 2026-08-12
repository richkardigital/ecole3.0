import prisma from "../utils/prisma.js";
import { calculateAndSaveAnnualAverages } from "../services/averages.js";

/**
 * Cron jobs pour la gestion des devoirs et des moyennes
 * Utilise setInterval (compatible Vercel / environnements sans processus persistant)
 *
 * - Toutes les 24h : Clôture des devoirs dont la date limite est passée
 * - Toutes les 24h : Vérification des trimestres clos → calcul des moyennes
 */

// =============================================
// CLÔTURE AUTOMATIQUE DES DEVOIRS
// =============================================

const checkExpiredAssignments = async () => {
  console.log("[CRON] Checking expired assignments...");
  try {
    const now = new Date();

    // Clôturer les devoirs dont la date limite est passée
    const updated = await prisma.assignment.updateMany({
      where: {
        dueDate: { lt: now },
        workflowStatus: { in: ["PUBLIE", "EN_CORRECTION"] }
      },
      data: { workflowStatus: "CLOTURE" }
    });

    if (updated.count > 0) {
      console.log(`[CRON] ${updated.count} devoir(s) clôturé(s) automatiquement`);

      // Log dans AuditLog
      await prisma.auditLog.create({
        data: {
          action: "AUTO_CLOTURER_DEVOIRS",
          entity: "Assignment",
          metadata: JSON.stringify({ count: updated.count, executedAt: now.toISOString() })
        }
      });
    }
  } catch (error) {
    console.error("[CRON] Erreur lors de la clôture des devoirs :", error);
  }
};

// =============================================
// CALCUL AUTOMATIQUE DES MOYENNES DE FIN DE TRIMESTRE
// =============================================

const checkClosedTerms = async () => {
  console.log("[CRON] Checking closed terms for average calculation...");
  try {
    const now = new Date();

    // Trouver les trimestres dont la date de fin est passée mais encore OPEN
    const termsToClose = await prisma.term.findMany({
      where: {
        endDate: { lt: now },
        status: "OPEN"
      },
      include: {
        academicYear: {
          include: { classes: { select: { id: true } } }
        }
      }
    });

    for (const term of termsToClose) {
      // Fermer le trimestre
      await prisma.term.update({
        where: { id: term.id },
        data: { status: "CLOSED" }
      });

      console.log(`[CRON] Trimestre "${term.name}" fermé. Calcul des moyennes...`);

      // Calculer les moyennes annuelles pour chaque classe
      for (const cls of (term as any).academicYear.classes) {
        try {
          const result = await calculateAndSaveAnnualAverages(cls.id, term.academicYearId);
          console.log(`[CRON] Moyennes calculées classe ${cls.id}: ${result.processed} enregistrements`);
        } catch (err: any) {
          console.error(`[CRON] Erreur calcul classe ${cls.id}:`, err.message);
        }
      }

      await prisma.auditLog.create({
        data: {
          action: "AUTO_CALCUL_MOYENNES_TRIMESTRE",
          entity: "Term",
          entityId: term.id,
          metadata: JSON.stringify({
            termName: term.name,
            academicYearId: term.academicYearId,
            executedAt: now.toISOString()
          })
        }
      });
    }
  } catch (error) {
    console.error("[CRON] Erreur lors de la vérification des trimestres :", error);
  }
};

// =============================================
// EXPORT DES FONCTIONS DE DÉMARRAGE
// =============================================

export const startAssignmentCron = () => {
  // Exécuter une fois au démarrage
  checkExpiredAssignments();
  // Puis toutes les 24 heures
  setInterval(() => {
    checkExpiredAssignments();
  }, 24 * 60 * 60 * 1000);

  console.log("[CRON] Assignment cron started: every 24h");
};

export const startTermAverageCron = () => {
  // Exécuter une fois au démarrage (avec délai de 5min pour ne pas surcharger le boot)
  setTimeout(() => {
    checkClosedTerms();
  }, 5 * 60 * 1000);

  // Puis toutes les 24 heures
  setInterval(() => {
    checkClosedTerms();
  }, 24 * 60 * 60 * 1000);

  console.log("[CRON] Term average cron started: every 24h");
};
