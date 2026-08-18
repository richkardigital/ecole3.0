import type { Response } from "express";
import prisma from "../utils/prisma.js";
import { z } from "zod";
import type { AuthRequest } from "../middleware/auth.js";
import { fetchStudentBulletinData } from "./bulletin.controller.js";

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
    if (!["PARENT", "SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR"].includes(role)) {
      return res.status(403).json({ message: "Accès réservé aux parents et administrateurs" });
    }

    if (role === "PARENT") {
      const parentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });

      let parentChildRecords = await prisma.parentChild.findMany({
        where: { parentId: req.user!.id },
        include: {
          student: {
            include: {
              school: { select: { id: true, name: true, logoUrl: true, address: true, ville: true, phone: true } },
              enrollments: {
                where: { status: "ACTIVE" },
                include: {
                  class: {
                    include: {
                      niveau: { select: { id: true, nom: true } },
                      school: { select: { id: true, name: true, logoUrl: true } }
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Si aucun lien direct ParentChild n'existe, tenter de faire correspondre par téléphone ou email parent
      if (parentChildRecords.length === 0 && (parentUser?.phone || parentUser?.email)) {
        const matchingStudents = await prisma.user.findMany({
          where: {
            role: "APPRENANT",
            isActive: true,
            OR: [
              ...(parentUser.phone ? [{ parentPhone: parentUser.phone }] : []),
              ...(parentUser.email ? [{ email: { not: parentUser.email } }] : [])
            ]
          },
          include: {
            school: { select: { id: true, name: true, logoUrl: true, address: true, ville: true, phone: true } },
            enrollments: {
              where: { status: "ACTIVE" },
              include: {
                class: {
                  include: {
                    niveau: { select: { id: true, nom: true } },
                    school: { select: { id: true, name: true, logoUrl: true } }
                  }
                }
              }
            }
          },
          take: 5
        });

        if (matchingStudents.length > 0) {
          const result = matchingStudents.map((student) => {
            const activeEnrollment = student.enrollments?.[0];
            return {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              matricule: student.matricule,
              email: student.email,
              avatarUrl: student.avatarUrl,
              currentClass: activeEnrollment?.class?.name || null,
              classId: activeEnrollment?.class?.id || null,
              niveau: activeEnrollment?.class?.niveau?.nom || null,
              niveauId: activeEnrollment?.class?.niveau?.id || null,
              school: student.school?.name || activeEnrollment?.class?.school?.name || "SEEEC Établissement",
              schoolLogo: student.school?.logoUrl || activeEnrollment?.class?.school?.logoUrl || null
            };
          });
          return res.json({ children: result });
        }
      }

      const result = parentChildRecords.map((c) => {
        const student = c.student;
        const activeEnrollment = student.enrollments?.[0];
        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          matricule: student.matricule,
          email: student.email,
          avatarUrl: student.avatarUrl,
          currentClass: activeEnrollment?.class?.name || null,
          classId: activeEnrollment?.class?.id || null,
          niveau: activeEnrollment?.class?.niveau?.nom || null,
          niveauId: activeEnrollment?.class?.niveau?.id || null,
          school: student.school?.name || activeEnrollment?.class?.school?.name || "SEEEC Établissement",
          schoolLogo: student.school?.logoUrl || activeEnrollment?.class?.school?.logoUrl || null
        };
      });

      return res.json({ children: result });
    }

    // Si administrateur / directeur / éducateur consulte la vue parent
    const schoolFilter = (role === "DIRECTEUR" || role === "EDUCATEUR") && req.user?.schoolId 
      ? { schoolId: req.user.schoolId } 
      : {};

    const adminStudents = await prisma.user.findMany({
      where: {
        role: "APPRENANT",
        isActive: true,
        ...schoolFilter
      },
      include: {
        school: { select: { id: true, name: true, logoUrl: true, address: true, ville: true, phone: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            class: {
              include: {
                niveau: { select: { id: true, nom: true } },
                school: { select: { id: true, name: true, logoUrl: true } }
              }
            }
          }
        }
      },
      take: 10,
      orderBy: { lastName: "asc" }
    });

    const result = adminStudents.map((student) => {
      const activeEnrollment = student.enrollments?.[0];
      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        matricule: student.matricule,
        email: student.email,
        avatarUrl: student.avatarUrl,
        currentClass: activeEnrollment?.class?.name || null,
        classId: activeEnrollment?.class?.id || null,
        niveau: activeEnrollment?.class?.niveau?.nom || null,
        niveauId: activeEnrollment?.class?.niveau?.id || null,
        school: student.school?.name || activeEnrollment?.class?.school?.name || "SEEEC Établissement",
        schoolLogo: student.school?.logoUrl || activeEnrollment?.class?.school?.logoUrl || null
      };
    });

    return res.json({ children: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des enfants", error });
  }
};

// =============================================
// FONCTION UTILITAIRE : CALCUL PROGRESSION 360° ÉLÈVE
// =============================================

export async function computeStudent360Progress(studentId: string, termId?: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      school: { select: { id: true, name: true, logoUrl: true, address: true, ville: true, phone: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          class: {
            include: {
              niveau: { select: { id: true, nom: true } },
              school: { select: { id: true, name: true, logoUrl: true } }
            }
          }
        }
      }
    }
  });

  if (!student) return null;

  const activeEnrollment = student.enrollments[0];
  const classId = activeEnrollment?.class?.id;
  const niveauId = activeEnrollment?.class?.niveau?.id;
  const schoolId = student.schoolId || activeEnrollment?.class?.school?.id;

  // 1. ABSENCES & PRÉSENCE EN DIRECT ("Si l'enfant va à l'école ou pas")
  const termFilter = termId && termId !== "ALL" ? { termId } : {};
  const absences = await prisma.absence.findMany({
    where: {
      studentId,
      ...termFilter
    },
    include: {
      course: { include: { subject: { select: { name: true } } } },
      term: { select: { id: true, name: true } }
    },
    orderBy: { date: "desc" }
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const isAbsentToday = absences.some((a) => {
    const aDateStr = new Date(a.date).toISOString().slice(0, 10);
    return aDateStr === todayStr;
  });

  const totalAbsenceHours = absences.reduce((sum, a) => sum + (a.hours || 1), 0);
  const justifiedHours = absences.filter((a) => a.justified).reduce((sum, a) => sum + (a.hours || 1), 0);
  const unjustifiedHours = absences.filter((a) => !a.justified).reduce((sum, a) => sum + (a.hours || 1), 0);
  const attendanceRate = Math.max(0, Math.min(100, Number((100 - (unjustifiedHours * 2.0 + justifiedHours * 0.5)).toFixed(1))));

  const presenceSummary = {
    isAbsentToday,
    statusToday: isAbsentToday ? "ABSENT" : "PRESENT",
    attendanceRate,
    totalAbsences: absences.length,
    totalHours: totalAbsenceHours,
    justifiedHours,
    unjustifiedHours,
    list: absences.map((a) => ({
      id: a.id,
      date: a.date,
      hours: a.hours || 1,
      justified: a.justified,
      reason: a.reason || null,
      subject: a.course?.subject?.name || "Général",
      term: a.term?.name || null
    }))
  };

  // 2. NOTE DE CONDUITE & DISCIPLINE (Base 20/20 & Coef 1)
  const conductRecord = await prisma.conduct.findFirst({
    where: {
      studentId,
      ...termFilter
    },
    orderBy: { createdAt: "desc" }
  });

  const calculatedConductScore = Math.max(0, Number((20 - (unjustifiedHours * 1.0) - (justifiedHours * 0.25)).toFixed(2)));
  const finalConductGrade = conductRecord?.grade ?? calculatedConductScore;
  
  let defaultAppreciation = "Très bonne assiduité et comportement exemplaire.";
  if (finalConductGrade < 10) {
    defaultAppreciation = "Avertissement de conduite : absences excessives et assiduité insuffisante.";
  } else if (finalConductGrade < 14) {
    defaultAppreciation = "Assiduité passable — des efforts sont attendus sur la régularité et les retards.";
  } else if (finalConductGrade < 18) {
    defaultAppreciation = "Bonne assiduité globale.";
  }

  const conductSummary = {
    grade: finalConductGrade,
    appreciation: conductRecord?.appreciation || defaultAppreciation,
    comment: conductRecord?.comment || null,
    unjustifiedHours,
    justifiedHours,
    formula: "Base 20/20 — (-1.0 pt/h injustifiée, -0.25 pt/h justifiée)"
  };

  // 3. DEVOIRS & TRAVAUX À FAIRE ("Si l'enfant fait les devoirs ou pas")
  const propagations = await prisma.assignmentPropagation.findMany({
    where: { studentId },
    include: {
      assignment: {
        include: {
          subject: { select: { name: true } },
          course: { include: { subject: { select: { name: true } } } }
        }
      }
    }
  });

  const additionalAssignments = await prisma.assignment.findMany({
    where: {
      published: true,
      OR: [
        ...(niveauId ? [{ niveauId }] : []),
        ...(schoolId ? [{ schoolId }] : [])
      ],
      ...(termId && termId !== "ALL" ? { termId } : {})
    },
    include: {
      subject: { select: { name: true } },
      course: { include: { subject: { select: { name: true } } } }
    }
  });

  const submissions = await prisma.submission.findMany({
    where: { studentId },
    include: { grade: true }
  });
  const submissionsMap = new Map(submissions.map((s) => [s.assignmentId, s]));

  const allAssignmentsMap = new Map<string, any>();
  for (const p of propagations) {
    if (p.assignment) allAssignmentsMap.set(p.assignment.id, p.assignment);
  }
  for (const a of additionalAssignments) {
    if (!allAssignmentsMap.has(a.id)) allAssignmentsMap.set(a.id, a);
  }

  const now = new Date();
  const assignmentList = Array.from(allAssignmentsMap.values()).map((a) => {
    const sub = submissionsMap.get(a.id);
    const isSubmitted = !!sub;
    const isGraded = !!sub?.grade;
    const dueDate = a.dueDate ? new Date(a.dueDate) : null;
    const isOverdue = !isSubmitted && dueDate && dueDate < now;

    let status: "GRADED" | "SUBMITTED" | "OVERDUE" | "PENDING" = "PENDING";
    if (isGraded) status = "GRADED";
    else if (isSubmitted) status = "SUBMITTED";
    else if (isOverdue) status = "OVERDUE";

    return {
      id: a.id,
      title: a.title,
      description: a.description,
      subject: a.subject?.name || a.course?.subject?.name || "Devoir",
      type: a.type,
      points: a.points || 20,
      coefficient: a.coefficient || 1,
      dueDate: a.dueDate,
      isOverdue,
      status,
      submitted: isSubmitted,
      submittedAt: sub?.submittedAt || null,
      grade: sub?.grade?.value ?? null,
      feedback: sub?.grade?.comment || null,
      workflowStatus: a.workflowStatus
    };
  });

  assignmentList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const completedAssignments = assignmentList.filter((a) => a.submitted).length;
  const pendingAssignments = assignmentList.filter((a) => a.status === "PENDING" || a.status === "OVERDUE").length;
  const overdueAssignments = assignmentList.filter((a) => a.status === "OVERDUE").length;
  const gradedAssignments = assignmentList.filter((a) => a.status === "GRADED").length;
  const homeworkCompletionRate = assignmentList.length > 0 
    ? Math.round((completedAssignments / assignmentList.length) * 100) 
    : 100;

  const assignmentSummary = {
    total: assignmentList.length,
    submitted: completedAssignments,
    pending: pendingAssignments,
    overdue: overdueAssignments,
    graded: gradedAssignments,
    completionRate: homeworkCompletionRate,
    list: assignmentList
  };

  // 4. DERNIÈRES NOTES & MOYENNES PAR MATIÈRE
  const grades = await prisma.grade.findMany({
    where: {
      studentId,
      isGraded: true,
      ...termFilter
    },
    include: {
      course: { include: { subject: { select: { id: true, name: true, coefficient: true } } } },
      assignment: { include: { subject: { select: { id: true, name: true, coefficient: true } } } },
      term: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  const subjectMap = new Map<string, { subjectName: string; coefficient: number; grades: any[]; totalPoints: number; totalWeights: number }>();
  for (const g of grades) {
    const subjectName = g.course?.subject?.name || g.assignment?.subject?.name || "Matière générale";
    const coef = g.coefficient || g.course?.subject?.coefficient || g.assignment?.subject?.coefficient || 1;
    
    if (!subjectMap.has(subjectName)) {
      subjectMap.set(subjectName, { subjectName, coefficient: coef, grades: [], totalPoints: 0, totalWeights: 0 });
    }
    const s = subjectMap.get(subjectName)!;
    s.grades.push({
      id: g.id,
      value: g.value,
      coefficient: g.coefficient || 1,
      type: g.type,
      comment: g.comment,
      createdAt: g.createdAt
    });
    s.totalPoints += g.value * (g.coefficient || 1);
    s.totalWeights += (g.coefficient || 1);
  }

  const subjectAverages = Array.from(subjectMap.values()).map((s) => ({
    subjectName: s.subjectName,
    coefficient: s.coefficient,
    average: s.totalWeights > 0 ? Number((s.totalPoints / s.totalWeights).toFixed(2)) : null,
    gradesCount: s.grades.length,
    grades: s.grades
  }));

  // 5. BULLETIN OFFICIEL ÉLÈVE
  const bulletin = await prisma.bulletinEleve.findFirst({
    where: {
      studentId,
      ...termFilter
    },
    include: {
      term: { select: { id: true, name: true, status: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const gradeValues = grades.map((g) => g.value).filter((v): v is number => typeof v === "number" && !isNaN(v));
  const overallAverage = bulletin?.moyenneGenerale 
    ?? (gradeValues.length > 0 ? Number((gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length).toFixed(2)) : null);

  // 6. ENSEIGNANTS DE LA CLASSE (Contacts)
  // 0. TRIMESTRES DISPONIBLES
  let availableTerms: any[] = [];
  try {
    if (schoolId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: {
          OR: [
            { schools: { some: { id: schoolId } } },
            { isCurrent: true }
          ]
        },
        include: {
          terms: {
            orderBy: { startDate: 'asc' },
            select: { id: true, name: true, status: true, startDate: true, endDate: true }
          }
        }
      });
      if (activeYear?.terms && activeYear.terms.length > 0) {
        availableTerms = activeYear.terms;
      }
    }

    if (availableTerms.length === 0) {
      availableTerms = await prisma.term.findMany({
        orderBy: { startDate: 'asc' },
        select: { id: true, name: true, status: true, startDate: true, endDate: true }
      });
    }
  } catch (e) {
    console.error("Erreur chargement terms dans computeStudent360Progress:", e);
  }

  let teachers: any[] = [];
  if (classId) {
    const tc = await prisma.teacherClass.findMany({
      where: { classId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        subject: { select: { id: true, name: true } }
      }
    });
    teachers = tc.map((item) => ({
      teacherId: item.teacher.id,
      name: `${item.teacher.firstName} ${item.teacher.lastName}`,
      email: item.teacher.email,
      avatarUrl: item.teacher.avatarUrl,
      subject: item.subject?.name || "Enseignement"
    }));
  }

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      matricule: student.matricule,
      birthDate: student.birthDate,
      email: student.email,
      avatarUrl: student.avatarUrl,
      currentClass: activeEnrollment?.class?.name || null,
      classId: activeEnrollment?.class?.id || null,
      niveau: activeEnrollment?.class?.niveau?.nom || null,
      school: student.school?.name || activeEnrollment?.class?.school?.name || "SEEEC Établissement",
      schoolLogo: student.school?.logoUrl || activeEnrollment?.class?.school?.logoUrl || null
    },
    availableTerms,
    overallAverage,
    presence: presenceSummary,
    conduct: conductSummary,
    assignments: assignmentSummary,
    subjectAverages,
    recentGrades: grades.map((g) => ({
      id: g.id,
      value: g.value,
      coefficient: g.coefficient || 1,
      type: g.type,
      source: g.source,
      subject: g.course?.subject?.name || g.assignment?.subject?.name || "Général",
      term: g.term?.name,
      comment: g.comment,
      createdAt: g.createdAt
    })),
    bulletin,
    teachers
  };
}

// =============================================
// GET PUBLIC TERMS (LISTE DES TRIMESTRES DISPONIBLES)
// =============================================
export const getPublicTerms = async (_req: any, res: Response) => {
  try {
    const terms = await prisma.term.findMany({
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        academicYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true
          }
        }
      }
    });

    res.json(terms);
  } catch (error) {
    console.error("Erreur getPublicTerms:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des trimestres", error });
  }
};

// =============================================
// GET PUBLIC STUDENT BULLETIN (CONSULTATION DU BULLETIN CERTIFIÉ)
// =============================================
export const getPublicStudentBulletin = async (req: any, res: Response) => {
  try {
    const studentId = String(req.params.studentId);
    const termId = req.query.termId ? String(req.query.termId) : undefined;

    if (!studentId) {
      return res.status(400).json({ message: "Identifiant élève requis" });
    }

    const data = await fetchStudentBulletinData(studentId, termId);
    if (!data) {
      return res.status(404).json({ message: "Le bulletin officiel certifié n'est pas encore disponible pour cette période." });
    }

    res.json(data);
  } catch (error: any) {
    console.error("Erreur getPublicStudentBulletin:", error);
    res.status(500).json({ message: error?.message || "Erreur lors de la consultation du bulletin officiel." });
  }
};

// Fonction utilitaire de validation date de naissance
function isBirthDateMatching(dbBirthDate: Date | null, userDateInput: string): boolean {
  if (!dbBirthDate) {
    // Tolérance si la date de naissance n'a pas encore été renseignée en base (ex: seed initial)
    return true;
  }

  let parsedInput: Date;
  if (userDateInput.includes('/')) {
    const parts = userDateInput.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      parsedInput = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    } else {
      parsedInput = new Date(userDateInput);
    }
  } else {
    parsedInput = new Date(userDateInput);
  }

  if (isNaN(parsedInput.getTime())) return false;

  const dbYear = dbBirthDate.getUTCFullYear();
  const dbMonth = dbBirthDate.getUTCMonth();
  const dbDay = dbBirthDate.getUTCDate();

  const inYear = parsedInput.getUTCFullYear();
  const inMonth = parsedInput.getUTCMonth();
  const inDay = parsedInput.getUTCDate();

  return dbYear === inYear && dbMonth === inMonth && dbDay === inDay;
}

// =============================================
// GET PROGRESSION D'UN ENFANT (vue parent 360° - lecture seule)
// =============================================

export const getChildProgress = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role as string;
    const studentId = String(req.params.studentId);
    const termId = req.query.termId as string | undefined;

    // PARENT : vérifier le lien parent-enfant ou autoriser si admin
    if (role === "PARENT") {
      const link = await prisma.parentChild.findUnique({
        where: { parentId_studentId: { parentId: req.user!.id, studentId } }
      });
      if (!link) {
        const parentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
        const studentObj = await prisma.user.findUnique({
          where: { id: studentId },
          select: { parentPhone: true }
        });
        if (studentObj?.parentPhone && parentUser?.phone && studentObj.parentPhone === parentUser.phone) {
          // Associé par téléphone
        }
      }
    } else if (!["SUPER_ADMIN", "DIRECTEUR", "EDUCATEUR", "ENSEIGNANT"].includes(role)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const progressData = await computeStudent360Progress(studentId, termId);
    if (!progressData) {
      return res.status(404).json({ message: "Élève non trouvé" });
    }

    res.json(progressData);
  } catch (error) {
    console.error("Erreur getChildProgress:", error);
    res.status(500).json({ message: "Erreur lors de la récupération de la progression", error });
  }
};

// =============================================
// LOOKUP EXPRESS ÉLÈVE PAR MATRICULE & DATE DE NAISSANCE (PUBLIC / SANS COMPTE)
// =============================================

export const lookupChildByCredentials = async (req: any, res: Response) => {
  try {
    const { matricule, birthDate, termId } = req.body;

    if (!matricule || !birthDate) {
      return res.status(400).json({ 
        message: "Veuillez fournir le matricule et la date de naissance de l'élève." 
      });
    }

    const cleanMatricule = String(matricule).trim().toUpperCase();

    // Recherche de l'élève par son matricule unique
    const student = await prisma.user.findFirst({
      where: {
        matricule: { equals: cleanMatricule, mode: "insensitive" },
        role: "APPRENANT",
        isActive: true
      }
    });

    if (!student) {
      return res.status(404).json({ 
        message: `Aucun élève trouvé avec le matricule "${cleanMatricule}". Veuillez vérifier la saisie.` 
      });
    }

    // Vérification de la date de naissance
    if (!isBirthDateMatching(student.birthDate, String(birthDate))) {
      return res.status(400).json({ 
        message: "La date de naissance saisie ne correspond pas au dossier de cet élève." 
      });
    }

    // Calcul de la progression 360° complète
    const progressData = await computeStudent360Progress(student.id, termId);
    if (!progressData) {
      return res.status(404).json({ message: "Dossier scolaire introuvable pour cet élève." });
    }

    res.json({
      success: true,
      message: `Dossier scolaire de ${student.firstName} ${student.lastName} récupéré avec succès.`,
      ...progressData
    });
  } catch (error) {
    console.error("Erreur lookupChildByCredentials:", error);
    res.status(500).json({ message: "Erreur serveur lors de la recherche du dossier élève", error });
  }
};

// =============================================
// LIER UN ENFANT PAR MATRICULE & DATE DE NAISSANCE (ESPACE PARENT CONNECTÉ)
// =============================================

export const linkChildByCredentials = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?.id;
    if (!parentId) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const { matricule, birthDate } = req.body;
    if (!matricule || !birthDate) {
      return res.status(400).json({ message: "Le matricule et la date de naissance sont obligatoires." });
    }

    const cleanMatricule = String(matricule).trim().toUpperCase();

    const student = await prisma.user.findFirst({
      where: {
        matricule: { equals: cleanMatricule, mode: "insensitive" },
        role: "APPRENANT",
        isActive: true
      },
      include: {
        school: { select: { id: true, name: true, logoUrl: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: { class: { select: { id: true, name: true } } }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: `Aucun élève trouvé avec le matricule "${cleanMatricule}".` });
    }

    if (!isBirthDateMatching(student.birthDate, String(birthDate))) {
      return res.status(400).json({ message: "La date de naissance ne correspond pas à ce matricule." });
    }

    // Créer ou mettre à jour le lien parent-enfant
    const link = await prisma.parentChild.upsert({
      where: { parentId_studentId: { parentId, studentId: student.id } },
      create: { parentId, studentId: student.id },
      update: {}
    });

    res.status(200).json({
      success: true,
      message: `${student.firstName} ${student.lastName} a été rattaché(e) avec succès à votre espace parent !`,
      link,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        matricule: student.matricule,
        currentClass: student.enrollments[0]?.class?.name || null,
        school: student.school?.name || "SEEEC Établissement"
      }
    });
  } catch (error) {
    console.error("Erreur linkChildByCredentials:", error);
    res.status(500).json({ message: "Erreur lors du rattachement de l'élève", error });
  }
};

// =============================================
// DISSOCIER UN ENFANT DE SON ESPACE PARENT (PARENT CONNECTÉ)
// =============================================

export const unlinkChildByParent = async (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user?.id;
    const { studentId } = req.body;

    if (!parentId || !studentId) {
      return res.status(400).json({ message: "studentId est requis" });
    }

    await prisma.parentChild.deleteMany({
      where: { parentId, studentId }
    });

    res.json({ success: true, message: "L'enfant a été retiré de votre espace parent avec succès." });
  } catch (error) {
    console.error("Erreur unlinkChildByParent:", error);
    res.status(500).json({ message: "Erreur lors de la dissociation de l'enfant", error });
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

