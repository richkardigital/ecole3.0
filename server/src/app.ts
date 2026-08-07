/**
 * Point d'entrée principal de l'application Express.
 * Configure les middlewares, les routes et la politique de sécurité.
 */
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import xss from "xss-clean";

// Note : dotenv.config() est appelé dans index.ts AVANT l'import de ce module.

// Importation des routes
import authRoutes from "./routes/auth.routes.js";
import schoolRoutes from "./routes/school.routes.js";
import userRoutes from "./routes/user.routes.js";
import academicRoutes from "./routes/academic.routes.js";
import classRoutes from "./routes/class.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import courseRoutes from "./routes/course.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import gradeRoutes from "./routes/grade.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import reportCardRoutes from "./routes/report-card.routes.js";
import forumRoutes from "./routes/forum.routes.js";
import absenceRoutes from "./routes/absence.routes.js";
import conductRoutes from "./routes/conduct.routes.js";
import auditLogRoutes from "./routes/audit-log.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import newsRoutes from "./routes/news.routes.js";
import teachingTypeRoutes from './routes/teaching-type.routes.js';
import schoolTypeRoutes from './routes/school-type.routes.js';
import niveauRoutes from './routes/niveau.routes.js';
import uploadRoutes from "./routes/upload.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import bulletinRoutes from "./routes/bulletin.routes.js";
import calendarRoutes from "./routes/calendar.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";

const app = express();

// Configuration de CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || true,
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Sécurisation des headers HTTP avec Helmet
app.use(helmet()); // Configuration stricte par défaut (HSTS, NoSniff, XSSFilter)

// Global Rate Limiting : Empêche le spam excessif et les attaques DDoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limite chaque IP à 1000 requêtes par fenêtre
  message: "Trop de requêtes depuis cette IP, veuillez réessayer après 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Journalisation des requêtes HTTP en mode développement
app.use(morgan("dev"));

// Analyse du corps des requêtes en format JSON (limité à 10kb pour éviter les overloads)
app.use(express.json({ limit: "10kb" }));

// Nettoyage des données contre les attaques XSS
app.use(xss());

// Protection contre la pollution des paramètres HTTP
app.use(hpp());

// --- Gestion des fichiers statiques ---
// Note : Pour Vercel, les fichiers locaux ne persistent pas. 
// La migration vers Supabase Storage est privilégiée pour la production.
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- Définition des Routes API ---
app.use("/api/auth", authRoutes);           // Authentification (Login, Register)
app.use("/api/schools", schoolRoutes);     // Gestion des écoles
app.use("/api/users", userRoutes);         // Gestion des utilisateurs
app.use("/api/academic", academicRoutes);   // Années scolaires et trimestres
app.use("/api/classes", classRoutes);       // Classes et inscriptions
app.use("/api/subjects", subjectRoutes);   // Matières
app.use("/api/courses", courseRoutes);     // Cours et supports
app.use("/api/assignments", assignmentRoutes); // Devoirs et soumissions
app.use("/api/dashboard", dashboardRoutes); // Statistiques du tableau de bord
app.use("/api/grades", gradeRoutes);       // Notes et bulletins
app.use("/api/notifications", notificationRoutes); // Notifications et annonces
app.use("/api/chat", chatRoutes);           // Messagerie instantanée
app.use("/api/quizzes", quizRoutes);       // Quiz et évaluations
app.use("/api/report-cards", reportCardRoutes); // Bulletins scolaires
app.use("/api/meetings", meetingRoutes);        // Réunions et classes virtuelles
app.use("/api/news", newsRoutes);               // Actualités et annonces scolaires
app.use("/api/forum", forumRoutes);             // Forum École
app.use("/api/absences", absenceRoutes);        // Gestion des absences
app.use("/api/audit-logs", auditLogRoutes);     // Logs d'audit
app.use("/api/teaching-types", teachingTypeRoutes); // Types d'enseignement
app.use("/api/school-types", schoolTypeRoutes);     // Types d'établissement
app.use("/api/niveaux", niveauRoutes);             // Niveaux scolaires
app.use("/api/upload", uploadRoutes);
app.use("/api/resources", resourceRoutes);             // Ressources pédagogiques
app.use("/api/academic-years", academicRoutes);     // Alias Années scolaires
app.use("/api/uploads", uploadRoutes);             // Upload de fichiers
app.use("/api/bulletins", bulletinRoutes);         // Bulletins individuels (workflow)
app.use("/api/calendar", calendarRoutes);          // Calendrier unifié
app.use("/api/subscriptions", subscriptionRoutes); // Gestion des abonnements

import { globalErrorHandler } from "./middleware/error-handler.js";

// Route de test pour vérifier que l'API est en ligne
app.get("/", (req, res) => {
  res.json({ message: "API Ecole Connectée is running" });
});

// --- Gestion globale des erreurs ---
app.use(globalErrorHandler);

export default app;
