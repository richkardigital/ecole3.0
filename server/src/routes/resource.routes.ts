import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import { getResources, createResource, deleteResource, togglePublishResource, updateResource } from "../controllers/resource.controller.js";

const router = Router();

router.use(authenticate);

// List resources (can be accessed by everyone in the system)
router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT, ROLES.EDUCATEUR, ROLES.APPRENANT]), getResources);

// Create resource (Admin, Directeur, Enseignant)
router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.ENSEIGNANT]), upload.single('file'), createResource);

// Update resource (Admin, Directeur, Educateur, Enseignant)
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT]), upload.single('file'), updateResource);

// Toggle publish (Admin, Directeur)
router.patch("/:id/toggle-publish", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), togglePublishResource);

// Delete resource (Admin, Directeur, Educateur)
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR, ROLES.ENSEIGNANT]), deleteResource);

export default router;
