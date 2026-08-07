import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

const prisma = new PrismaClient();

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
    const { id } = req.params;
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

// Renouveler un abonnement (Super Admin)
export const renewSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId } = req.body;

    if (!schoolId) {
      return res.status(400).json({ message: "ID de l'école requis" });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { subscription: true }
    });

    if (!school || !school.subscription) {
      return res.status(404).json({ message: "École ou abonnement non trouvé" });
    }

    // Calculer la nouvelle date de fin
    let endDate = school.subscriptionEndDate && school.subscriptionEndDate > new Date() 
      ? new Date(school.subscriptionEndDate) 
      : new Date();

    if (school.subscription.period.toLowerCase().includes('trimestre')) {
      endDate.setMonth(endDate.getMonth() + 3);
    } else if (school.subscription.period.toLowerCase().includes('an')) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // +1 mois par defaut
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionEndDate: endDate
      }
    });

    res.json({ message: "Abonnement renouvelé avec succès", school: updatedSchool });
  } catch (error) {
    console.error("Renew Subscription Error:", error);
    res.status(500).json({ message: "Erreur lors du renouvellement de l'abonnement" });
  }
};
