import type { Response } from "express";
import prisma from "../utils/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";

// ─── Types d'événements calendrier ───────────────────────────────────────────

type CalendarEventType = "EVALUATION" | "DEVOIR" | "DEVOIR_NIVEAU" | "EXAMEN" | "REUNION" | "TRIMESTRE";

interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startDate: Date | null;
  endDate: Date | null;
  color: string;
  description?: string | null;
  courseName?: string | null;
  className?: string | null;
  subjectName?: string | null;
  link?: string;
  isOpen?: boolean; // Quiz actuellement ouvert
  coefficient?: number;
}

const TYPE_COLOR: Record<CalendarEventType, string> = {
  EVALUATION: "#ef4444",    // Rouge
  DEVOIR: "#f97316",        // Orange
  DEVOIR_NIVEAU: "#8b5cf6", // Violet
  EXAMEN: "#1d4ed8",        // Bleu foncé
  REUNION: "#3b82f6",       // Bleu
  TRIMESTRE: "#10b981",     // Vert
};

// ─── Calendrier unifié ────────────────────────────────────────────────────────

export const getCalendarEvents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role as string;
    const { startDate, endDate, academicYearId, termId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 90 * 24 * 3600 * 1000);

    const events: CalendarEvent[] = [];
    const now = new Date();

    // ─── 1. Trimestres ─────────────────────────────────────────────────────────
    {
      const whereYear: any = {};
      if (academicYearId) whereYear.id = String(academicYearId);
      else if (!["SUPER_ADMIN"].includes(userRole)) {
        // Chercher les années liées à l'école de l'utilisateur
        if (req.user?.schoolId) {
          whereYear.schools = { some: { id: req.user.schoolId } };
        }
      }

      const terms = await prisma.term.findMany({
        where: {
          academicYear: whereYear,
          OR: [
            { startDate: { gte: start, lte: end } },
            { endDate: { gte: start, lte: end } },
            { startDate: { lte: start }, endDate: { gte: end } },
          ],
        },
        include: { academicYear: { select: { name: true } } },
      });

      for (const term of terms) {
        events.push({
          id: `term-${term.id}`,
          title: `${term.name} — ${(term as any).academicYear?.name ?? ""}`,
          type: "TRIMESTRE",
          startDate: term.startDate,
          endDate: term.endDate,
          color: TYPE_COLOR.TRIMESTRE,
          description: `Statut: ${term.status}`,
          isOpen: term.status === "OPEN",
        });
      }
    }

    // ─── 2. Quiz / Évaluations & Devoirs ──────────────────────────────────────

    // Construire le filtre selon le rôle
    let quizWhere: any = {
      published: true,
      OR: [
        { startDate: { gte: start, lte: end } },
        { endDate: { gte: start, lte: end } },
        { startDate: null, createdAt: { gte: start, lte: end } },
      ],
    };

    if (termId) quizWhere.termId = String(termId);

    if (userRole === "APPRENANT") {
      // Récupérer la classe et le niveau de l'élève
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: userId, status: "ACTIVE" },
        include: { class: { select: { id: true, niveauId: true } } },
      });

      if (enrollment) {
        const classId = enrollment.classId;
        const niveauId = enrollment.class?.niveauId;

        quizWhere = {
          ...quizWhere,
          OR: [
            { course: { classId } },
            ...(niveauId ? [{ niveauId, isNiveauWide: true }] : []),
          ],
        };
      }

    } else if (userRole === "ENSEIGNANT") {
      // Enseignant: ses cours uniquement
      quizWhere.course = { teacherId: userId };

    } else if (userRole === "DIRECTEUR" || userRole === "EDUCATEUR") {
      // Directeur/Éducateur: tous les cours de son école
      if (req.user?.schoolId) {
        quizWhere.OR = [
          { course: { class: { schoolId: req.user.schoolId } } },
          { niveauId: { not: null } }, // Devoirs de niveau
        ];
      }
    }
    // SUPER_ADMIN: tout voir, pas de filtre supplémentaire

    const quizzes = await prisma.quiz.findMany({
      where: quizWhere,
      include: {
        course: {
          select: {
            subject: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
        subject: { select: { name: true } },
        term: { select: { name: true } },
        niveau: { select: { nom: true } },
      },
    });

    for (const quiz of quizzes) {
      const isOpen = (!quiz.startDate || quiz.startDate <= now) && (!quiz.endDate || quiz.endDate >= now);
      const eventType: CalendarEventType =
        quiz.type === "EVALUATION" ? "EVALUATION" :
        quiz.type === "NIVEAU" ? "DEVOIR_NIVEAU" :
        quiz.type === "EXAMEN" ? "EXAMEN" : "DEVOIR";

      events.push({
        id: `quiz-${quiz.id}`,
        title: quiz.title,
        type: eventType,
        startDate: quiz.startDate,
        endDate: quiz.endDate,
        color: TYPE_COLOR[eventType],
        description: quiz.description,
        subjectName: quiz.subject?.name ?? quiz.course?.subject?.name,
        className: quiz.course?.class?.name ?? quiz.niveau?.nom,
        coefficient: quiz.coefficient,
        link: `/evaluation/quizzes/${quiz.id}`,
        isOpen,
      });
    }

    // ─── 3. Devoirs (Assignments) ──────────────────────────────────────────────
    let assignmentWhere: any = {
      published: true,
      OR: [
        { startDate: { gte: start, lte: end } },
        { dueDate: { gte: start, lte: end } },
        { startDate: null, dueDate: { gte: start, lte: end } },
      ],
    };

    if (termId) assignmentWhere.termId = String(termId);

    if (userRole === "APPRENANT") {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: userId, status: "ACTIVE" },
        include: { class: { select: { id: true, niveauId: true } } },
      });
      if (enrollment) {
        const niveauId = enrollment.class?.niveauId;
        assignmentWhere = {
          ...assignmentWhere,
          OR: [
            { course: { classId: enrollment.classId } },
            ...(niveauId ? [{ niveauId, isNiveauWide: true }] : []),
          ],
        };
      }
    } else if (userRole === "ENSEIGNANT") {
      assignmentWhere.course = { teacherId: userId };
    } else if ((userRole === "DIRECTEUR" || userRole === "EDUCATEUR") && req.user?.schoolId) {
      assignmentWhere.course = { class: { schoolId: req.user.schoolId } };
    }

    const assignments = await prisma.assignment.findMany({
      where: assignmentWhere,
      include: {
        course: {
          select: {
            subject: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
        subject: { select: { name: true } },
        niveau: { select: { nom: true } },
      },
    });

    for (const asgn of assignments) {
      const isNiveauWide = asgn.isNiveauWide || !!asgn.niveauId;
      const eventType: CalendarEventType = isNiveauWide ? "DEVOIR_NIVEAU" :
        asgn.type === "EVALUATION" ? "EVALUATION" :
        asgn.type === "EXAMEN" ? "EXAMEN" : "DEVOIR";

      const isOpen = (!asgn.startDate || asgn.startDate <= now) && asgn.dueDate >= now;

      events.push({
        id: `asgn-${asgn.id}`,
        title: asgn.title,
        type: eventType,
        startDate: asgn.startDate ?? null,
        endDate: asgn.dueDate,
        color: TYPE_COLOR[eventType],
        description: asgn.description,
        subjectName: asgn.subject?.name ?? asgn.course?.subject?.name,
        className: asgn.course?.class?.name ?? asgn.niveau?.nom,
        coefficient: asgn.coefficient,
        link: `/academic/assignments/${asgn.id}`,
        isOpen,
      });
    }

    // ─── 4. Réunions ──────────────────────────────────────────────────────────
    let meetingWhere: any = {
      OR: [
        { startTime: { gte: start, lte: end } },
        { endTime: { gte: start, lte: end } },
      ],
    };

    if (userRole === "APPRENANT") {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: userId, status: "ACTIVE" },
      });
      if (enrollment) meetingWhere.classId = enrollment.classId;
    } else if (userRole === "ENSEIGNANT") {
      meetingWhere.OR = [
        ...(meetingWhere.OR ?? []),
        { hostId: userId },
        { class: { courses: { some: { teacherId: userId } } } },
      ];
    } else if ((userRole === "DIRECTEUR" || userRole === "EDUCATEUR") && req.user?.schoolId) {
      meetingWhere.class = { schoolId: req.user.schoolId };
    }

    const meetings = await prisma.meeting.findMany({
      where: meetingWhere,
      include: {
        host: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } },
      },
    });

    for (const meeting of meetings) {
      events.push({
        id: `meeting-${meeting.id}`,
        title: meeting.title,
        type: "REUNION",
        startDate: meeting.startTime,
        endDate: meeting.endTime,
        color: TYPE_COLOR.REUNION,
        description: meeting.description,
        className: meeting.class?.name,
        link: meeting.link ?? undefined,
      });
    }

    // ─── Trier par date de début ───────────────────────────────────────────────
    events.sort((a, b) => {
      const aDate = a.startDate ?? a.endDate ?? new Date(0);
      const bDate = b.startDate ?? b.endDate ?? new Date(0);
      return aDate.getTime() - bDate.getTime();
    });

    res.json({
      events,
      summary: {
        total: events.length,
        byType: {
          EVALUATION: events.filter(e => e.type === "EVALUATION").length,
          DEVOIR: events.filter(e => e.type === "DEVOIR").length,
          DEVOIR_NIVEAU: events.filter(e => e.type === "DEVOIR_NIVEAU").length,
          EXAMEN: events.filter(e => e.type === "EXAMEN").length,
          REUNION: events.filter(e => e.type === "REUNION").length,
          TRIMESTRE: events.filter(e => e.type === "TRIMESTRE").length,
        },
        open: events.filter(e => e.isOpen).length,
      },
    });
  } catch (error: any) {
    console.error("Calendar events error:", error);
    res.status(500).json({ message: "Erreur chargement calendrier", error: error.message });
  }
};
