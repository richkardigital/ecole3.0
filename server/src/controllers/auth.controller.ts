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
      schoolName, schoolVille, schoolAddress, teachingTypeId 
    } = req.body;

    // Vérifier si le directeur existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Générer un code d'école unique
    const schoolCode = `SCH-${Date.now().toString().slice(-6)}`;

    // Créer le directeur et l'école dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer le directeur (sans école pour le moment)
      const newManager = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'DIRECTEUR'
        }
      });

      // 2. Vérifier et assigner le teachingTypeId s'il est valide
      let validTeachingTypeId: string | null = null;
      if (teachingTypeId && typeof teachingTypeId === 'string' && teachingTypeId.trim() !== '') {
        const existingTt = await tx.teachingType.findUnique({ where: { id: teachingTypeId } });
        if (existingTt) validTeachingTypeId = existingTt.id;
      }

      // Créer l'école en lui associant le directeur
      const newSchool = await tx.school.create({
        data: {
          name: schoolName,
          code: schoolCode,
          ville: schoolVille,
          address: schoolAddress,
          teachingTypeId: validTeachingTypeId,
          managerId: newManager.id
        }
      });

      // 3. Mettre à jour le directeur avec le schoolId
      await tx.user.update({
        where: { id: newManager.id },
        data: { schoolId: newSchool.id }
      });

      // 4. Créer une année académique par défaut (Année en cours)
      const currentYear = new Date().getFullYear();
      await tx.academicYear.create({
        data: {
          name: `${currentYear}-${currentYear + 1}`,
          startDate: new Date(`${currentYear}-09-01`),
          endDate: new Date(`${currentYear + 1}-06-30`),
          isCurrent: true,
          schoolId: newSchool.id
        }
      });

      return { manager: newManager, school: newSchool };
    });

    res.status(201).json({ 
      message: "École et directeur créés avec succès.",
      school: result.school 
    });

  } catch (error) {
    console.error("Erreur registerSchool:", error);
    res.status(500).json({ message: "Erreur lors de l'inscription de l'école." });
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

    // Vérification si l'école est active (sauf pour le Super Admin)
    if (user.school && !user.school.isActive && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        message: "L'accès à cette école a été suspendu. Veuillez contacter l'administrateur." 
      });
    }

    // Comparaison du mot de passe saisi avec le mot de passe crypté en base
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Identifiants invalides" });
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
        schoolId: user.schoolId 
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

