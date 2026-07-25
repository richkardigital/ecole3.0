import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getTeachingTypes = async (req: Request, res: Response) => {
  try {
    const teachingTypes = await prisma.teachingType.findMany({
      include: {
        _count: {
          select: { schools: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(teachingTypes);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des types d'enseignement" });
  }
};

export const getTeachingType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teachingType = await prisma.teachingType.findUnique({
      where: { id },
      include: {
        schools: {
          select: { id: true, name: true, ville: true, code: true }
        },
        _count: {
          select: { schools: true }
        }
      }
    });
    
    if (!teachingType) {
      return res.status(404).json({ message: "Type d'enseignement introuvable" });
    }
    
    res.json(teachingType);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const createTeachingType = async (req: Request, res: Response) => {
  try {
    const { name, isActive } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: "Le nom du type d'enseignement est obligatoire" });
    }

    const trimmedName = name.trim();
    
    const existing = await prisma.teachingType.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } }
    });
    
    if (existing) {
      return res.status(400).json({ message: "Ce type d'enseignement existe déjà" });
    }
    
    const teachingType = await prisma.teachingType.create({
      data: {
        name: trimmedName,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      },
      include: {
        _count: {
          select: { schools: true }
        }
      }
    });
    
    res.status(201).json(teachingType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création" });
  }
};

export const updateTeachingType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: "Le nom du type d'enseignement est obligatoire" });
    }

    const trimmedName = name.trim();
    
    const existing = await prisma.teachingType.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' }, NOT: { id } }
    });
    
    if (existing) {
      return res.status(400).json({ message: "Ce type d'enseignement existe déjà" });
    }
    
    const teachingType = await prisma.teachingType.update({
      where: { id },
      data: {
        name: trimmedName,
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      },
      include: {
        _count: {
          select: { schools: true }
        }
      }
    });
    
    res.json(teachingType);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

export const toggleTeachingType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const current = await prisma.teachingType.findUnique({
      where: { id }
    });
    
    if (!current) {
      return res.status(404).json({ message: "Type d'enseignement introuvable" });
    }
    
    const teachingType = await prisma.teachingType.update({
      where: { id },
      data: { isActive: !current.isActive },
      include: {
        _count: {
          select: { schools: true }
        }
      }
    });
    
    res.json(teachingType);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du changement de statut" });
  }
};

export const deleteTeachingType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if it's used by any school
    const inUseCount = await prisma.school.count({
      where: { teachingTypeId: id }
    });
    
    if (inUseCount > 0) {
      return res.status(400).json({ 
        message: `Impossible de supprimer ce type car il est actuellement utilisé par ${inUseCount} école(s).` 
      });
    }
    
    await prisma.teachingType.delete({
      where: { id }
    });
    
    res.json({ message: "Type d'enseignement supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};
