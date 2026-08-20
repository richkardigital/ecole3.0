import { Router } from "express";
import { 
  getSubscriptions, 
  getSubscriptionById, 
  saveSubscription, 
  updateSchoolSubscription, 
  renewSubscription,
  getEnrolledSchools,
  toggleSchoolStatus,
  assignSchoolAcademicYear,
  deleteSubscription
} from "../controllers/subscription.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

// Routes publiques (pour la page de tarification / inscription)
router.get("/", getSubscriptions);

// Routes sécurisées (Super Admin)
router.use(authenticate);
router.use(requireRole(["SUPER_ADMIN"]));

// Liste complète des écoles inscrites aux abonnements
router.get("/schools-list", getEnrolledSchools);
router.get("/schools", getEnrolledSchools);

// Gestion des statuts et abonnements d'écoles
router.patch("/school/status", toggleSchoolStatus);
router.patch("/school", updateSchoolSubscription);
router.post("/renew", renewSubscription);
router.post("/school/academic-year", assignSchoolAcademicYear);

// Gestion des formules d'abonnements
router.get("/:id", getSubscriptionById);
router.post("/", saveSubscription);
router.put("/", saveSubscription);
router.delete("/:id", deleteSubscription);

export default router;
