import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getClassHistory, getPrivateHistory, getContacts, uploadChatFile, sendMessage } from "../controllers/chat.controller.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

router.get("/history/class/:classId", getClassHistory);
router.get("/history/user/:userId", getPrivateHistory);
router.get("/contacts", getContacts);
router.post("/send", sendMessage);
router.post("/upload", upload.single('file'), uploadChatFile);

export default router;
