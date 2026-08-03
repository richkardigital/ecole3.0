import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { 
  Plus, Book, User, Trash2, Loader2, Users, School, Calendar, 
  Search, Filter, Eye, RefreshCw, LayoutGrid, List, GraduationCap, BookOpen, Sparkles
} from 'lucide-react';
import mathCover from '@/assets/course-covers/math.svg';
import musicCover from '@/assets/course-covers/music.svg';
import spanishCover from '@/assets/course-covers/spanish.svg';
import chemistryCover from '@/assets/course-covers/chemistry.svg';
import svtCover from '@/assets/course-covers/svt.svg';
import philosophyCover from '@/assets/course-covers/philosophy.svg';
import epsCover from '@/assets/course-covers/eps.svg';
import officeCover from '@/assets/course-covers/office.svg';
import englishCover from '@/assets/course-covers/english.svg';
import artsCover from '@/assets/course-covers/arts.svg';
import historyCover from '@/assets/course-covers/history.svg';
import edhcCover from '@/assets/course-covers/edhc.svg';
import economyCover from '@/assets/course-covers/economy.svg';
import frenchCover from '@/assets/course-covers/french.svg';
import defaultCover from '@/assets/course-covers/default.svg';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface CourseModel {
  id: string;
  coefficient: number;
  class?: { 
    id: string; 
    name: string; 
    level?: string; 
    schoolId?: string;
    school?: { id: string; name: string; code?: string };
    academicYear?: { id: string; name: string; isCurrent?: boolean };
    niveau?: { id: string; nom: string };
  };
  subject?: { id: string; name: string; code?: string };
  teacher?: { id: string; firstName: string; lastName: string; email?: string };
  _count?: { chapters: number; assignments: number };
}

interface Option {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  nom?: string;
}

const Courses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isDirecteur = user?.role === 'DIRECTEUR';
  const isAdmin = isSuperAdmin || isDirecteur;
  const isTeacher = user?.role === 'ENSEIGNANT';

  const [courses, setCourses] = useState<CourseModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>(isSuperAdmin ? 'TABLE' : 'GRID');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState('ALL');
  const [selectedNiveauFilter, setSelectedNiveauFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Unique options for filters
  const [schoolsList, setSchoolsList] = useState<Option[]>([]);
  const [yearsList, setYearsList] = useState<Option[]>([]);
  const [niveauxList, setNiveauxList] = useState<Option[]>([]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form options
  const { register, handleSubmit, reset } = useForm();
  const [bulkTeacherId, setBulkTeacherId] = useState<string>('');
  const [bulkSubjectId, setBulkSubjectId] = useState<string>('');
  const [bulkCoefficient, setBulkCoefficient] = useState<number>(1);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, niveauxRes] = await Promise.all([
        api.get('/courses'),
        (isSuperAdmin || isDirecteur) ? api.get('/niveaux') : Promise.resolve({ data: [] })
      ]);
      const data: CourseModel[] = coursesRes.data;
      setCourses(data);

      // Extract unique schools, academic years, and subjects for filtering
      if (isSuperAdmin || isDirecteur) {
        const uniqueSchools = Array.from(
          new Map(
            data
              .filter(c => c.class?.school)
              .map(c => [c.class!.school!.id, { id: c.class!.school!.id, name: c.class!.school!.name }])
          ).values()
        );
        setSchoolsList(uniqueSchools);

        const uniqueYears = Array.from(
          new Map(
            data
              .filter(c => c.class?.academicYear)
              .map(c => [c.class!.academicYear!.id, { id: c.class!.academicYear!.id, name: c.class!.academicYear!.name }])
          ).values()
        );
        setYearsList(uniqueYears);

        setNiveauxList(niveauxRes.data);
      }
    } catch (error) {
      console.error('Error fetching courses', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchDataForForm = async () => {
    try {
      const promises = [
        api.get('/classes'),
        api.get('/subjects'),
      ];
      if (isAdmin) {
        promises.push(api.get('/users?role=ENSEIGNANT'));
      }
      const results = await Promise.all(promises);
      setClasses(results[0].data);
      setSubjects(results[1].data);
      if (isAdmin && results[2]) {
        setTeachers(results[2].data);
      }
    } catch (error) {
      console.error("Error fetching form data", error);
    }
  };

  const openBulkModal = async () => {
    try {
      setBulkError(null);
      const [classesRes, subjectsRes, teachersRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
        api.get('/users?role=ENSEIGNANT')
      ]);
      setClasses(classesRes.data);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data);
      setSelectedClassIds([]);
      setBulkTeacherId('');
      setBulkSubjectId('');
      setBulkCoefficient(1);
      setIsBulkModalOpen(true);
    } catch (error) {
      console.error("Error preparing bulk assignment modal", error);
      setBulkError("Impossible de charger les données nécessaires.");
    }
  };

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const onSubmitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsBulkSubmitting(true);
      setBulkError(null);
      if (!bulkTeacherId || !bulkSubjectId || selectedClassIds.length === 0) {
        setBulkError("Sélectionnez un enseignant, une matière et au moins une classe.");
        setIsBulkSubmitting(false);
        return;
      }
      await api.post('/courses/assign-multiple', {
        teacherId: bulkTeacherId,
        subjectId: bulkSubjectId,
        classIds: selectedClassIds,
        coefficient: bulkCoefficient || 1
      });
      setIsBulkModalOpen(false);
      fetchCourses();
    } catch (error: any) {
      console.error("Error assigning courses in bulk", error);
      setBulkError(error.response?.data?.message || "Erreur lors de l'assignation des cours.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const openModal = () => {
    fetchDataForForm();
    setIsModalOpen(true);
  };

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

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const payload = { ...data };
      if (isTeacher && user) {
        payload.teacherId = user.id;
      }
      await api.post('/courses', payload);
      setIsModalOpen(false);
      reset();
      fetchCourses();
    } catch (error: any) {
      console.error('Error creating course', error);
      setSubmitError(error.response?.data?.message || "Une erreur est survenue lors de la création du cours.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const SUBJECT_IMAGES: Record<string, string> = {
    'Mathématiques': mathCover,
    'Physique': 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80',
    'Chimie': chemistryCover,
    'SVT': svtCover,
    'Histoire-Géo': historyCover,
    'Français': frenchCover,
    'Francais': frenchCover,
    'Espagnol': spanishCover,
    'Anglais': englishCover,
    'Philosophie': philosophyCover,
    'EPS': epsCover,
    'Informatique': officeCover,
    'Bureautique': officeCover,
    'Arts': artsCover,
    'EDHC': edhcCover,
    'Économie': economyCover,
    'Economie': economyCover,
    'Entrepreneuriat': economyCover,
    'Musique': musicCover,
  };
  const DEFAULT_IMAGE = defaultCover;

  const getCourseImage = (subjectName: string) => {
    const subjectLower = (subjectName || '').toLowerCase();
    const key = Object.keys(SUBJECT_IMAGES).find(k => subjectLower.includes(k.toLowerCase()));
    return key ? SUBJECT_IMAGES[key] : DEFAULT_IMAGE;
  };

  // Multi-criteria Filtering
  const filteredCourses = courses.filter(c => {
    const subjectName = c.subject?.name || '';
    const className = c.class?.name || '';
    const teacherName = c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : '';
    const schoolName = c.class?.school?.name || '';

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      subjectName.toLowerCase().includes(query) ||
      className.toLowerCase().includes(query) ||
      teacherName.toLowerCase().includes(query) ||
      schoolName.toLowerCase().includes(query);

    const matchesSchool = selectedSchoolFilter === 'ALL' || c.class?.school?.id === selectedSchoolFilter;
    const matchesYear = selectedYearFilter === 'ALL' || !c.class?.academicYear?.id || c.class?.academicYear?.id === selectedYearFilter;
    const matchesNiveau = selectedNiveauFilter === 'ALL' || c.class?.level === selectedNiveauFilter || c.class?.niveau?.nom === selectedNiveauFilter;

    return matchesSearch && matchesSchool && matchesYear && matchesNiveau;
  });

  const paginatedCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  const getDetailPath = (courseId: string) => {
    if (isSuperAdmin) return `/admin/courses/${courseId}`;
    if (isDirecteur) return `/directeur/courses/${courseId}`;
    return `/courses/${courseId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title={isSuperAdmin ? 'Supervision Globale des Cours' : isDirecteur ? 'Gestion des Cours' : 'Mes Cours'}
        subtitle={
          isSuperAdmin 
            ? 'Supervisez, filtrez et suivez tous les cours et chapitres publiés sur la plateforme.'
            : 'Consultez et organisez les matières et chapitres enseignés dans vos classes.'
        }
        icon={<BookOpen className="w-6 h-6 text-brand-accent" />}
        action={
          // Only Admin & Directeur can create courses and assign them
          (!isSuperAdmin && !isDirecteur) ? null : (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={openBulkModal}
                leftIcon={<Users className="w-4 h-4" />}
              >
                Assignation multiple
              </Button>
              <Button
                variant="primary"
                onClick={openModal}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Nouveau cours
              </Button>
            </div>
          )
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
              placeholder="Rechercher par cours, enseignant, classe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border/50 rounded-lg pl-9 pr-4 py-2 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
            />
          </div>

          {/* Filters & View Toggle */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {/* Filter by Academic Year */}
            {yearsList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-muted" />
                <select
                  value={selectedYearFilter}
                  onChange={(e) => setSelectedYearFilter(e.target.value)}
                  className="bg-brand-surface border border-brand-border/50 rounded-lg px-2.5 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="ALL">Toutes les années</option>
                  {yearsList.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by School (Super Admin) */}
            {isSuperAdmin && schoolsList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-brand-muted" />
                <select
                  value={selectedSchoolFilter}
                  onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                  className="bg-brand-surface border border-brand-border/50 rounded-lg px-2.5 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent max-w-[160px] truncate"
                >
                  <option value="ALL">Toutes les écoles</option>
                  {schoolsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Niveau */}
            {niveauxList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-brand-muted" />
                <select
                  value={selectedNiveauFilter}
                  onChange={(e) => { setSelectedNiveauFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-brand-surface border border-brand-border/50 rounded-lg px-2.5 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent max-w-[150px] truncate"
                >
                  <option value="ALL">Tous les niveaux</option>
                  {niveauxList.map(n => (
                    <option key={n.id} value={n.nom || n.name}>{n.nom || n.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center bg-brand-surface border border-brand-border/50 rounded-lg p-0.5 ml-2">
              <button
                onClick={() => setViewMode('TABLE')}
                title="Vue Tableau"
                className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'TABLE' ? 'bg-brand-accent text-white shadow' : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                title="Vue Cartes"
                className={`p-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'GRID' ? 'bg-brand-accent text-white shadow' : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={fetchCourses} className="p-2">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
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
          <p className="text-base font-semibold text-brand-text">Aucun cours trouvé</p>
          <p className="text-xs text-brand-muted">Essayez de modifier vos filtres de recherche.</p>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* SUPERVISION TABLE VIEW */
        <div className="bg-brand-card rounded-xl border border-brand-border/50 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-surface/80 text-brand-muted text-xs uppercase font-semibold border-b border-brand-border/50">
                <tr>
                  <th className="px-6 py-4">Cours / Matière</th>
                  <th className="px-4 py-4">Classe & Niveau</th>
                  <th className="px-4 py-4">Enseignant</th>
                  <th className="px-4 py-4">Établissement</th>
                  <th className="px-4 py-4">Année</th>
                  <th className="px-4 py-4">Chapitres</th>
                  <th className="px-4 py-4">Coef</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {paginatedCourses.map((course) => (
                  <tr 
                    key={course.id} 
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate(getDetailPath(course.id))}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img 
                          src={getCourseImage(course.subject?.name || '')} 
                          alt="" 
                          className="w-10 h-10 rounded-lg object-cover border border-brand-border/50 shrink-0" 
                        />
                        <div>
                          <h4 className="font-bold text-brand-text">{course.subject?.name || 'Matière'}</h4>
                          {course.subject?.code && (
                            <span className="text-[10px] font-mono text-brand-accent font-semibold">
                              Code: {course.subject.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-surface text-brand-text border border-brand-border/50">
                        {course.class?.name || 'Classe N/A'}
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent text-xs font-bold shrink-0">
                          {course.teacher?.firstName?.[0] || 'E'}
                        </div>
                        <div className="text-xs">
                          <p className="font-semibold text-brand-text">
                            {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : 'Non assigné'}
                          </p>
                          {course.teacher?.email && (
                            <p className="text-[10px] text-brand-muted">{course.teacher.email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-brand-text">
                        <School className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                        <span>{course.class?.school?.name || 'Plateforme'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-xs">
                      {course.class?.academicYear ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {course.class.academicYear.name}
                        </span>
                      ) : (
                        <span className="text-brand-muted italic text-[11px]">-</span>
                      )}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-300 border border-slate-500/20">
                        {course._count?.chapters || 0} chapitre(s)
                      </span>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-brand-accent">
                      {course.coefficient || 1}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(getDetailPath(course.id))}
                          title="Consulter le cours & chapitres"
                          className="p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {isAdmin && (
                          <button
                            onClick={(e) => openDeleteModal(course.id, e)}
                            title="Supprimer"
                            className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-colors"
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
              <div className="relative h-40 overflow-hidden shrink-0">
                <img 
                  src={getCourseImage(course.subject?.name || '')} 
                  alt={course.subject?.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-brand-card/60 to-transparent"></div>
                
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {course.class?.school && (
                    <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-md flex items-center gap-1">
                      <School className="w-3 h-3 text-brand-accent" />
                      {course.class.school.name}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-4 left-5 text-white">
                  <h3 className="text-xl font-bold drop-shadow-md text-white">{course.subject?.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-brand-sidebar border border-brand-border text-brand-text font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md">
                      {course.class?.name}
                    </span>
                    {course._count?.chapters !== undefined && (
                      <span className="text-[11px] bg-brand-accent/20 border border-brand-accent/30 text-brand-accent font-semibold px-2 py-0.5 rounded-full backdrop-blur-md">
                        {course._count.chapters} chapitres
                      </span>
                    )}
                  </div>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md">
                    Coeff: {course.coefficient || 1}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-brand-text-muted">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-brand-accent" />
                    <span>{course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : 'Non assigné'}</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => openDeleteModal(course.id, e)}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                      title="Supprimer le cours"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
            Affichage de <span className="font-medium text-brand-text">{filteredCourses.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> à <span className="font-medium text-brand-text">{Math.min(currentPage * itemsPerPage, filteredCourses.length)}</span> sur <span className="font-medium text-brand-text">{filteredCourses.length}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-brand-surface border border-brand-border text-brand-text rounded-md hover:bg-brand-sidebar disabled:opacity-50 transition-colors"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-brand-surface border border-brand-border text-brand-text rounded-md hover:bg-brand-sidebar disabled:opacity-50 transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* CREATE COURSE MODAL (DIRECTEUR / TEACHER ONLY) */}
      {!isSuperAdmin && isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-10 bg-brand-card border border-brand-border/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-brand-text">Créer un nouveau cours</h3>
            {submitError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-semibold">
                {submitError}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Classe *</label>
                <select
                  {...register('classId', { required: true })}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="">Sélectionnez une classe...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Matière *</label>
                <select
                  {...register('subjectId', { required: true })}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="">Sélectionnez une matière...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {isDirecteur && (
                <div>
                  <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Enseignant *</label>
                  <select
                    {...register('teacherId', { required: true })}
                    className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                  >
                    <option value="">Sélectionnez un enseignant...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Coefficient</label>
                <input 
                  type="number"
                  defaultValue={1}
                  step="0.5"
                  {...register('coefficient', { valueAsNumber: true })}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-brand-border/40">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Création...' : 'Créer le cours'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK ASSIGN MODAL (DIRECTEUR ONLY) */}
      {!isSuperAdmin && isBulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={() => setIsBulkModalOpen(false)} />
          <div className="relative z-10 bg-brand-card border border-brand-border/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-brand-text">Assignation multiple de cours</h3>
            {bulkError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-semibold">
                {bulkError}
              </div>
            )}
            <form onSubmit={onSubmitBulk} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Enseignant *</label>
                <select
                  value={bulkTeacherId}
                  onChange={(e) => setBulkTeacherId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="">Sélectionnez l'enseignant...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Matière *</label>
                <select
                  value={bulkSubjectId}
                  onChange={(e) => setBulkSubjectId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="">Sélectionnez la matière...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Classes destinataires *</label>
                <div className="max-h-36 overflow-y-auto bg-brand-surface p-3 rounded-lg border border-brand-border/50 space-y-2">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-brand-text cursor-pointer hover:text-white">
                      <input 
                        type="checkbox"
                        checked={selectedClassIds.includes(c.id)}
                        onChange={() => toggleClassSelection(c.id)}
                        className="rounded border-brand-border text-brand-accent"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-brand-border/40">
                <Button type="button" variant="outline" onClick={() => setIsBulkModalOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={isBulkSubmitting}>
                  {isBulkSubmitting ? 'Assignation...' : 'Assigner aux classes'}
                </Button>
              </div>
            </form>
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
