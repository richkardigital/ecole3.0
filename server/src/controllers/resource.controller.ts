import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadToSupabase } from "../utils/supabase.js";
import type { ResourceType } from "@prisma/client";

// Get all resources, optionally filtered by niveauId and subjectId
export const getResources = async (req: AuthRequest, res: Response) => {
  try {
    const { niveauId, subjectId } = req.query;
    
    // La Bibliothèque Numérique ne doit afficher que les documents autonomes (hors supports de chapitres de cours)
    let whereClause: any = {
      chapterId: null,
      courseId: null
    };

    // Filter by student level if APPRENANT
    if (req.user?.role === "APPRENANT") {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user.id },
        include: { class: true }
      });
      const studentNiveauIds = Array.from(
        new Set(enrollments.map(e => e.class?.niveauId).filter((n): n is string => Boolean(n)))
      );
      
      if (studentNiveauIds.length === 0) {
        // If student has no enrolled class with niveau, return empty
        return res.json([]);
      }
      whereClause.niveauId = { in: studentNiveauIds };

      if (subjectId && subjectId !== "ALL") {
        whereClause.subjectId = String(subjectId);
      }
    } else {
      if (niveauId && niveauId !== "ALL") {
        whereClause.niveauId = String(niveauId);
      } else {
        whereClause.niveauId = { not: null };
      }

      if (subjectId && subjectId !== "ALL") {
        whereClause.subjectId = String(subjectId);
      }
    }

    // SUPER_ADMIN sees everything. 
    // Others only see published resources, or their own resources.
    if (req.user?.role !== "SUPER_ADMIN") {
      whereClause.OR = [
        { isPublished: true },
        { createdById: req.user?.id }
      ];
    }

    const resources = await prisma.resource.findMany({
      where: whereClause,
      include: {
        niveau: true,
        subject: {
          select: { id: true, name: true, code: true, imageUrl: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(resources);
  } catch (error) {
    console.error("Get Resources Error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des documents" });
  }
};

// Upload a new resource
export const createResource = async (req: AuthRequest, res: Response) => {
  try {
    const { title, niveauId, subjectId, linkUrl } = req.body;
    const file = req.file;

    if (!title) {
      return res.status(400).json({ message: "Le titre est requis." });
    }
    if (!niveauId) {
      return res.status(400).json({ message: "Le niveau est requis." });
    }
    if (!file && !linkUrl) {
      return res.status(400).json({ message: "Un fichier ou un lien est requis." });
    }

    let fileUrl = linkUrl;
    let type: ResourceType = "LIEN"; // fallback

    if (file) {
      // Block images as requested by the user
      if (file.mimetype.startsWith("image/")) {
         return res.status(400).json({ message: "Les images ne sont pas autorisées pour les supports de cours." });
      }

      // Upload to Supabase (using default 'uploads' bucket which exists)
      fileUrl = await uploadToSupabase(file, 'uploads');
      
      if (!fileUrl) {
         return res.status(500).json({ message: "Erreur lors de l'enregistrement du fichier sur le serveur distant." });
      }

      if (file.mimetype === "application/pdf" || file.mimetype.includes("word") || file.mimetype.includes("document")) type = "PDF";
      else if (file.mimetype.startsWith("video/")) type = "VIDEO";
      else if (file.mimetype.startsWith("audio/")) type = "AUDIO";
    } else if (linkUrl) {
      if (linkUrl.includes('youtube.com') || linkUrl.includes('youtu.be') || linkUrl.includes('facebook.com')) {
        type = "VIDEO";
      }
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        url: fileUrl,
        type,
        niveauId,
        subjectId: subjectId && String(subjectId).trim() !== "" && String(subjectId) !== "ALL" ? String(subjectId).trim() : null,
        isGlobal: true, 
        isPublished: req.user?.role === "SUPER_ADMIN", // Auto-publish for SUPER_ADMIN only
        createdById: req.user?.id,
      },
      include: {
        niveau: true,
        subject: {
          select: { id: true, name: true, code: true, imageUrl: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.status(201).json(resource);
  } catch (error) {
    console.error("Create Resource Error:", error);
    res.status(500).json({ message: "Erreur lors de la création du document" });
  }
};

// Delete a resource
export const deleteResource = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    
    // In a full implementation, we should also delete the file from Supabase using its URL.
    await prisma.resource.delete({
      where: { id }
    });

    res.json({ message: "Document supprimé avec succès." });
  } catch (error) {
    console.error("Delete Resource Error:", error);
    res.status(500).json({ message: "Erreur lors de la suppression du document" });
  }
};

// Toggle Publish status
export const togglePublishResource = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { isPublished } = req.body;

    const resource = await prisma.resource.update({
      where: { id },
      data: { isPublished },
      include: {
        niveau: true,
        subject: {
          select: { id: true, name: true, code: true, imageUrl: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    // If validated, send notification to the creator
    if (isPublished && resource.createdById) {
      await prisma.notification.create({
        data: {
          title: "Document validé",
          message: `Votre document "${resource.title}" a été validé et publié dans la bibliothèque globale.`,
          userId: resource.createdById,
        }
      });
    }

    res.json(resource);
  } catch (error) {
    console.error("Validation error:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut" });
  }
};

// Update a resource
export const updateResource = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { title, description, niveauId, subjectId, type: reqType, url: linkUrl, isActive } = req.body;
    const file = req.file;

    const existingResource = await prisma.resource.findUnique({ where: { id } });
    if (!existingResource) {
      return res.status(404).json({ message: "Document non trouvé." });
    }

    let fileUrl = existingResource.url;
    let type = reqType || existingResource.type;

    if (file) {
      if (file.mimetype.startsWith("image/")) {
         return res.status(400).json({ message: "Les images ne sont pas autorisées." });
      }
      const uploadedUrl = await uploadToSupabase(file, 'uploads');
      if (uploadedUrl) {
         fileUrl = uploadedUrl;
         if (file.mimetype === "application/pdf" || file.mimetype.includes("word") || file.mimetype.includes("document")) type = "PDF";
         else if (file.mimetype.startsWith("video/")) type = "VIDEO";
         else if (file.mimetype.startsWith("audio/")) type = "AUDIO";
      } else {
         return res.status(500).json({ message: "Erreur lors de l'enregistrement du nouveau fichier." });
      }
    } else if (linkUrl) {
      fileUrl = linkUrl;
      if (linkUrl.includes('youtube.com') || linkUrl.includes('youtu.be') || linkUrl.includes('facebook.com')) {
        type = "VIDEO";
      } else {
        type = "LIEN";
      }
    }

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        title,
        niveauId,
        ...(subjectId !== undefined ? { subjectId: subjectId && String(subjectId).trim() !== "" && String(subjectId) !== "ALL" ? String(subjectId).trim() : null } : {}),
        url: fileUrl,
        type
      },
      include: {
        niveau: true,
        subject: {
          select: { id: true, name: true, code: true, imageUrl: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.json(resource);
  } catch (error) {
    console.error("Update Resource Error:", error);
    res.status(500).json({ message: "Erreur lors de la modification du document" });
  }
};
