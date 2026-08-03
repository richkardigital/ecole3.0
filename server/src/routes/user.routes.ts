import { ROLES } from "../config/constants.js";
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { 
  createUser, 
  getUsers, 
  updateUser, 
  deleteUser, 
  updateUserPassword,
  getMyProfile,
  updateMyProfile,
  uploadUserDocument,
  deleteUserDocument 
} from "../controllers/user.controller.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

// Profile endpoints (all authenticated roles)
router.get("/profile/me", getMyProfile);
router.put("/profile/me", upload.single('avatar'), updateMyProfile);
router.post("/profile/documents", upload.single('file'), uploadUserDocument);
router.delete("/profile/documents/:docId", deleteUserDocument);

// Management endpoints
router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('avatar'), createUser);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('avatar'), updateUser);
router.put("/:id/password", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), updateUserPassword);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteUser);
router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getUsers);

export default router;
