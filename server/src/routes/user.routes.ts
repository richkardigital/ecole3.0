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
  deleteUserDocument,
  getUserById,
  toggleStudentCardValidation,
  batchValidateStudentCards
} from "../controllers/user.controller.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

// Profile endpoints (all authenticated roles)
router.get("/profile/me", getMyProfile);
router.put("/profile/me", upload.single('avatar'), updateMyProfile);
router.put("/profile/password", updateUserPassword);
router.post("/profile/documents", upload.single('file'), uploadUserDocument);
router.delete("/profile/documents/:docId", deleteUserDocument);

// Validation des cartes scolaires (Super Admin & Directeur)
router.post("/cards/batch-validate", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), batchValidateStudentCards);
router.patch("/:id/card-validation", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR]), toggleStudentCardValidation);

// Management endpoints
router.post("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('avatar'), createUser);
router.put("/:id/password", updateUserPassword);
router.put("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), upload.single('avatar'), updateUser);
router.delete("/:id", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), deleteUser);
router.get("/:id", getUserById);
router.get("/", requireRole([ROLES.SUPER_ADMIN, ROLES.DIRECTEUR, ROLES.EDUCATEUR]), getUsers);

export default router;
