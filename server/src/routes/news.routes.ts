import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { ROLES } from "../config/constants.js";
import { createNews, getNews, getNewsById, updateNews, toggleActiveNews, deleteNews } from "../controllers/news.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getNews);
router.get("/:id", getNewsById);
router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), createNews);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), updateNews);
router.patch("/:id/toggle-active", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), toggleActiveNews);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteNews);

export default router;
