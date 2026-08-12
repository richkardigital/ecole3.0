import type { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";

// =============================================
// LIER UN PARENT À UN ENFANT
// =============================================

export const linkParentToChild = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role as string;
    if (!["SUPER_ADMIN", "DIRECTEUR"].includes(role)) {
      return res.status(403).json({ message: "Seuls les administrateurs peuvent lier un parent à un élève." });
    }

    const { parentId, studentId } = req.body;
    if (!parentId || !studentId) {
      return res.status(400).json({ message: "parentId et studentId sont requis" });
    }

    // Vérifier que le parent existe et a le rôle PARENT
    const parent = await prisma.user.findUnique({ where: { id: parentId } });
    if (!parent) return res.status(404).json({ message: "Parent non trouvé" });
    if (parent.role !== "PARENT") {
      return res.status(400).json({ message: "L'utilisateur spécifié n'a pas le rôle PARENT" });
    }

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: "Élève non trouvé" });
    if (student.role !== "APPRENANT") {
      return res.status(400).json({ message: "L'utilisateur cible n'est pas un apprenant" });
    }

    // Restriction DIRECTEUR : seulement pour les élèves de son école
    if (role === "DIRECTEUR" && student.schoolId !== req.user?.schoolId) {
      return res.status(403).json({ message: "Vous ne pouvez lier des parents qu'aux élèves de votre école." });
    }

    const link = await prisma.parentChild.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId },
      update: {}
    });

    res.status(201).json({ message: "Parent lié à l'élève avec succès", link });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la liaison parent-élève", error });
  }
};

// =============================================
// DÉLIER UN PARENT D'UN ENFANT
// =============================================

export const unlinkParentFromChild = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role as string;
    if (!["SUPER_ADMIN", "DIRECTEUR"].includes(role)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const { parentId, studentId } = req.body;
    if (!parentId || !studentId) {
      return res.status(400).json({ message: "parentId et studentId sont requis" });
    }

    await prisma.parentChild.deleteMany({ where: { parentId, studentId } });

    res.json({ message: "Lien parent-élève supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression du lien", error });
  }
};

// =============================================
// GET ENFANTS D'UN PARENT (vue parent)
// =============================================

export const getMyChildren = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role as string;
    if (role !== "PARENT") {
      return res.status(403).json({ message: "Accès réservé aux parents" });
    }

    const children = await prisma.parentChild.findMany({
      where: { parentId: req.user!.id },
      include: {
        student: {
          include: {
            enrollments: {
              where: { status: "ACTIVE" },
              include: {
                class: {
                  include: {
                    niveau: { select: { id: true, nom: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    const result = children.map((c) => ({
      id: c.student.id,
      firstName: c.student.firstName,
      lastName: c.student.lastName,
      matricule: c.student.matricule,
      email: c.student.email,
      avatarUrl: c.student.avatarUrl,
      currentClass: c.student.enrollments[0]?.class?.name || null,
      niveau: c.student.enrollments[0]?.class?.niveau?.nom || null
    }));

    res.json({ children: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des enfants", error });
  }
};

// =============================================
// GET PROGRESSION D'UN ENFANT (vue parent - lecture seule)
// =============================================

export const getChildProgress = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role as string;
    const { studentId } = req.params;

    // PARENT : vérifier le lien
    if (role === "PARENT") {
      const link = await prisma.parentChild.findUnique({
        where: { parentId_studentId: { parentId: req.user!.id, studentId } }
      });
      if (!link) {
        return res.status(403).json({ message: "Vous n'êtes pas le parent de cet élève." });
      }
    } else if (!["SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR"].includes(role)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Récupérer les données de l'élève
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            class: {
              include: {
                niveau: { select: { id: true, nom: true } },
                courses: { include: { subject: true } }
              }
            }
          }
        }
      }
    });

    if (!student) return res.status(404).json({ message: "Élève non trouvé" });

    // Récupérer les devoirs avec statut de propagation
    const propagations = await prisma.assignmentPropagation.findMany({
      where: { studentId },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            type: true,
            workflowStatus: true,
            subject: { select: { name: true } }
          }
        }
      },
      orderBy: { assignment: { dueDate: "asc" } }
    });

    // Résumé des devoirs
    const assignmentSummary = {
      total: propagations.length,
      submitted: propagations.filter((p) => p.submitted).length,
      pending: propagations.filter((p) => !p.submitted).length,
      list: propagations.map((p) => ({
        id: p.assignment.id,
        title: p.assignment.title,
        subject: p.assignment.subject?.name,
        dueDate: p.assignment.dueDate,
        type: p.assignment.type,
        submitted: p.submitted,
        submittedAt: p.submittedAt,
        workflowStatus: p.assignment.workflowStatus
      }))
    };

    // Récupérer les dernières notes
    const grades = await prisma.grade.findMany({
      where: { studentId, isGraded: true },
      include: {
        course: { include: { subject: { select: { name: true } } } },
        term: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    res.json({
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        matricule: student.matricule,
        currentClass: student.enrollments[0]?.class?.name || null,
        niveau: student.enrollments[0]?.class?.niveau?.nom || null
      },
      assignments: assignmentSummary,
      recentGrades: grades.map((g) => ({
        id: g.id,
        value: g.value,
        type: g.type,
        source: g.source,
        subject: g.course?.subject?.name,
        term: g.term?.name,
        comment: g.comment,
        date: g.createdAt
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération de la progression", error });
  }
};

// =============================================
// GET TOUS LES PARENTS D'UNE ÉCOLE (admin)
// =============================================

export const getSchoolParents = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role as string;
    if (!["SUPER_ADMIN", "DIRECTEUR"].includes(role)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const schoolId = req.user?.role === "DIRECTEUR" ? req.user?.schoolId : req.query.schoolId as string;

    const parents = await prisma.user.findMany({
      where: {
        role: "PARENT",
        ...(schoolId && { schoolId })
      },
      include: {
        children: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, matricule: true } }
          }
        }
      }
    });

    res.json({ parents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des parents", error });
  }
};
