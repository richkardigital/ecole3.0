import type { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadToSupabase } from "../utils/supabase.js";

const createPostSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(1),
  category: z.enum(["GENERAL", "PEDAGOGIE", "ADMINISTRATION", "ETUDIANTS"]).default("GENERAL"),
});

const createCommentSchema = z.object({
  content: z.string().min(1),
});

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category } = createPostSchema.parse(req.body);
    const authorId = req.user?.id;

    if (!authorId) return res.status(401).json({ message: "Unauthorized" });

    let fileUrl = null;
    let fileType = null;

    if (req.file) {
      const publicUrl = await uploadToSupabase(req.file);
      if (publicUrl) {
        fileUrl = publicUrl;
        fileType = req.file.mimetype;
      }
    }

    const post = await prisma.forumPost.create({
      data: {
        title,
        content,
        category,
        fileUrl,
        fileType,
        authorId,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Real-time notification
    req.app.get("io")?.emit("forum:post_created", post);

    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating post", error });
  }
};

export const getPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { category, search } = req.query;
    
    const where: any = {};
    if (category && category !== "ALL") {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: "insensitive" } },
        { content: { contains: String(search), mode: "insensitive" } },
      ];
    }

    if (req.user?.role !== 'SUPER_ADMIN') {
        where.author = {
            OR: [
                { schoolId: req.user?.schoolId },
                { role: 'SUPER_ADMIN' }
            ]
        };
    }

    const posts = await prisma.forumPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error });
  }
};

export const getPost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: "Error fetching post", error });
  }
};

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string }; // Post ID
    const { content } = createCommentSchema.parse(req.body);
    const authorId = req.user?.id;

    if (!authorId) return res.status(401).json({ message: "Unauthorized" });

    const comment = await prisma.forumComment.create({
      data: {
        content,
        postId: id,
        authorId,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Real-time notification
    req.app.get("io")?.emit("forum:comment_created", comment);

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Error creating comment", error });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const post = await prisma.forumPost.findUnique({ where: { id } });

    if (!post) return res.status(404).json({ message: "Post not found" });

    // Allow deletion if user is author OR admin
    if (post.authorId !== userId && userRole !== "SUPER_ADMIN" && userRole !== "DIRECTEUR") {
      return res.status(403).json({ message: "Access denied" });
    }

    await prisma.forumPost.delete({ where: { id } });

    req.app.get("io")?.emit("forum:post_deleted", id);

    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting post", error });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const comment = await prisma.forumComment.findUnique({ where: { id } });

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.authorId !== userId && userRole !== "SUPER_ADMIN" && userRole !== "DIRECTEUR") {
      return res.status(403).json({ message: "Access denied" });
    }

    await prisma.forumComment.delete({ where: { id } });

    req.app.get("io")?.emit("forum:comment_deleted", { id, postId: comment.postId });

    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting comment", error });
  }
};
