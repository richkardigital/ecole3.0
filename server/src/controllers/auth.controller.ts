/**
 * Contrôleur pour la gestion de l'authentification.
 * Gère l'inscription, la connexion et la génération des tokens JWT.
 */
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma.js";
import { z } from "zod";

// Schéma de validation pour l'inscription d'un utilisateur
const registerSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z.enum(["SUPER_ADMIN", "DIRECTEUR", "ENSEIGNANT", "APPRENANT"]).optional(),
});

// Schéma de validation pour la connexion
const loginSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

/**
 * Enregistre un nouvel utilisateur (principalement utilisé pour les élèves par défaut).
 */
export const register = async (req: Request, res: Response) => {
  try {
    // Validation des données entrantes avec Zod
    const { email: rawEmail, password, firstName, lastName, role } = registerSchema.parse(req.body);
    const email = rawEmail.toLowerCase().trim();

    // Vérification si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà" });
    }

    // Cryptage du mot de passe avec Bcrypt (10 rounds de salage)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création de l'utilisateur dans la base de données
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "APPRENANT", // Rôle par défaut : Elève
      },
    });

    res.status(201).json({ 
      message: "Utilisateur créé avec succès", 
      user: { id: user.id, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'inscription", error });
  }
};

/**
 * Inscription d'un nouveau directeur et de son école (Vitrine)
 */
export const registerSchool = async (req: Request, res: Response) => {
  try {
    const { 
      firstName, lastName, email, password, phone,
      schoolName, schoolVille, schoolAddress, teachingTypeId, schoolTypeId 
    } = req.body;

    if (!email || !password || !firstName || !lastName || !schoolName) {
      return res.status(400).json({ message: "Veuillez renseigner tous les champs obligatoires." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Vérifier si le directeur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: "Un compte avec cette adresse email existe déjà." });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Générer un code d'école unique
    let schoolCode = `SCH-${Date.now().toString().slice(-6)}`;
    const existingSchoolCode = await prisma.school.findUnique({ where: { code: schoolCode } });
    if (existingSchoolCode) {
      schoolCode = `SCH-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    // Créer le directeur et l'école dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer le compte directeur (inactif par défaut en attente de validation par Super Admin)
      const newManager = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone ? phone.trim() : null,
          role: 'DIRECTEUR',
          isActive: false
        }
      });

      // 2. Vérifier et assigner le teachingTypeId & schoolTypeId s'ils sont valides
      let validTeachingTypeId: string | null = null;
      if (teachingTypeId && typeof teachingTypeId === 'string' && teachingTypeId.trim() !== '') {
        try {
          const existingTt = await tx.teachingType.findFirst({
            where: { OR: [{ id: teachingTypeId.trim() }, { name: teachingTypeId.trim() }] }
          });
          if (existingTt) validTeachingTypeId = existingTt.id;
        } catch {
          validTeachingTypeId = null;
        }
      }

      let validSchoolTypeId: string | null = null;
      if (schoolTypeId && typeof schoolTypeId === 'string' && schoolTypeId.trim() !== '') {
        try {
          const existingSt = await tx.schoolType.findFirst({
            where: { OR: [{ id: schoolTypeId.trim() }, { name: schoolTypeId.trim() }] }
          });
          if (existingSt) validSchoolTypeId = existingSt.id;
        } catch {
          validSchoolTypeId = null;
        }
      }

      // 3. Trouver l'abonnement
      const planKey = (req.body.selectedPlan && typeof req.body.selectedPlan === 'string') 
          ? (req.body.selectedPlan.toLowerCase().includes('découverte') ? 'decouverte' : 
             req.body.selectedPlan.toLowerCase().includes('mixte') ? 'mixte' : 'pro') 
          : 'pro';
      
      let subscription = await tx.subscription.findUnique({
        where: { planKey }
      });
      if (!subscription) {
        subscription = await tx.subscription.findFirst({
          where: { isActive: true }
        });
      }

      // Calculer la date de fin d'abonnement selon la période
      let endDate = new Date();
      const isAnnual = req.body.billingPeriod === 'annuel' || Boolean(subscription?.period && subscription.period.toLowerCase().includes('an'));
      if (isAnnual) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 3); // 1 trimestre (3 mois)
      }

      // 4. Créer l'école (inactive / statut PENDING en attente d'activation Super Admin)
      const newSchool = await tx.school.create({
        data: {
          name: schoolName.trim(),
          code: schoolCode,
          ville: schoolVille ? schoolVille.trim() : null,
          address: schoolAddress ? schoolAddress.trim() : null,
          phone: phone ? phone.trim() : null,
          email: normalizedEmail,
          teachingTypeId: validTeachingTypeId,
          schoolTypeId: validSchoolTypeId,
          managerId: newManager.id,
          subscriptionId: subscription?.id || null,
          subscriptionStatus: "PENDING",
          isActive: false,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: endDate
        }
      });

      // 5. Mettre à jour le directeur avec le schoolId
      await tx.user.update({
        where: { id: newManager.id },
        data: { schoolId: newSchool.id }
      });

      // 6. Associer l'école à l'année académique active (sans créer de doublon de nom d'année)
      const currentYear = new Date().getFullYear();
      const defaultYearName = `${currentYear}-${currentYear + 1}`;

      let activeAcademicYear = await tx.academicYear.findFirst({
        where: { isCurrent: true }
      });

      if (!activeAcademicYear) {
        activeAcademicYear = await tx.academicYear.findFirst({
          where: { name: defaultYearName }
        });
      }

      if (!activeAcademicYear) {
        activeAcademicYear = await tx.academicYear.findFirst({
          orderBy: { startDate: 'desc' }
        });
      }

      if (activeAcademicYear) {
        await tx.academicYear.update({
          where: { id: activeAcademicYear.id },
          data: {
            schools: { connect: { id: newSchool.id } }
          }
        });
      } else {
        await tx.academicYear.create({
          data: {
            name: defaultYearName,
            startDate: new Date(`${currentYear}-09-01`),
            endDate: new Date(`${currentYear + 1}-06-30`),
            isCurrent: true,
            schools: { connect: { id: newSchool.id } }
          }
        });
      }

      return { manager: newManager, school: newSchool };
    });

    res.status(201).json({ 
      message: "Demande d'inscription enregistrée avec succès. Votre établissement et votre compte directeur sont en cours de validation par nos administrateurs.",
      school: result.school 
    });

  } catch (error: any) {
    console.error("Erreur registerSchool:", error);
    res.status(500).json({ 
      message: error?.message || "Erreur lors de l'inscription de l'école." 
    });
  }
};

/**
 * Connecte un utilisateur et génère un token JWT.
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Validation des données de connexion
    const { email: rawEmail, password } = loginSchema.parse(req.body);
    const email = rawEmail.toLowerCase().trim();

    // Recherche de l'utilisateur et inclusion de son école
    const user = await prisma.user.findUnique({
      where: { email },
      include: { school: true }
    });

    if (!user) {
      return res.status(400).json({ message: "Identifiants invalides" });
    }

    // Comparaison du mot de passe saisi avec le mot de passe crypté en base
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Identifiants invalides" });
    }

    // Vérification des statuts d'activation (sauf pour le Super Admin)
    if (user.role !== 'SUPER_ADMIN') {
      // 1. Compte ou établissement en attente de validation
      if (user.school?.subscriptionStatus === 'PENDING' || (!user.isActive && user.role === 'DIRECTEUR')) {
        return res.status(403).json({ 
          status: "PENDING_ACTIVATION",
          message: "Votre compte établissement est en cours de validation par nos administrateurs. Vous recevrez un accès complet dès son activation." 
        });
      }

      // 2. Compte utilisateur inactif
      if (!user.isActive) {
        return res.status(403).json({ 
          status: "ACCOUNT_INACTIVE",
          message: "Votre compte utilisateur a été désactivé ou est en attente d'activation. Veuillez contacter l'administrateur de l'école." 
        });
      }

      // 3. École inactive / suspendue
      if (user.school && !user.school.isActive) {
        return res.status(403).json({ 
          status: "SCHOOL_INACTIVE",
          message: "L'accès à cet établissement est actuellement suspendu ou fermé. Veuillez contacter l'administrateur." 
        });
      }
    }

    // Génération du token JWT (valable 1 jour)
    const token = jwt.sign(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      process.env.JWT_SECRET || "secret_par_defaut_a_changer",
      { expiresIn: "1d" }
    );

    // Retour des informations utilisateur et du token au client
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        schoolId: user.schoolId,
        subscriptionStatus: user.school?.subscriptionStatus || "ACTIVE",
        subscriptionEndDate: user.school?.subscriptionEndDate || null
      } 
    });
  } catch (error: any) {
    console.error("Login error:", error);

    if (error.name === 'ZodError') {
      return res.status(400).json({ message: "Validation invalide", errors: error.errors });
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return res.status(500).json({
        message:
          "Connexion base de données impossible. Vérifie DATABASE_URL sur Vercel (idéalement 'Transaction pooler' Supabase + pgbouncer=true) et que le mot de passe DB est correct.",
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(500).json({
        message: "Erreur base de données (Prisma).",
        code: error.code,
      });
    }

    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
};

/**
 * Demande de réinitialisation de mot de passe (Mot de passe oublié)
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email: rawEmail } = req.body;
    if (!rawEmail) {
      return res.status(400).json({ message: "L'adresse email est requise" });
    }

    const email = rawEmail.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Pour des raisons de sécurité, répondre avec succès même si l'email n'existe pas
      return res.json({ 
        message: "Si un compte est associé à cet email, un lien de réinitialisation a été envoyé." 
      });
    }

    // En environnement dev/demo, générer un code à 6 chiffres temporaire ou retourner confirmation
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // On peut enregistrer temporairement un token si désiré ou autoriser la réinitialisation directe par code
    res.json({
      message: "Un code de réinitialisation a été généré.",
      devResetCode: resetCode, // Fourni pour démonstration/test facile
      email: user.email
    });
  } catch (error) {
    console.error("Erreur forgotPassword:", error);
    res.status(500).json({ message: "Erreur lors de la demande de réinitialisation" });
  }
};

/**
 * Réinitialisation effective du mot de passe
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email: rawEmail, newPassword } = req.body;
    if (!rawEmail || !newPassword) {
      return res.status(400).json({ message: "L'email et le nouveau mot de passe sont requis." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });
    }

    const email = rawEmail.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: "Votre mot de passe a été réinitialisé avec succès." });
  } catch (error) {
    console.error("Erreur resetPassword:", error);
    res.status(500).json({ message: "Erreur lors de la réinitialisation du mot de passe" });
  }
};

