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
    const { name, startDate, endDate, isCurrent } = req.body;

    if (!id) return res.status(400).json({ message: "ID manquant" });

    const existing = await prisma.academicYear.findUnique({ where: { id: String(id) } });
    if (!existing) return res.status(404).json({ message: "Année scolaire introuvable" });

    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { isCurrent: true, NOT: { id: String(id) } },
        data: { isCurrent: false },
      });
    }

    const updatedYear = await prisma.academicYear.update({
      where: { id: String(id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isCurrent !== undefined && { isCurrent }),
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
      return res.status(400).json({ message: "Cette année scolaire existe déjà." });
    }
    console.error("Update Academic Year Error:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour de l'année scolaire" });
  }
};

/**
 * FIX BUG: Route dédiée pour l'affectation / désaffectation des écoles à une année académique.
 * Remplace le patch via PUT qui échouait à cause du schema de validation.
 */
export const updateAcademicYearSchools = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { schoolIds } = req.body as { schoolIds: string[] };

    if (!id) return res.status(400).json({ message: "ID manquant" });
    if (!Array.isArray(schoolIds)) {
      return res.status(400).json({ message: "schoolIds doit être un tableau" });
    }

    const existing = await prisma.academicYear.findUnique({
      where: { id },
      include: { schools: { select: { id: true } } },
    });
    if (!existing) return res.status(404).json({ message: "Année scolaire introuvable" });

    // Calculer les écoles à connecter et à déconnecter
    const currentIds = existing.schools.map((s) => s.id);
    const toConnect = schoolIds.filter((sid) => !currentIds.includes(sid));
    const toDisconnect = currentIds.filter((sid) => !schoolIds.includes(sid));

    const updatedYear = await prisma.academicYear.update({
      where: { id },
      data: {
        schools: {
          connect: toConnect.map((sid) => ({ id: sid })),
          disconnect: toDisconnect.map((sid) => ({ id: sid })),
        },
      },
      include: {
        terms: { orderBy: { startDate: "asc" } },
        schools: { select: { id: true, name: true, ville: true, code: true } },
        _count: { select: { classes: true } },
      },
    });

    res.json({ 
      message: `${toConnect.length} école(s) ajoutée(s), ${toDisconnect.length} école(s) retirée(s)`,
      year: updatedYear 
    });
  } catch (error: any) {
    console.error("Update Academic Year Schools Error:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour des établissements" });
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

/**
 * Retourne les statistiques complètes d'une année académique :
 * élèves, cours, devoirs, bulletins par statut, taux de réussite, évolution par trimestre.
 */
export const getAcademicYearStats = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const year = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        terms: { orderBy: { startDate: "asc" } },
        schools: { select: { id: true, name: true } },
      },
    });

    if (!year) return res.status(404).json({ message: "Année scolaire introuvable" });

    // Filtrage par école si non super admin
    const isSuperAdmin = req.user?.role === "SUPER_ADMIN";
    const schoolId = req.user?.schoolId;

    const classWhere: any = { academicYearId: id };
    if (!isSuperAdmin && schoolId) classWhere.schoolId = schoolId;

    const termIds = year.terms.map((t) => t.id);

    // Classes de l'année
    const classes = await prisma.class.findMany({
      where: classWhere,
      select: { id: true, name: true },
    });
    const classIds = classes.map((c) => c.id);

    // Nombre d'élèves inscrits (unique)
    const studentCount = await prisma.enrollment.groupBy({
      by: ["studentId"],
      where: { classId: { in: classIds } },
    });

    // Cours
    const courseCount = await prisma.course.count({
      where: { classId: { in: classIds } },
    });

    // Devoirs
    const assignmentCount = await prisma.assignment.count({
      where: {
        OR: [
          { termId: { in: termIds } },
          { academicYearId: id },
        ],
      },
    });

    // Bulletins individuels par statut
    const bulletinsByStatus = await prisma.bulletinEleve.groupBy({
      by: ["statut"],
      where: { termId: { in: termIds } },
      _count: { statut: true },
    });

    const bulletinStats = {
      BROUILLON: 0,
      SOUMIS_ENSEIGNANT: 0,
      VALIDE_EDUCATEUR: 0,
      VALIDE_DIRECTEUR: 0,
      VALIDE_SUPER_ADMIN: 0,
      REJETE: 0,
    } as Record<string, number>;

    bulletinsByStatus.forEach((b) => {
      bulletinStats[b.statut] = b._count.statut;
    });

    const totalBulletins = Object.values(bulletinStats).reduce((a, b) => a + b, 0);

    // Taux de réussite (bulletins avec moyenneGenerale >= 10)
    const successCount = await prisma.bulletinEleve.count({
      where: {
        termId: { in: termIds },
        moyenneGenerale: { gte: 10 },
      },
    });

    const allBulletinsWithAvg = await prisma.bulletinEleve.count({
      where: {
        termId: { in: termIds },
        moyenneGenerale: { not: null },
      },
    });

    const tauxReussite =
      allBulletinsWithAvg > 0
        ? parseFloat(((successCount / allBulletinsWithAvg) * 100).toFixed(1))
        : 0;

    // Évolution des moyennes par trimestre
    const termEvolution = await Promise.all(
      year.terms.map(async (term) => {
        const bulletins = await prisma.bulletinEleve.findMany({
          where: {
            termId: term.id,
            moyenneGenerale: { not: null },
          },
          select: { moyenneGenerale: true },
        });

        const avg =
          bulletins.length > 0
            ? parseFloat(
                (
                  bulletins.reduce(
                    (acc, b) => acc + (b.moyenneGenerale as number),
                    0
                  ) / bulletins.length
                ).toFixed(2)
              )
            : null;

        // Bulletins par statut pour ce trimestre
        const termBulletinsByStatus = await prisma.bulletinEleve.groupBy({
          by: ["statut"],
          where: { termId: term.id },
          _count: { statut: true },
        });

        const termBulletinStats: Record<string, number> = {};
        termBulletinsByStatus.forEach((b) => {
          termBulletinStats[b.statut] = b._count.statut;
        });

        return {
          termId: term.id,
          termName: term.name,
          startDate: term.startDate,
          endDate: term.endDate,
          status: term.status,
          averageMoyenne: avg,
          nbEleves: bulletins.length,
          bulletinStats: termBulletinStats,
        };
      })
    );

    // Classement des classes par moyenne
    const classRankings = await Promise.all(
      classes.map(async (cls) => {
        const classBulletins = await prisma.bulletinEleve.findMany({
          where: {
            classId: cls.id,
            termId: { in: termIds },
            moyenneGenerale: { not: null },
          },
          select: { moyenneGenerale: true },
        });

        const avg =
          classBulletins.length > 0
            ? parseFloat(
                (
                  classBulletins.reduce(
                    (acc, b) => acc + (b.moyenneGenerale as number),
                    0
                  ) / classBulletins.length
                ).toFixed(2)
              )
            : null;

        const nbStudents = await prisma.enrollment.count({
          where: { classId: cls.id },
        });

        return {
          classId: cls.id,
          className: cls.name,
          nbStudents,
          averageMoyenne: avg,
        };
      })
    );

    classRankings.sort(
      (a, b) => (b.averageMoyenne ?? 0) - (a.averageMoyenne ?? 0)
    );

    res.json({
      year: {
        id: year.id,
        name: year.name,
        startDate: year.startDate,
        endDate: year.endDate,
        status: year.status,
        isCurrent: year.isCurrent,
        schools: year.schools,
      },
      overview: {
        nbClasses: classes.length,
        nbStudents: studentCount.length,
        nbCourses: courseCount,
        nbAssignments: assignmentCount,
        nbTerms: year.terms.length,
      },
      bulletins: {
        total: totalBulletins,
        byStatus: bulletinStats,
        tauxValidation: totalBulletins > 0
          ? parseFloat(((bulletinStats.VALIDE_SUPER_ADMIN / totalBulletins) * 100).toFixed(1))
          : 0,
      },
      performance: {
        tauxReussite,
        totalEvalues: allBulletinsWithAvg,
        totalReussite: successCount,
      },
      termEvolution,
      classRankings,
    });
  } catch (error) {
    console.error("Erreur stats année académique:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
