import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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
import api from '@/lib/api';
import { 
  Search, 
  School, 
  Layers, 
  BookOpen, 
  GraduationCap, 
  Sparkles, 
  FileText, 
  Video, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight, 
  Network,
  Calendar,
  Filter
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

interface SchoolModel {
  id: string;
  name: string;
}

interface NiveauModel {
  id: string;
  nom: string;
}

interface TermModel {
  id: string;
  name: string;
}

interface CourseModel {
  id: string;
  subject: { id: string; name: string; code?: string; imageUrl?: string | null };
  niveau: { id: string; nom: string };
  academicYear?: { id: string; name: string };
  chapters?: any[];
  totalExercises?: number;
  totalResources?: number;
  _count?: { chapters: number; assignments: number; resources: number };
}

const SUBJECT_IMAGES: Record<string, string> = {
  'Mathématiques': mathCover,
  'Maths': mathCover,
  'Physique': chemistryCover,
  'Physique-Chimie': chemistryCover,
  'Chimie': chemistryCover,
  'SVT': svtCover,
  'Sciences de la Vie': svtCover,
  'Histoire-Géo': historyCover,
  'Histoire-Géographie': historyCover,
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

const getCourseImage = (subjectName: string, customImage?: string | null) => {
  if (customImage) return customImage;
  const subjectLower = (subjectName || '').toLowerCase();
  const key = Object.keys(SUBJECT_IMAGES).find(k => subjectLower.includes(k.toLowerCase()));
  return key ? SUBJECT_IMAGES[key] : defaultCover;
};

const SharedResources = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [schools, setSchools] = useState<SchoolModel[]>([]);
  const [niveaux, setNiveaux] = useState<NiveauModel[]>([]);
  const [terms, setTerms] = useState<TermModel[]>([]);
  const [courses, setCourses] = useState<CourseModel[]>([]);
  
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingNiveaux, setLoadingNiveaux] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [selectedNiveauId, setSelectedNiveauId] = useState<string>('ALL');
  const [selectedTermId, setSelectedTermId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Initial fetch for schools and niveaux
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [schoolsRes, niveauxRes] = await Promise.all([
          api.get('/courses/shared/schools').catch(() => ({ data: [] })),
          api.get('/niveaux').catch(() => ({ data: [] }))
        ]);
        setSchools(schoolsRes.data || []);
        setNiveaux(niveauxRes.data || []);
      } catch (error) {
        console.error('Error fetching initial data', error);
      } finally {
        setLoadingSchools(false);
        setLoadingNiveaux(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch courses with current filters
  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await api.get('/courses/shared/courses', {
          params: {
            schoolId: selectedSchoolId,
            niveauId: selectedNiveauId,
            termId: selectedTermId,
            q: searchTerm || undefined,
          },
        });
        setCourses(res.data || []);
      } catch (error) {
        console.error('Error fetching shared courses', error);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    const handle = setTimeout(fetchCourses, 300);
    return () => clearTimeout(handle);
  }, [selectedSchoolId, selectedNiveauId, selectedTermId, searchTerm]);

  const getDetailPath = (courseId: string) => {
    const role = user?.role;
    if (role === 'SUPER_ADMIN') return `/admin/shared-resources/${courseId}`;
    if (role === 'DIRECTEUR') return `/directeur/shared-resources/${courseId}`;
    if (role === 'ENSEIGNANT') return `/enseignant/shared-resources/${courseId}`;
    if (role === 'EDUCATEUR') return `/educateur/shared-resources/${courseId}`;
    return `/shared-resources/${courseId}`;
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchSearch = course.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.niveau?.nom?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [courses, searchTerm]);

  const isStudent = user?.role === 'APPRENANT';

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <PageHeader
          title="Réseau SEEEC"
          subtitle="Partage de contenus pédagogiques, ressources officielles et exercices d'entraînement entre établissements"
        />
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
          <Network className="w-4 h-4" />
          <span>Établissements interconnectés</span>
        </div>
      </div>

      {/* ── STUDENT NOTICE BANNER ── */}
      {isStudent && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-brand-card to-emerald-950/20 border border-emerald-500/30 flex items-start gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-extrabold text-sm text-brand-text flex items-center gap-2">
              Espace Entraînement & Soutien Réseau
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                Exercices Libres Non Notés
              </span>
            </h4>
            <p className="text-brand-text-muted leading-relaxed">
              Consultez les cours et réalisez les exercices d'entraînement partagés par les professeurs du réseau pour votre niveau. 
              Vous pouvez vous exercer à volonté en toute autonomie : vos réponses sont corrigées instantanément sans impacter vos notes de classe officielles.
            </p>
          </div>
        </div>
      )}

      {/* ── FILTERS BAR ── */}
      <div className="bg-brand-card p-4 rounded-2xl shadow-sm border border-brand-border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* School filter */}
          <div className="relative">
            <School className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-accent pointer-events-none" />
            <select
              className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text text-xs font-semibold outline-none transition-all"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              disabled={loadingSchools}
            >
              <option value="ALL">Toutes les écoles du réseau</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Niveau filter (Visible for Teachers/Admins, locked/hidden for Student) */}
          {!isStudent ? (
            <div className="relative">
              <Layers className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-accent pointer-events-none" />
              <select
                className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text text-xs font-semibold outline-none transition-all"
                value={selectedNiveauId}
                onChange={(e) => setSelectedNiveauId(e.target.value)}
                disabled={loadingNiveaux}
              >
                <option value="ALL">Tous les niveaux scolaires</option>
                {niveaux.map((n) => (
                  <option key={n.id} value={n.id}>{n.nom}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-sidebar rounded-xl border border-brand-border text-xs font-bold text-brand-text">
              <GraduationCap className="w-4 h-4 text-brand-accent" />
              <span>Niveau actif : Mon niveau scolaire</span>
            </div>
          )}

          {/* Trimestre Filter */}
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-accent pointer-events-none" />
            <select
              className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text text-xs font-semibold outline-none transition-all"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
            >
              <option value="ALL">Tous les trimestres</option>
              <option value="TRIMESTRE_1">1er Trimestre</option>
              <option value="TRIMESTRE_2">2ème Trimestre</option>
              <option value="TRIMESTRE_3">3ème Trimestre</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher une matière..."
              className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text text-xs font-semibold outline-none transition-all placeholder:text-brand-text-muted/60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── COURSES GRID ── */}
      {loadingCourses ? (
        <div className="text-center py-20 bg-brand-card rounded-2xl border border-brand-border flex flex-col items-center gap-3">
          <BookOpen className="w-10 h-10 text-brand-accent animate-pulse" />
          <p className="text-sm font-bold text-brand-text-muted">Chargement des cours et exercices partagés...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-20 bg-brand-card rounded-2xl border border-dashed border-brand-border p-8">
          <BookOpen className="w-12 h-12 text-brand-text-muted/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-brand-text mb-1">Aucun cours trouvé</h3>
          <p className="text-xs text-brand-text-muted max-w-md mx-auto">
            Aucun contenu partagé ne correspond à vos critères de recherche. Essayez de réinitialiser les filtres par école ou trimestre.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => {
            const chaptersCount = course.chapters?.length || course._count?.chapters || 0;
            const exercisesCount = course.totalExercises || 0;
            const resourcesCount = course.totalResources || course._count?.resources || 0;

            return (
              <div 
                key={course.id} 
                onClick={() => navigate(getDetailPath(course.id))}
                className="bg-brand-card rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-brand-border overflow-hidden flex flex-col group cursor-pointer hover:-translate-y-1.5"
              >
                {/* Illustrated Image Banner */}
                <div className="relative h-44 overflow-hidden shrink-0 bg-slate-950">
                  <img 
                    src={getCourseImage(course.subject.name, course.subject.imageUrl)}
                    alt={course.subject.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90" 
                  />
                  {/* High contrast gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30 pointer-events-none"></div>
                  
                  {/* Badges Top */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                    <span className="bg-slate-900/90 text-white text-[11px] font-black px-2.5 py-1 rounded-lg border border-white/15 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                      {course.niveau?.nom || 'Niveau standard'}
                    </span>
                  </div>

                  {/* Title & Metadata Bottom */}
                  <div className="absolute bottom-3 left-4 right-4 pointer-events-none">
                    <h3 className="text-lg font-black text-white drop-shadow-md leading-tight tracking-tight">
                      {course.subject.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-emerald-300/90 mt-1 flex items-center gap-1 drop-shadow">
                      <Network className="w-3 h-3 text-emerald-400" />
                      Réseau SEEEC • Écoles Partenaires
                    </p>
                  </div>
                </div>

                {/* Card Content & Stats */}
                <div className="p-4 flex-1 flex flex-col justify-between bg-brand-card space-y-4">
                  {/* Metrics Badges */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div className="p-2 rounded-xl bg-brand-sidebar border border-brand-border/60 text-center">
                      <span className="block text-[10px] font-bold text-brand-text-muted">Chapitres</span>
                      <span className="text-xs font-black text-brand-text">{chaptersCount}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Exercices</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {exercisesCount > 0 ? exercisesCount : 'Libre'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-center">
                      <span className="block text-[10px] font-bold text-sky-600 dark:text-sky-400">Ressources</span>
                      <span className="text-xs font-black text-sky-600 dark:text-sky-400">{resourcesCount}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-brand-border/50 flex items-center justify-between text-xs font-bold text-brand-accent group-hover:text-brand-accent-hover transition-colors">
                    <span className="flex items-center gap-1.5">
                      {isStudent ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          S'entraîner & Consulter
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5" />
                          Consulter les ressources
                        </>
                      )}
                    </span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SharedResources;
