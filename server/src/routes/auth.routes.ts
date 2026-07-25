/**
 * Définition des routes pour l'authentification.
 * Ces routes permettent aux utilisateurs de se connecter et de s'enregistrer.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, register, registerSchool, forgotPassword, resetPassword } from "../controllers/auth.controller.js";

// Protection contre le Brute Force sur la connexion :
// Désactivé en développement pour faciliter les tests, et 100 tentatives/15min en production
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 20 : 1000,
  skip: () => process.env.NODE_ENV !== "production",
  message: { message: "Trop de tentatives de connexion depuis cette adresse IP, veuillez réessayer après 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// Route d'inscription d'un directeur + école (Site vitrine)
router.post("/register-school", registerSchool);

// Route pour l'inscription d'un nouvel utilisateur
router.post("/register", register);

// Route pour la connexion avec protection Brute Force
router.post("/login", loginLimiter, login);

// Routes pour mot de passe oublié
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
