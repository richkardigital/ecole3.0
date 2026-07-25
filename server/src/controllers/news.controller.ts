import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { createNewsSchema, updateNewsSchema } from "../validations/news.validation.js";
import { NewsService } from "../services/news.service.js";

export const createNews = async (req: AuthRequest, res: Response) => {
  try {
    const data = createNewsSchema.parse(req.body);
    const news = await NewsService.create(data, req.user!.id);
    res.status(201).json(news);
  } catch (error) {
    console.error("Error creating news:", error);
    res.status(400).json({ message: "Invalid data", error });
  }
};

export const getNews = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const filters: any = {};
    
    // Si l'utilisateur appartient à une école, il voit les news de cette école
    if (user.schoolId) {
        filters.schoolId = user.schoolId;
    }

    const newsList = await NewsService.findAll(filters);
    res.json(newsList);
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateNews = async (req: AuthRequest, res: Response) => {
  try {
    const data = updateNewsSchema.parse(req.body);
    const news = await NewsService.update(req.params.id, data);
    res.json(news);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error });
  }
};

export const deleteNews = async (req: AuthRequest, res: Response) => {
  try {
    await NewsService.delete(req.params.id);
    res.json({ message: "News deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
