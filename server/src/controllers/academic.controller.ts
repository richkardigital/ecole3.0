import type { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

const createYearSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  isCurrent: z.boolean().optional(),
  schoolIds: z.array(z.string()).optional(),
});

const createTermSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  academicYearId: z.string(),
});

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

export const createAcademicYear = async (req: AuthRequest, res: Response) => {
  try {
    const { name, startDate, endDate, isCurrent, schoolIds } = createYearSchema.parse(req.body);

    const year = await prisma.academicYear.create({
      data: {
        name: name.trim(),
        startDate,
        endDate,
        isCurrent: isCurrent ?? false,
        schools: schoolIds && schoolIds.length > 0 
          ? { connect: schoolIds.map(id => ({ id })) } 
          : undefined
      },
      include: {
        terms: { orderBy: { startDate: "asc" } },
        schools: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { classes: true } },
      },
    });

    res.status(201).json(year);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: "Cette année scolaire existe déjà. Veuillez la sélectionner ou en créer une autre." });
    }
    console.error("Create Academic Year Error:", error);
    res.status(500).json({ message: "Erreur lors de la création de l'année scolaire" });
  }
};

export const getAcademicYears = async (req: AuthRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const querySchoolId = req.query.schoolId as string | undefined;

    let whereClause: any = {};

    if (querySchoolId) {
      whereClause.schools = { some: { id: querySchoolId } };
    } else if (!isSuperAdmin) {
      const userSchoolId = req.user?.schoolId;
      if (userSchoolId) {
        whereClause.schools = { some: { id: userSchoolId } };
      } else {
        // If regular user has no schoolId, return empty
        return res.json([]);
      }
    }

    const years = await prisma.academicYear.findMany({
      where: whereClause,
      include: {
        terms: { orderBy: { startDate: "asc" } },
        schools: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { classes: true } },
      },
      orderBy: { startDate: "desc" },
    });

    res.json(years);
  } catch (error) {
    console.error("Get Academic Years Error:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des années scolaires" });
  }
};

export const getAcademicYear = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const userSchoolId = req.user?.schoolId;

    const whereClause: any = { id };
    if (!isSuperAdmin && userSchoolId) {
      whereClause.schools = { some: { id: userSchoolId } };
    }

    const year = await prisma.academicYear.findFirst({
      where: whereClause,
      include: {
        terms: { orderBy: { startDate: "asc" } },
        schools: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { classes: true } },
      },
    });

    if (!year) {
      return res.status(404).json({ message: "Année scolaire introuvable" });
    }

    res.json(year);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const updateAcademicYear = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, isCurrent, schoolIds } = createYearSchema.parse(req.body);

    if (!id) return res.status(400).json({ message: "ID manquant" });

    const existing = await prisma.academicYear.findUnique({ where: { id: String(id) } });
    if (!existing) return res.status(404).json({ message: "Année scolaire introuvable" });

    // If marking as current, un-mark all others globally
    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { isCurrent: true, NOT: { id: String(id) } },
        data: { isCurrent: false },
      });
    }

    const updatedYear = await prisma.academicYear.update({
      where: { id: String(id) },
      data: {
        name: name.trim(),
        startDate,
        endDate,
        ...(isCurrent !== undefined && { isCurrent }),
        schools: schoolIds ? { set: schoolIds.map(id => ({ id })) } : undefined
      },
      include: {
        terms: { orderBy: { startDate: "asc" } },
        schools: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { classes: true } },
      },
    });

    res.json(updatedYear);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: "Cette année scolaire existe déjà. Veuillez la sélectionner." });
    }
    console.error("Update Academic Year Error:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'année scolaire" });
  }
};

export const toggleAcademicYearActive = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const current = await prisma.academicYear.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ message: "Année scolaire introuvable" });
    }

    const year = await prisma.academicYear.update({
      where: { id },
      data: {
        isActive: !current.isActive,
        // If we deactivate it, and it was current, we should probably unset isCurrent, but let's keep it simple.
        isCurrent: current.isActive ? false : current.isCurrent,
      },
      include: {
        terms: { orderBy: { startDate: "asc" } },
        schools: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { classes: true } },
      },
    });

    res.json(year);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'activation/inactivation" });
  }
};

export const toggleAcademicYearComplete = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const current = await prisma.academicYear.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ message: "Année scolaire introuvable" });
    }

    const willBeCompleted = current.status !== "ACHEVE";

    const year = await prisma.academicYear.update({
      where: { id },
      data: {
        status: willBeCompleted ? "ACHEVE" : "CREE",
        isActive: false,
        isCurrent: false,
      },
      include: {
        terms: { orderBy: { startDate: "asc" } },
        schools: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { classes: true } },
      },
    });

    res.json(year);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la clôture/réouverture" });
  }
};

export const setCurrentAcademicYear = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const current = await prisma.academicYear.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ message: "Année scolaire introuvable" });
    }

    // Un-mark all current globally
    await prisma.academicYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    // Set new current
    const year = await prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true, isActive: true, status: "EN_COURS" },
      include: {
        terms: { orderBy: { startDate: "asc" } },
        schools: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { classes: true } },
      },
    });

    res.json(year);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la définition de l'année en cours" });
  }
};

export const deleteAcademicYear = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "ID manquant" });

    // Check if classes are attached
    const classCount = await prisma.class.count({ where: { academicYearId: id } });
    if (classCount > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer cette année car elle est actuellement associée à ${classCount} classe(s).`,
      });
    }

    await prisma.academicYear.delete({
      where: { id: String(id) },
    });
    res.status(200).json({ message: "Année scolaire supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression de l'année scolaire" });
  }
};

export const createTerm = async (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate, academicYearId } = createTermSchema.parse(req.body);

    const term = await prisma.term.create({
      data: {
        name: name.trim(),
        startDate,
        endDate,
        academicYearId,
      },
    });

    res.status(201).json(term);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de la période" });
  }
};

export const toggleTermStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // OPEN or CLOSED

    if (!id) {
      return res.status(400).json({ message: "ID de la période requis" });
    }

    const term = await prisma.term.update({
      where: { id: id as string },
      data: { status },
    });

    res.json(term);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut de la période" });
  }
};

export const updateTerm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate } = createTermSchema.partial().parse(req.body);

    if (!id) return res.status(400).json({ message: "ID manquant" });

    const updatedTerm = await prisma.term.update({
      where: { id: String(id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      },
    });

    res.json(updatedTerm);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour de la période" });
  }
};

export const deleteTerm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "ID manquant" });

    await prisma.term.delete({
      where: { id: String(id) },
    });
    res.status(200).json({ message: "Période supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression de la période" });
  }
};
