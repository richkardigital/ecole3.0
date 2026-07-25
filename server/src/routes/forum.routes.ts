import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createPost,
  getPosts,
  getPost,
  createComment,
  deletePost,
  deleteComment
} from "../controllers/forum.controller.js";

const router = Router();

router.use(authenticate);

// Posts
router.get("/", getPosts);
router.post("/", upload.single('file'), createPost);
router.get("/:id", getPost);
router.delete("/:id", deletePost);

// Comments
router.post("/:id/comments", createComment);
router.delete("/comments/:id", deleteComment);

export default router;
