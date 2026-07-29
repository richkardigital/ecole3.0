import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { createNewsSchema, updateNewsSchema } from "../validations/news.validation.js";
import { NewsService } from "../services/news.service.js";

export const createNews = async (req: AuthRequest, res: Response) => {
  try {
    const data = createNewsSchema.parse(req.body);
    const news = await NewsService.create(data, req.user!.id);
    res.status(201).json(news);
  } catch (error: any) {
    console.error("Error creating news:", error);
    res.status(400).json({ message: error.message || "Données invalides", error });
  }
};

export const getNews = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { search, isActiveOnly } = req.query;

    const filters: any = {
      search: search ? String(search) : undefined,
      isActiveOnly: isActiveOnly === 'true',
    };
    
    // Regular users filter by their school & role
    if (user.role !== 'SUPER_ADMIN') {
      filters.role = user.role;
      if (user.schoolId) {
        filters.schoolId = user.schoolId;
      }
      filters.isActiveOnly = true; // Non-admins only see active news
    }

    const newsList = await NewsService.findAll(filters);
    res.json(newsList);
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const getNewsById = async (req: AuthRequest, res: Response) => {
  try {
    const news = await NewsService.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: "Annonce introuvable" });
    }
    res.json(news);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const updateNews = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateNewsSchema.parse(req.body);
    const news = await NewsService.update(req.params.id, data);
    res.json(news);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Données invalides", error });
  }
};

export const toggleActiveNews = async (req: AuthRequest, res: Response) => {
  try {
    const news = await NewsService.toggleActive(req.params.id);
    res.json({ message: `Annonce ${news.isActive ? 'activée' : 'désactivée'} avec succès`, news });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Erreur lors du changement de statut", error });
  }
};

export const deleteNews = async (req: AuthRequest, res: Response) => {
  try {
    await NewsService.delete(req.params.id);
    res.json({ message: "Annonce supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
