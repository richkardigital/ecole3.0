import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  Book,
  User,
  Trash2,
  Loader2,
  Users,
  Search,
  Eye,
  RefreshCw,
  LayoutGrid,
  List,
  GraduationCap,
  BookOpen,
  Pencil,
  Award,
  Mail,
  Phone,
  Building2,
  School,
  CheckCircle2,
  Calendar,
  X,
} from "lucide-react";
import { getSubjectIllustration } from "@/lib/subjectIllustrations";
import ConfirmationModal from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  matricule?: string;
  avatarUrl?: string;
  classes?: string[];
  schools?: { id: string; name: string; code?: string; ville?: string }[];
}

interface CourseModel {
  id: string;
  coefficient: number;
  subject?: { id: string; name: string; code?: string; imageUrl?: string };
  niveau?: { id: string; nom: string };
  teachers?: TeacherInfo[];
  teachersCount?: number;
  _count?: { chapters: number; assignments: number };
  schoolsCount?: number;
  academicYear?: { id: string; name: string };
  academicYearId?: string;
}

interface Option {
  id: string;
  name: string;
  nom?: string;
}

const Courses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isDirecteur = user?.role === "DIRECTEUR";
  const isEnseignant = user?.role === "ENSEIGNANT";
  const isEducateur = user?.role === "EDUCATEUR";
  const isAdmin = isSuperAdmin || isDirecteur;

  const [courses, setCourses] = useState<CourseModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">(
    isSuperAdmin ? "TABLE" : "GRID",
  );

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState("ALL");
  const [selectedNiveauFilter, setSelectedNiveauFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [niveauxList, setNiveauxList] = useState<Option[]>([]);
  const [yearsList, setYearsList] = useState<Option[]>([]);

  // Modals state
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Teachers Details Modal
  const [selectedCourseTeachers, setSelectedCourseTeachers] = useState<{
    courseName: string;
    courseCode?: string;
    niveauName: string;
    teachers: TeacherInfo[];
  } | null>(null);
  const [isTeachersModalOpen, setIsTeachersModalOpen] = useState(false);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, niveauxRes, yearsRes] = await Promise.all([
        api.get("/courses"),
        isAdmin ? api.get("/niveaux") : Promise.resolve({ data: [] }),
        api.get("/academic/years").catch(() => ({ data: [] })),
      ]);
      const data: CourseModel[] = coursesRes.data;
      setCourses(data);

      if (isAdmin) {
        setNiveauxList(niveauxRes.data || []);
      }
      setYearsList(yearsRes.data || []);
    } catch (error) {
      console.error("Error fetching courses", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openDeleteModal = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourseToDelete(courseId);
    setIsDeleteModalOpen(true);
  };

  const openTeachersModal = (course: CourseModel) => {
    setSelectedCourseTeachers({
      courseName: course.subject?.name || "Matière",
      courseCode: course.subject?.code,
      niveauName: course.niveau?.nom || "Niveau global",
      teachers: course.teachers || [],
    });
    setIsTeachersModalOpen(true);
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      await api.delete(`/courses/${courseToDelete}`);
      setIsDeleteModalOpen(false);
      setCourseToDelete(null);
      fetchCourses();
    } catch (error) {
      console.error("Error deleting course", error);
      alert("Impossible de supprimer le cours.");
    }
  };

  const getCreatePath = () => {
    if (isSuperAdmin) return "/admin/courses/new";
    if (isDirecteur) return "/directeur/courses/new";
    return "/enseignant/courses/new";
  };

  const getEditPath = (courseId: string) => {
    if (isSuperAdmin) return `/admin/courses/${courseId}/edit`;
    if (isDirecteur) return `/directeur/courses/${courseId}/edit`;
    return `/enseignant/courses/${courseId}/edit`;
  };

  const getDetailPath = (courseId: string) => {
    if (isSuperAdmin) return `/admin/courses/${courseId}`;
    if (isDirecteur) return `/directeur/courses/${courseId}`;
    if (isEnseignant) return `/enseignant/courses/${courseId}`;
    return `/courses/${courseId}`;
  };

  const dynamicNiveaux = Array.from(
    new Set(
      courses
        .map((c) => c.niveau?.nom)
        .filter((nom): nom is string => Boolean(nom)),
    ),
  ).map((nom) => ({ id: nom, nom, name: nom }));

  const filteredCourses = courses.filter((course) => {
    const subjectName = (course.subject?.name || "").toLowerCase();
    const subjectCode = (course.subject?.code || "").toLowerCase();
    const niveauName = (course.niveau?.nom || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      subjectName.includes(query) ||
      subjectCode.includes(query) ||
      niveauName.includes(query) ||
      (course.teachers &&
        course.teachers.some((t) =>
          `${t.firstName} ${t.lastName}`.toLowerCase().includes(query),
        ));

    const matchesYear =
      selectedYearFilter === "ALL" ||
      (course as any).academicYearId === selectedYearFilter ||
      (course as any).academicYear?.name === selectedYearFilter;

    const matchesNiveau =
      selectedNiveauFilter === "ALL" ||
      course.niveau?.nom === selectedNiveauFilter ||
      course.niveau?.id === selectedNiveauFilter;

    return matchesSearch && matchesYear && matchesNiveau;
  });

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={
          isSuperAdmin
            ? "Supervision des Cours & Programmes Nationaux"
            : isDirecteur
              ? "Gestion des Cours de l'Établissement"
              : isEnseignant
                ? "Mes Cours"
                : "Catalogue des Cours"
        }
        description={
          isSuperAdmin
            ? "Supervisez tous les cours, le nombre de professeurs affectés, les élèves inscrits et les contenus pédagogiques."
            : "Consultez le programme officiel, le corps professoral assigné et les évaluations associées."
        }
        action={
          isAdmin && (
            <Button
              onClick={() => navigate(getCreatePath())}
              className="flex items-center gap-2 shadow-lg shadow-brand-accent/20"
            >
              <Plus className="w-4 h-4" />
              Nouveau Cours
            </Button>
          )
        }
      />

      {/* Control Bar: Search & Filters */}
      <div className="bg-brand-card rounded-2xl p-4 border border-brand-border/60 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              type="text"
              placeholder="Rechercher par matière, code, niveau ou professeur..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-brand-surface border border-brand-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
            />
          </div>

          {/* Filter Selectors & View Switcher */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Filter by Academic Year */}
            {yearsList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-muted" />
                <select
                  value={selectedYearFilter}
                  onChange={(e) => {
                    setSelectedYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-brand-surface border border-brand-border/50 rounded-lg px-2.5 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent max-w-[150px] truncate font-semibold"
                >
                  <option value="ALL">Toutes les années</option>
                  {yearsList.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name || y.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Niveau */}
            {user?.role !== "APPRENANT" &&
              (niveauxList.length > 0 || dynamicNiveaux.length > 0) && (
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-brand-muted" />
                  <select
                    value={selectedNiveauFilter}
                    onChange={(e) => {
                      setSelectedNiveauFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-brand-surface border border-brand-border/50 rounded-lg px-2.5 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent max-w-[170px] truncate font-semibold"
                  >
                    <option value="ALL">Tous les niveaux</option>
                    {(niveauxList.length > 0
                      ? niveauxList
                      : dynamicNiveaux
                    ).map((n: any) => (
                      <option key={n.id} value={n.name || n.nom}>
                        {n.name || n.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* View Mode Switcher */}
            <div className="flex items-center bg-brand-surface border border-brand-border/50 rounded-lg p-0.5 ml-2">
              <button
                onClick={() => setViewMode("TABLE")}
                title="Vue Tableau"
                className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "TABLE"
                    ? "bg-brand-accent text-white shadow"
                    : "text-brand-muted hover:text-brand-text"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("GRID")}
                title="Vue Cartes"
                className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "GRID"
                    ? "bg-brand-accent text-white shadow"
                    : "text-brand-muted hover:text-brand-text"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchCourses}
              className="p-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
        </div>
      ) : paginatedCourses.length === 0 ? (
        <div className="p-12 text-center text-brand-muted bg-brand-card rounded-xl border border-brand-border/50 flex flex-col items-center gap-3">
          <Book className="w-12 h-12 text-brand-border opacity-50" />
          <p className="text-base font-semibold text-brand-text">
            Aucun cours trouvé
          </p>
          <p className="text-xs text-brand-muted">
            Essayez de modifier vos filtres de recherche.
          </p>
        </div>
      ) : viewMode === "TABLE" ? (
        /* SUPERVISION TABLE VIEW */
        <div className="bg-brand-card rounded-2xl border border-brand-border/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-brand-surface/90 text-brand-muted text-xs uppercase font-bold border-b border-brand-border/60 tracking-wider">
                <tr>
                  <th className="px-6 py-4.5">Matière / Cours</th>
                  <th className="px-6 py-4.5">Année Académique</th>
                  <th className="px-6 py-4.5">Niveau</th>
                  <th className="px-6 py-4.5">Professeur(s) affecté(s)</th>
                  <th className="px-6 py-4.5">École(s)</th>
                  <th className="px-6 py-4.5">Chapitres & Contenu</th>
                  <th className="px-6 py-4.5 text-center">Coef</th>
                  <th className="px-6 py-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 font-medium">
                {paginatedCourses.map((course) => {
                  const teacherCount =
                    course.teachersCount ?? course.teachers?.length ?? 0;

                  return (
                    <tr
                      key={course.id}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      {/* Matière / Cours */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={getSubjectIllustration(course.subject?.name, course.subject?.imageUrl)}
                            alt=""
                            className="w-11 h-11 rounded-xl object-cover border border-brand-border/60 shrink-0 shadow-sm"
                          />
                          <div>
                            <h4 className="font-bold text-brand-text text-base group-hover:text-brand-accent transition-colors">
                              {course.subject?.name || "Matière"}
                            </h4>
                            {course.subject?.code && (
                              <span className="text-[11px] font-mono text-brand-accent font-semibold px-2 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20">
                                {course.subject.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Année Académique */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {(course as any).academicYear?.name ||
                            "Toutes / Active"}
                        </span>
                      </td>

                      {/* Niveau (Clickable -> Opens Students & Grades Evaluation Page) */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${getDetailPath(course.id)}?tab=STUDENTS`);
                          }}
                          title="Cliquer pour voir la liste des élèves, notes, devoirs et taux de participation"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-accent/15 text-brand-accent border border-brand-accent/30 hover:bg-brand-accent hover:text-white transition-all shadow-sm cursor-pointer"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{course.niveau?.nom || "N/A"}</span>
                        </button>
                      </td>

                      {/* Professeur(s) — Affiche le NOMBRE exact et ouvre la liste détaillée au clic */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTeachersModal(course);
                          }}
                          title="Cliquer pour afficher la liste des professeurs avec leurs écoles et classes"
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                            teacherCount > 0
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
                              : "bg-brand-surface text-brand-muted border border-brand-border/40 hover:border-brand-accent/50"
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {teacherCount}{" "}
                            {teacherCount > 1
                              ? "professeurs"
                              : "professeur"}
                          </span>
                        </button>
                      </td>

                      {/* École(s) */}
                      <td className="px-6 py-4.5 whitespace-nowrap text-sm font-semibold text-brand-text">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-brand-muted" />
                          {course.schoolsCount || 0} école(s)
                        </span>
                      </td>

                      {/* Chapitres (Clickable -> Opens Course Content Management Page) */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${getDetailPath(course.id)}?tab=CONTENT`);
                          }}
                          title="Cliquer pour ajouter ou gérer les chapitres et contenus"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-500/10 text-slate-200 border border-slate-500/30 hover:bg-slate-700/40 hover:text-white transition-all shadow-sm cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-brand-accent" />
                          <span>
                            {course._count?.chapters || 0} chapitre(s)
                          </span>
                        </button>
                      </td>

                      {/* Coefficient */}
                      <td className="px-6 py-4.5 whitespace-nowrap text-center text-sm font-extrabold text-brand-accent">
                        {course.coefficient || 1}
                      </td>

                      {/* Actions Column (Editer, Consulter, Supprimer) */}
                      <td
                        className="px-6 py-4.5 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          {/* Consulter Page */}
                          <button
                            onClick={() => navigate(getDetailPath(course.id))}
                            title="Consulter le cours et ses chapitres"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-accent bg-brand-accent/10 hover:bg-brand-accent hover:text-white transition-all border border-brand-accent/20 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Voir</span>
                          </button>

                          {/* Editer Page */}
                          {isAdmin && (
                            <button
                              onClick={() => navigate(getEditPath(course.id))}
                              title="Éditer le cours"
                              className="p-2 rounded-lg text-amber-400 bg-amber-500/10 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}

                          {/* Supprimer */}
                          {isAdmin && (
                            <button
                              onClick={(e) => openDeleteModal(course.id, e)}
                              title="Supprimer le cours"
                              className="p-2 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedCourses.map((course) => {
            const teacherCount =
              course.teachersCount ?? course.teachers?.length ?? 0;
            const courseImageSrc = getSubjectIllustration(
              course.subject?.name,
              course.subject?.imageUrl,
            );

            return (
              <div
                key={course.id}
                className="bg-brand-card rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-brand-accent/15 hover:-translate-y-1 transition-all duration-300 border border-brand-border/80 group relative flex flex-col justify-between"
                onClick={() => navigate(getDetailPath(course.id))}
              >
                <div>
                  {/* Image Container with robust dark gradient overlay */}
                  <div className="relative h-48 w-full bg-slate-950 overflow-hidden shrink-0">
                    <img
                      src={courseImageSrc}
                      alt={course.subject?.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30" />

                    {/* Niveau Badge (Top Left) */}
                    <div className="absolute top-3 left-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${getDetailPath(course.id)}?tab=STUDENTS`);
                        }}
                        title="Voir les élèves & évaluations"
                        className="bg-slate-900/85 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 hover:bg-emerald-600 hover:border-emerald-500 transition-all cursor-pointer shadow-md"
                      >
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{course.niveau?.nom || "Niveau N/A"}</span>
                      </button>
                    </div>

                    {/* Coeff Badge (Top Right) */}
                    <div className="absolute top-3 right-3">
                      <span className="bg-emerald-600/90 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md border border-emerald-400/40 backdrop-blur-md">
                        Coeff : {course.coefficient || 1}
                      </span>
                    </div>

                    {/* Subject Title & Chapters (Bottom Banner) */}
                    <div className="absolute bottom-3.5 left-4 right-4">
                      <h3 className="text-lg font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight line-clamp-1">
                        {course.subject?.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`${getDetailPath(course.id)}?tab=CONTENT`);
                          }}
                          title="Gérer les chapitres & contenus"
                          className="text-[11px] font-bold bg-white/20 hover:bg-emerald-600 text-white border border-white/30 px-2.5 py-0.5 rounded-md backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3 text-emerald-300" />
                          <span>{course._count?.chapters || 0} chapitre(s)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-brand-surface/50 border-t border-brand-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Programme Officiel
                  </span>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => navigate(getDetailPath(course.id))}
                      title="Consulter le cours et ses chapitres"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Voir</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => navigate(getEditPath(course.id))}
                        title="Éditer le cours"
                        className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => openDeleteModal(course.id, e)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 cursor-pointer"
                        title="Supprimer le cours"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-brand-card border border-brand-border rounded-xl mt-4 gap-4">
          <div className="text-sm text-brand-text-muted">
            Affichage de{" "}
            <span className="font-medium text-brand-text">
              {filteredCourses.length > 0
                ? (currentPage - 1) * itemsPerPage + 1
                : 0}
            </span>{" "}
            à{" "}
            <span className="font-medium text-brand-text">
              {Math.min(currentPage * itemsPerPage, filteredCourses.length)}
            </span>{" "}
            sur{" "}
            <span className="font-medium text-brand-text">
              {filteredCourses.length}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-brand-surface border border-brand-border text-brand-text rounded-md hover:bg-brand-sidebar disabled:opacity-50 transition-colors cursor-pointer"
            >
              Précédent
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-brand-surface border border-brand-border text-brand-text rounded-md hover:bg-brand-sidebar disabled:opacity-50 transition-colors cursor-pointer"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* MODAL LISTE DÉTAILLÉE DES PROFESSEURS AFFECTÉS */}
      <Modal
        isOpen={isTeachersModalOpen}
        onClose={() => setIsTeachersModalOpen(false)}
        title={`Professeurs affectés — ${selectedCourseTeachers?.courseName || "Cours"} (${selectedCourseTeachers?.niveauName || "Niveau"})`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-brand-surface rounded-xl border border-brand-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-text">
              <Book className="w-4 h-4 text-brand-accent" />
              <span>{selectedCourseTeachers?.courseName}</span>
              {selectedCourseTeachers?.courseCode && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-accent/15 text-brand-accent">
                  {selectedCourseTeachers.courseCode}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              {selectedCourseTeachers?.teachers.length || 0} professeur(s)
            </span>
          </div>

          {!selectedCourseTeachers?.teachers ||
          selectedCourseTeachers.teachers.length === 0 ? (
            <div className="py-10 text-center text-brand-muted space-y-2">
              <Users className="w-10 h-10 mx-auto text-brand-border opacity-50" />
              <p className="text-sm font-semibold text-brand-text">
                Aucun professeur affecté à ce cours
              </p>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                Pour affecter un professeur à cette matière, rendez-vous dans la
                gestion des classes ou des enseignants.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {selectedCourseTeachers.teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="bg-brand-surface/70 hover:bg-brand-surface p-4 rounded-xl border border-brand-border/60 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/30">
                        {teacher.firstName.charAt(0)}
                        {teacher.lastName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-brand-text">
                          {teacher.firstName} {teacher.lastName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Enseignant titulaire
                          </span>
                          {teacher.matricule && (
                            <span className="text-[10px] font-mono text-brand-muted">
                              Mat: {teacher.matricule}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-xs text-brand-text-muted">
                      {teacher.email && (
                        <a
                          href={`mailto:${teacher.email}`}
                          className="flex items-center gap-1 text-[11px] text-brand-muted hover:text-brand-accent transition"
                        >
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[160px]">
                            {teacher.email}
                          </span>
                        </a>
                      )}
                      {teacher.phone && (
                        <a
                          href={`tel:${teacher.phone}`}
                          className="flex items-center gap-1 text-[11px] text-brand-muted hover:text-emerald-400 transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{teacher.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Classes & Écoles assignées */}
                  <div className="pt-2.5 border-t border-brand-border/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {/* Écoles */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <School className="w-3.5 h-3.5 text-brand-muted" />
                      <span className="text-[11px] text-brand-muted">
                        Établissement(s) :
                      </span>
                      {teacher.schools && teacher.schools.length > 0 ? (
                        teacher.schools.map((sch) => (
                          <span
                            key={sch.id}
                            className="bg-brand-card px-2 py-0.5 rounded text-[11px] font-bold text-brand-text border border-brand-border/50"
                          >
                            {sch.name} {sch.ville ? `(${sch.ville})` : ""}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-brand-muted italic">
                          Établissement principal
                        </span>
                      )}
                    </div>

                    {/* Classes */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <GraduationCap className="w-3.5 h-3.5 text-brand-accent" />
                      <span className="text-[11px] text-brand-muted">
                        Classe(s) :
                      </span>
                      {teacher.classes && teacher.classes.length > 0 ? (
                        teacher.classes.map((clsName, idx) => (
                          <span
                            key={idx}
                            className="bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2 py-0.5 rounded text-[11px] font-bold"
                          >
                            {clsName}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-brand-muted italic">
                          Toutes les classes du niveau
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-brand-border/50 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTeachersModalOpen(false)}
            >
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteCourse}
        title="Supprimer le cours ?"
        message="Êtes-vous sûr de vouloir supprimer ce cours et toutes ses ressources ?"
        confirmText="Supprimer"
        confirmStyle="danger"
      />
    </div>
  );
};

export default Courses;
