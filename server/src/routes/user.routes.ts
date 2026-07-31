import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { createUser, getUsers, updateUser, deleteUser, updateUserPassword } from "../controllers/user.controller.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// SUPER_ADMIN can manage all users
// SCHOOL_ADMIN can manage teachers and students in their school (will implement middleware check later)
router.use(authenticate);

router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('avatar'), createUser);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('avatar'), updateUser);
router.put("/:id/password", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), updateUserPassword);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteUser);
router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getUsers);

export default router;
