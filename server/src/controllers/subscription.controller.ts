import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { AuthRequest } from "../middleware/auth.js";

// Récupérer tous les abonnements (Public ou Admin)
export const getSubscriptions = async (req: Request, res: Response) => {
  try {
    // Si la requête vient de l'admin (avec token et role SUPER_ADMIN), on renvoie tout.
    // Mais pour l'instant, c'est une route publique sans req.user injecté par defaut si on l'appelle depuis la vitrine.
    // On peut utiliser un query param ?admin=true
    const { all } = req.query;
    
    const where = all === 'true' ? {} : { isActive: true };

    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: { price: 'asc' },
      include: {
        _count: { select: { schools: true } },
        schools: { select: { id: true, name: true, ville: true, subscriptionStatus: true, subscriptionEndDate: true } }
      }
    });
    res.json(subscriptions);
  } catch (error) {
    console.error("Get Subscriptions Error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des abonnements" });
  }
};

// Récupérer un abonnement spécifique (Admin)
export const getSubscriptionById = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        schools: {
          select: {
            id: true,
            name: true,
            code: true,
            ville: true,
            manager: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({ message: "Abonnement non trouvé" });
    }

    res.json(subscription);
  } catch (error) {
    console.error("Get Subscription By Id Error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération de l'abonnement" });
  }
};

// Créer ou modifier un abonnement (Super Admin)
export const saveSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { id, name, planKey, description, price, period, features, isActive } = req.body;

    if (id) {
      const updated = await prisma.subscription.update({
        where: { id },
        data: { name, planKey, description, price, period, features, isActive }
      });
      return res.json(updated);
    } else {
      const created = await prisma.subscription.create({
        data: { name, planKey, description, price, period, features, isActive }
      });
      return res.status(201).json(created);
    }
  } catch (error) {
    console.error("Save Subscription Error:", error);
    res.status(500).json({ message: "Erreur lors de la sauvegarde de l'abonnement" });
  }
};

// Mettre à jour l'abonnement d'une école
export const updateSchoolSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId, subscriptionId } = req.body;

    if (!schoolId || !subscriptionId) {
      return res.status(400).json({ message: "ID de l'école et ID de l'abonnement requis" });
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: { subscriptionId },
      include: { subscription: true }
    });

    res.json({ message: "Abonnement mis à jour avec succès", school: updatedSchool });
  } catch (error) {
    console.error("Update School Subscription Error:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'abonnement de l'école" });
  }
};

// Récupérer la liste complète des écoles inscrites aux abonnements (Super Admin)
export const getEnrolledSchools = async (req: AuthRequest, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        schoolType: { select: { id: true, name: true, code: true } },
        teachingType: { select: { id: true, name: true } },
        academicYears: {
          select: { id: true, name: true, isCurrent: true, status: true },
          orderBy: { name: 'desc' }
        },
        _count: {
          select: { users: true, classes: true }
        }
      }
    });

    res.json(schools);
  } catch (error) {
    console.error("Get Enrolled Schools Error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des écoles inscrites", error });
  }
};

// Activer / Désactiver (Fermer) l'accès d'une école à la plateforme (Super Admin)
export const toggleSchoolStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId, isActive, subscriptionStatus } = req.body;

    if (!schoolId) {
      return res.status(400).json({ message: "ID de l'école requis" });
    }

    const newActiveState = isActive !== undefined ? Boolean(isActive) : true;
    const newSubscriptionStatus = subscriptionStatus || (newActiveState ? "ACTIVE" : "INACTIVE");

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        isActive: newActiveState,
        subscriptionStatus: newSubscriptionStatus
      },
      include: {
        subscription: true,
        academicYears: true,
        manager: true
      }
    });

    // Synchroniser l'état du directeur de l'école
    if (updatedSchool.managerId) {
      await prisma.user.update({
        where: { id: updatedSchool.managerId },
        data: { isActive: newActiveState }
      });
    }

    res.json({
      message: newActiveState 
        ? "Établissement et compte Directeur activés avec succès." 
        : "Établissement et compte Directeur désactivés.",
      school: updatedSchool
    });
  } catch (error) {
    console.error("Toggle School Status Error:", error);
    res.status(500).json({ message: "Erreur lors du changement de statut de l'école", error });
  }
};

// Renouveler un abonnement (Super Admin) - Période Annuelle (1 an)
export const renewSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId, subscriptionId } = req.body;

    if (!schoolId) {
      return res.status(400).json({ message: "ID de l'école requis" });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { subscription: true }
    });

    if (!school) {
      return res.status(404).json({ message: "École non trouvée" });
    }

    const targetSubscriptionId = subscriptionId || school.subscriptionId;
    const activeSub = targetSubscriptionId 
      ? await prisma.subscription.findUnique({ where: { id: targetSubscriptionId } })
      : school.subscription;

    // Calculer la nouvelle date de fin (par défaut +1 an / année scolaire complète)
    let endDate = school.subscriptionEndDate && new Date(school.subscriptionEndDate) > new Date() 
      ? new Date(school.subscriptionEndDate) 
      : new Date();

    if (activeSub?.period && activeSub.period.toLowerCase().includes('trimestre')) {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      // Par an (Année scolaire)
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        subscriptionId: targetSubscriptionId || undefined,
        subscriptionStatus: "ACTIVE",
        isActive: true,
        subscriptionStartDate: school.subscriptionStartDate || new Date(),
        subscriptionEndDate: endDate
      },
      include: {
        subscription: true,
        academicYears: true,
        manager: true
      }
    });

    res.json({
      message: "Abonnement renouvelé pour une année scolaire complète avec succès !",
      school: updatedSchool
    });
  } catch (error) {
    console.error("Renew Subscription Error:", error);
    res.status(500).json({ message: "Erreur lors du renouvellement de l'abonnement" });
  }
};

// Associer une école à une année académique (Super Admin)
export const assignSchoolAcademicYear = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId, academicYearId } = req.body;

    if (!schoolId || !academicYearId) {
      return res.status(400).json({ message: "ID de l'école et ID de l'année académique requis" });
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        academicYears: {
          connect: { id: academicYearId }
        }
      },
      include: {
        academicYears: true,
        subscription: true
      }
    });

    res.json({
      message: "Année académique associée à l'établissement avec succès !",
      school: updatedSchool
    });
  } catch (error) {
    console.error("Assign Academic Year Error:", error);
    res.status(500).json({ message: "Erreur lors de l'association de l'année académique", error });
  }
};

// Supprimer un abonnement (Super Admin)
export const deleteSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: { _count: { select: { schools: true } } }
    });

    if (!sub) return res.status(404).json({ message: "Plan non trouvé" });

    if (sub._count.schools > 0) {
      // Désactiver plutôt que supprimer
      const updated = await prisma.subscription.update({
        where: { id },
        data: { isActive: false }
      });
      return res.json({ message: "Ce plan comporte des écoles inscrites. Il a été désactivé.", subscription: updated });
    }

    await prisma.subscription.delete({ where: { id } });
    res.json({ message: "Plan d'abonnement supprimé avec succès." });
  } catch (error) {
    console.error("Delete Subscription Error:", error);
    res.status(500).json({ message: "Erreur lors de la suppression du plan" });
  }
};
