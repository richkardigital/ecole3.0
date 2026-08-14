import { Response } from "express";
import prisma from "../utils/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createSchoolTypeSchema, updateSchoolTypeSchema } from "../validations/school-type.validation.js";

export const getSchoolTypes = async (req: AuthRequest, res: Response) => {
  try {
    const schoolTypes = await prisma.schoolType.findMany({
      include: {
        _count: { select: { schools: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(schoolTypes);
  } catch (error) {
    console.error("Error fetching school types:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const getSchoolTypeById = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const schoolType = await prisma.schoolType.findUnique({
      where: { id },
      include: {
        schools: {
          select: { id: true, name: true, code: true, ville: true, isActive: true }
        },
        _count: { select: { schools: true } }
      }
    });

    if (!schoolType) {
      return res.status(404).json({ message: "Type d'établissement introuvable" });
    }

    res.json(schoolType);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const createSchoolType = async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchoolTypeSchema.parse(req.body);

    const existing = await prisma.schoolType.findFirst({
      where: {
        OR: [
          { name: { equals: data.name, mode: 'insensitive' } },
          ...(data.code ? [{ code: { equals: data.code, mode: 'insensitive' as const } }] : [])
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ message: "Un type d'établissement avec ce nom ou ce code existe déjà" });
    }

    const schoolType = await prisma.schoolType.create({
      data: {
        name: data.name,
        code: data.code || null,
        description: data.description || null,
        isActive: data.isActive
      }
    });

    res.status(201).json(schoolType);
  } catch (error: any) {
    console.error("Error creating school type:", error);
    res.status(400).json({ message: error.message || "Données invalides", error });
  }
};

export const updateSchoolType = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const data = updateSchoolTypeSchema.parse(req.body);

    if (data.name || data.code) {
      const existing = await prisma.schoolType.findFirst({
        where: {
          NOT: { id },
          OR: [
            ...(data.name ? [{ name: { equals: data.name, mode: 'insensitive' as const } }] : []),
            ...(data.code ? [{ code: { equals: data.code, mode: 'insensitive' as const } }] : [])
          ]
        }
      });

      if (existing) {
        return res.status(400).json({ message: "Un autre type d'établissement utilise déjà ce nom ou code" });
      }
    }

    const schoolType = await prisma.schoolType.update({
      where: { id },
      data
    });

    res.json(schoolType);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Données invalides", error });
  }
};

export const toggleActiveSchoolType = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const current = await prisma.schoolType.findUnique({ where: { id } });

    if (!current) {
      return res.status(404).json({ message: "Type d'établissement introuvable" });
    }

    const updated = await prisma.schoolType.update({
      where: { id },
      data: { isActive: !current.isActive }
    });

    res.json({ message: `Type d'établissement ${updated.isActive ? 'activé' : 'désactivé'} avec succès`, schoolType: updated });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const deleteSchoolType = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    // Check if schools are associated
    const schoolCount = await prisma.school.count({ where: { schoolTypeId: id } });
    if (schoolCount > 0) {
      return res.status(400).json({ 
        message: `Impossible de supprimer ce type d'établissement car ${schoolCount} école(s) y sont rattachée(s). Vous pouvez le désactiver.` 
      });
    }

    await prisma.schoolType.delete({ where: { id } });
    res.json({ message: "Type d'établissement supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

