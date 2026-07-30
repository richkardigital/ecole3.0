import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Helper to resolve schoolId for an operation
 */
const resolveSchoolId = async (req: AuthRequest, requestedSchoolId?: string): Promise<string | null> => {
  if (requestedSchoolId) return requestedSchoolId;
  if (req.user?.schoolId) return req.user.schoolId;

  // Fallback for SUPER_ADMIN or users without assigned schoolId
  const firstSchool = await prisma.school.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return firstSchool?.id || null;
};

export const getNiveaux = async (req: AuthRequest, res: Response) => {
  try {
    const niveaux = await prisma.niveau.findMany({
      orderBy: { rang: 'asc' },
      include: { 
        _count: { select: { classes: true } }
      }
    });
    
    res.json(niveaux);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des niveaux" });
  }
};

export const getNiveau = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const niveau = await prisma.niveau.findUnique({
      where: { id },
      include: { 
        classes: { select: { id: true, name: true, school: { select: { name: true } } } },
        _count: { select: { classes: true } }
      }
    });
    
    if (!niveau) {
      return res.status(404).json({ message: "Niveau introuvable" });
    }
    
    res.json(niveau);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const createNiveau = async (req: AuthRequest, res: Response) => {
  try {
    const { nom, rang } = req.body;
    
    if (!nom || nom.trim() === '') {
      return res.status(400).json({ message: "Le nom du niveau est requis" });
    }
    
    const trimmedNom = nom.trim();
    
    const existingNiveau = await prisma.niveau.findFirst({
      where: { nom: { equals: trimmedNom, mode: 'insensitive' } }
    });
    
    if (existingNiveau) {
      return res.status(400).json({ message: "Un niveau avec ce nom existe déjà." });
    }
    
    const newNiveau = await prisma.niveau.create({
      data: {
        nom: trimmedNom,
        rang: Number(rang) || 0,
        isActive: true,
      },
      include: {
        _count: { select: { classes: true } }
      }
    });
    
    res.status(201).json(newNiveau);
  } catch (error) {
    console.error("Create Niveau Error:", error);
    res.status(500).json({ message: "Erreur lors de la création du niveau" });
  }
};

export const updateNiveau = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nom, rang } = req.body;
    
    const niveau = await prisma.niveau.findUnique({ where: { id } });
    if (!niveau) return res.status(404).json({ message: "Niveau introuvable" });
    
    const trimmedNom = nom ? nom.trim() : niveau.nom;
    
    const existing = await prisma.niveau.findFirst({
      where: { nom: { equals: trimmedNom, mode: 'insensitive' }, NOT: { id } }
    });
    
    if (existing) {
      return res.status(400).json({ message: "Ce niveau existe déjà." });
    }
    
    const updated = await prisma.niveau.update({
      where: { id },
      data: { 
        nom: trimmedNom, 
        rang: parseInt(rang) !== undefined ? parseInt(rang) : niveau.rang
      },
      include: {
        _count: { select: { classes: true } }
      }
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du niveau" });
  }
};

export const toggleNiveau = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const current = await prisma.niveau.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: "Niveau introuvable" });
    
    const updated = await prisma.niveau.update({
      where: { id },
      data: { isActive: !current.isActive },
      include: {
        _count: { select: { classes: true } }
      }
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du changement de statut" });
  }
};

export const deleteNiveau = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const niveau = await prisma.niveau.findUnique({ where: { id } });
    if (!niveau) return res.status(404).json({ message: "Niveau introuvable" });
    
    // Check constraints
    const classes = await prisma.class.count({ where: { niveauId: id } });
    if (classes > 0) {
      return res.status(400).json({ message: `Impossible de supprimer ce niveau car ${classes} classe(s) y sont rattachées.` });
    }
    
    await prisma.niveau.delete({ where: { id } });
    
    res.json({ message: "Niveau supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression du niveau" });
  }
};
