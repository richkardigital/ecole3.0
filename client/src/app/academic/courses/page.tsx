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
} from "lucide-react";
import mathCover from "@/assets/course-covers/math.svg";
import musicCover from "@/assets/course-covers/music.svg";
import spanishCover from "@/assets/course-covers/spanish.svg";
import chemistryCover from "@/assets/course-covers/chemistry.svg";
import svtCover from "@/assets/course-covers/svt.svg";
import philosophyCover from "@/assets/course-covers/philosophy.svg";
import epsCover from "@/assets/course-covers/eps.svg";
import officeCover from "@/assets/course-covers/office.svg";
import englishCover from "@/assets/course-covers/english.svg";
import artsCover from "@/assets/course-covers/arts.svg";
import historyCover from "@/assets/course-covers/history.svg";
import edhcCover from "@/assets/course-covers/edhc.svg";
import economyCover from "@/assets/course-covers/economy.svg";
import frenchCover from "@/assets/course-covers/french.svg";
import defaultCover from "@/assets/course-covers/default.svg";
import ConfirmationModal from "@/components/ui/ConfirmModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface CourseModel {
  id: string;
  coefficient: number;
  subject?: { id: string; name: string; code?: string };
  niveau?: { id: string; nom: string };
  teachers?: TeacherInfo[];
  _count?: { chapters: number; assignments: number };
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
  const [selectedNiveauFilter, setSelectedNiveauFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [niveauxList, setNiveauxList] = useState<Option[]>([]);

  // Modals state
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, niveauxRes] = await Promise.all([
        api.get("/courses"),
        isAdmin
          ? api.get("/niveaux")
          : Promise.resolve({ data: [] }),
      ]);
      const data: CourseModel[] = coursesRes.data;
      setCourses(data);

      if (isAdmin) {
        setNiveauxList(niveauxRes.data);
      }
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
    e.preventDefault();
    setCourseToDelete(courseId);
    setIsDeleteModalOpen(true);
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
      alert("Impossible de supprimer ce cours. Veuillez réessayer.");
    }
  };

  const SUBJECT_IMAGES: Record<string, string> = {
    Mathématiques: mathCover,
    Physique:
      "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80",
    Chimie: chemistryCover,
    SVT: svtCover,
    "Histoire-Géo": historyCover,
    Français: frenchCover,
    Francais: frenchCover,
    Espagnol: spanishCover,
    Anglais: englishCover,
    Philosophie: philosophyCover,
    EPS: epsCover,
    Informatique: officeCover,
    Bureautique: officeCover,
    Arts: artsCover,
    EDHC: edhcCover,
    Économie: economyCover,
    Economie: economyCover,
    Entrepreneuriat: economyCover,
    Musique: musicCover,
  };
  const DEFAULT_IMAGE = defaultCover;

  const getCourseImage = (subjectName: string) => {
    const subjectLower = (subjectName || "").toLowerCase();
    const key = Object.keys(SUBJECT_IMAGES).find((k) =>
      subjectLower.includes(k.toLowerCase()),
    );
    return key ? SUBJECT_IMAGES[key] : DEFAULT_IMAGE;
  };

  // Dynamic filter options based on available courses
  const dynamicNiveaux = Array.from(
    new Map(
      courses
        .filter((c) => c.niveau?.nom)
        .map((c) => [c.niveau!.nom, { id: c.niveau!.id, name: c.niveau!.nom }]),
    ).values(),
  );

  // Multi-criteria Filtering
  const filteredCourses = courses.filter((c) => {
    const subjectName = c.subject?.name || "";
    const teacherNames = (c.teachers || [])
      .map((t) => `${t.firstName} ${t.lastName}`)
      .join(" ");

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      subjectName.toLowerCase().includes(query) ||
      teacherNames.toLowerCase().includes(query);

    const matchesNiveau =
      selectedNiveauFilter === "ALL" ||
      c.niveau?.nom === selectedNiveauFilter;

    return matchesSearch && matchesNiveau;
  });

  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  const getDetailPath = (courseId: string) => {
    if (isSuperAdmin) return `/admin/courses/${courseId}`;
    if (isDirecteur) return `/directeur/courses/${courseId}`;
    if (isEnseignant) return `/enseignant/courses/${courseId}`;
    if (isEducateur) return `/educateur/courses/${courseId}`;
    return `/courses/${courseId}`;
  };

  const getEditPath = (courseId: string) => {
    if (isSuperAdmin) return `/admin/courses/${courseId}/edit`;
    if (isDirecteur) return `/directeur/courses/${courseId}/edit`;
    return `/admin/courses/${courseId}/edit`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Cours Académiques"
        subtitle={
          isSuperAdmin
            ? "Gérez l'ensemble des cours académiques et leur programme officiel"
            : isAdmin
              ? "Supervisez les programmes académiques et l'assiduité"
              : isEnseignant
                ? "Consultez et complétez les chapitres de vos cours"
                : "Accédez à vos cours et supports de cours"
        }
        icon={<BookOpen className="w-6 h-6 text-brand-accent" />}
        action={
          isSuperAdmin ? (
            <Button
              variant="primary"
              onClick={() => navigate("/admin/courses/new")}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nouveau cours
            </Button>
          ) : null
        }
      />

      {/* Filter & Sorting Bar */}
      <div className="bg-brand-card p-4 rounded-xl border border-brand-border/50 space-y-3 shadow-md">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full lg:w-[400px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              placeholder="Rechercher par matière, professeur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border/50 rounded-lg pl-9 pr-4 py-2 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
            />
          </div>

          {/* Filters & View Toggle */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Filter by Niveau */}
            {user?.role !== "APPRENANT" && (dynamicNiveaux.length > 0 || niveauxList.length > 0) && (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-brand-muted" />
                <select
                  value={selectedNiveauFilter}
                  onChange={(e) => {
                    setSelectedNiveauFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-brand-surface border border-brand-border/50 rounded-lg px-2.5 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent max-w-[170px] truncate"
                >
                  <option value="ALL">Tous les niveaux</option>
                  {(dynamicNiveaux.length > 0 ? dynamicNiveaux : niveauxList).map((n: any) => (
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
        /* SUPERVISION TABLE VIEW — Wide & Un-cramped Spacing */
        <div className="bg-brand-card rounded-2xl border border-brand-border/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-brand-surface/90 text-brand-muted text-xs uppercase font-bold border-b border-brand-border/60 tracking-wider">
                <tr>
                  <th className="px-6 py-4.5">Matière / Cours</th>
                  <th className="px-6 py-4.5">Niveau</th>
                  <th className="px-6 py-4.5">Professeur(s)</th>
                  <th className="px-6 py-4.5">Chapitres & Contenu</th>
                  <th className="px-6 py-4.5 text-center">Coef</th>
                  <th className="px-6 py-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 font-medium">
                {paginatedCourses.map((course) => (
                  <tr
                    key={course.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => navigate(getDetailPath(course.id))}
                  >
                    {/* Matière / Cours */}
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={getCourseImage(course.subject?.name || "")}
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

                    {/* Niveau (Clickable -> Opens Students & Grades Evaluation Page) */}
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${getDetailPath(course.id)}?tab=STUDENTS`);
                        }}
                        title="Cliquer pour voir la liste des élèves et leurs évaluations"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-accent/15 text-brand-accent border border-brand-accent/30 hover:bg-brand-accent hover:text-white transition-all shadow-sm"
                      >
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>{course.niveau?.nom || "N/A"}</span>
                      </button>
                    </td>

                    {/* Professeur(s) */}
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      {course.teachers && course.teachers.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {course.teachers.map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            >
                              <User className="w-3 h-3" />
                              {t.firstName} {t.lastName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-brand-muted italic bg-brand-surface px-2.5 py-1 rounded-md border border-brand-border/40">
                          Non assigné
                        </span>
                      )}
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
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-500/10 text-slate-200 border border-slate-500/30 hover:bg-slate-700/40 hover:text-white transition-all shadow-sm"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-brand-accent" />
                        <span>{course._count?.chapters || 0} chapitre(s)</span>
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
                          title="Consulter la page du cours"
                          className="p-2 rounded-lg text-brand-muted hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-brand-border/40"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Editer Page */}
                        {isAdmin && (
                          <button
                            onClick={() => navigate(getEditPath(course.id))}
                            title="Éditer le cours (Page)"
                            className="p-2 rounded-lg text-amber-400 hover:text-white hover:bg-amber-500/20 transition-colors border border-transparent hover:border-amber-500/30"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {/* Supprimer */}
                        {isAdmin && (
                          <button
                            onClick={(e) => openDeleteModal(course.id, e)}
                            title="Supprimer le cours"
                            className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-colors border border-transparent hover:border-red-500/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedCourses.map((course) => (
            <div
              key={course.id}
              className="bg-brand-card rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-brand-accent/10 hover:-translate-y-1 transition-all duration-300 border border-brand-border group relative flex flex-col"
              onClick={() => navigate(getDetailPath(course.id))}
            >
              <div className="relative h-44 overflow-hidden shrink-0">
                <img
                  src={getCourseImage(course.subject?.name || "")}
                  alt={course.subject?.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-brand-card/60 to-transparent"></div>

                {/* Niveau Badge (Clickable) */}
                <div className="absolute top-3 left-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`${getDetailPath(course.id)}?tab=STUDENTS`);
                    }}
                    title="Voir les élèves & évaluations"
                    className="bg-brand-card/90 text-brand-text text-[11px] font-bold px-2.5 py-1 rounded-md border border-brand-border/60 backdrop-blur-md flex items-center gap-1.5 hover:bg-brand-accent hover:text-white transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-brand-accent" />
                    <span>{course.niveau?.nom || "Niveau N/A"}</span>
                  </button>
                </div>

                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <h3 className="text-xl font-bold drop-shadow-md text-white">
                    {course.subject?.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`${getDetailPath(course.id)}?tab=CONTENT`);
                      }}
                      title="Gérer les chapitres & contenus"
                      className="text-[11px] bg-brand-accent/20 border border-brand-accent/30 text-brand-accent hover:bg-brand-accent hover:text-white font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md transition-colors"
                    >
                      {course._count?.chapters || 0} chapitres
                    </button>
                  </div>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md">
                    Coeff: {course.coefficient || 1}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="text-xs text-brand-text-muted space-y-1">
                  <span className="block font-semibold text-brand-muted text-[10px] uppercase tracking-wider">
                    Professeur(s) :
                  </span>
                  {course.teachers && course.teachers.length > 0 ? (
                    <div className="flex flex-wrap gap-1 text-xs text-brand-text font-bold">
                      {course.teachers.map((t) => (
                        <span key={t.id} className="bg-brand-surface px-2 py-0.5 rounded border border-brand-border/40">
                          {t.firstName} {t.lastName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-brand-muted italic">Non assigné</span>
                  )}
                </div>

                <div className="pt-3 border-t border-brand-border/40 flex items-center justify-between">
                  <span className="text-xs text-brand-accent font-bold">
                    Programme Officiel
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(getDetailPath(course.id))}
                      title="Consulter le cours"
                      className="p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => navigate(getEditPath(course.id))}
                        title="Éditer le cours"
                        className="p-1.5 rounded-lg text-amber-400 hover:text-white hover:bg-amber-500/20 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => openDeleteModal(course.id, e)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Supprimer le cours"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
              className="px-3 py-1 text-sm bg-brand-surface border border-brand-border text-brand-text rounded-md hover:bg-brand-sidebar disabled:opacity-50 transition-colors"
            >
              Précédent
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-brand-surface border border-brand-border text-brand-text rounded-md hover:bg-brand-sidebar disabled:opacity-50 transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteCourse}
        title="Supprimer le cours ?"
        message="Êtes-vous sûr de vouloir supprimer ce cours et toutes ses ressources ?"
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};

export default Courses;
