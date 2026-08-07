import { Router } from "express";
import { getSubscriptions, getSubscriptionById, saveSubscription, updateSchoolSubscription, renewSubscription } from "../controllers/subscription.controller.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

// Routes publiques (pour la page de tarification / inscription)
router.get("/", getSubscriptions);

// Routes sécurisées (Super Admin)
router.use(authenticate);
router.use(requireRole(["SUPER_ADMIN"]));

router.get("/:id", getSubscriptionById);
router.post("/", saveSubscription);
router.put("/", saveSubscription);
router.patch("/school", updateSchoolSubscription);
router.post("/renew", renewSubscription);

export default router;
