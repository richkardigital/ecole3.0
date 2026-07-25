import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { ROLES } from "../config/constants.js";
import { createNews, getNews, updateNews, deleteNews } from "../controllers/news.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), createNews);
router.get("/", getNews);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), updateNews);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), deleteNews);

export default router;
