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
import { Search, School, Layers, BookOpen, ChevronDown, ChevronUp, FileText, Video, ExternalLink, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { getFileUrl } from '@/lib/api';

interface SchoolModel {
  id: string;
  name: string;
}

interface ClassModel {
  id: string;
  name: string;
  niveauId?: string | null;
}

interface NiveauModel {
  id: string;
  nom: string;
}

interface CourseModel {
  id: string;
  class: { 
    id: string; 
    name: string; 
    school: { id: string; name: string; logoUrl: string | null };
    niveau: { id: string; nom: string } | null;
  };
  subject: { id: string; name: string };
  teacher: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  _count: { chapters: number; resources: number };
}

const SharedResources = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolModel[]>([]);
  const [niveaux, setNiveaux] = useState<NiveauModel[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [courses, setCourses] = useState<CourseModel[]>([]);
  
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingNiveaux, setLoadingNiveaux] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [selectedNiveauId, setSelectedNiveauId] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

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

  const getCourseImage = (subjectName: string) => {
    const subjectLower = (subjectName || '').toLowerCase();
    const key = Object.keys(SUBJECT_IMAGES).find(k => subjectLower.includes(k.toLowerCase()));
    return key ? SUBJECT_IMAGES[key] : defaultCover;
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [schoolsRes, niveauxRes] = await Promise.all([
          api.get('/courses/shared/schools'),
          api.get('/niveaux')
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

  useEffect(() => {
    if (selectedSchoolId === 'ALL') {
      setClasses([]);
      setSelectedClassId('ALL');
      return;
    }
    
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await api.get(`/courses/shared/schools/${selectedSchoolId}/classes`);
        setClasses(res.data || []);
      } catch (error) {
        console.error('Error fetching classes', error);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [selectedSchoolId]);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await api.get('/courses/shared/courses', {
          params: {
            schoolId: selectedSchoolId,
            niveauId: selectedNiveauId,
            classId: selectedClassId,
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
  }, [selectedSchoolId, selectedNiveauId, selectedClassId, searchTerm]);

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
      return course.subject.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [courses, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <PageHeader
          title="École connectée"
          subtitle="Consultez les documents partagés par les enseignants des autres écoles"
        />
      </div>

      <div className="bg-brand-card p-4 rounded-xl shadow-sm border border-brand-border/50 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative w-full md:w-64">
            <School className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text outline-none"
              value={selectedSchoolId}
              onChange={(e) => { setSelectedSchoolId(e.target.value); setSelectedClassId('ALL'); }}
              disabled={loadingSchools}
            >
              <option value="ALL">{loadingSchools ? 'Chargement...' : 'Toutes les écoles'}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {user?.role !== 'APPRENANT' && (
            <div className="relative w-full md:w-48">
              <Layers className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text outline-none"
                value={selectedNiveauId}
                onChange={(e) => setSelectedNiveauId(e.target.value)}
                disabled={loadingNiveaux}
              >
                <option value="ALL">{loadingNiveaux ? 'Chargement...' : 'Tous les niveaux'}</option>
                {niveaux.map((n) => (
                  <option key={n.id} value={n.id}>{n.nom}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative w-full md:w-48">
            <BookOpen className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text outline-none"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={selectedSchoolId === 'ALL' || loadingClasses}
            >
              <option value="ALL">{loadingClasses ? 'Chargement...' : (selectedSchoolId === 'ALL' ? 'Sélectionnez une école' : 'Toutes les classes')}</option>
              {classes.filter(c => selectedNiveauId === 'ALL' || c.niveauId === selectedNiveauId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted" />
            <input
              type="text"
              placeholder="Rechercher une matière..."
              className="w-full pl-10 pr-4 py-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loadingCourses ? (
        <div className="text-center py-12 text-brand-text-muted">Chargement des cours...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-brand-card rounded-xl border border-dashed border-brand-border text-brand-text-muted">
          <BookOpen className="w-12 h-12 opacity-20 mx-auto mb-3" />
          <p>Aucun cours trouvé pour ces critères</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-brand-card rounded-2xl shadow-lg overflow-hidden transition-all duration-300 border border-brand-border flex flex-col group hover:-translate-y-1 hover:shadow-brand-accent/10">
              <div 
                className="relative h-40 overflow-hidden shrink-0 cursor-pointer"
                onClick={() => navigate(getDetailPath(course.id))}
              >
                <img 
                  src={getCourseImage(course.subject.name)}
                  alt={course.subject.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-brand-card/60 to-transparent pointer-events-none"></div>
                
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                  <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-md flex items-center gap-1">
                    <School className="w-3 h-3 text-brand-accent" />
                    {course.class.school.name}
                  </span>
                </div>

                <div className="absolute bottom-4 left-5 text-white pointer-events-none">
                  <h3 className="text-xl font-bold drop-shadow-md text-white">{course.subject.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-brand-sidebar border border-brand-border text-brand-text font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md">
                      {course.class.name}
                    </span>
                    <span className="text-[11px] bg-brand-accent/20 border border-brand-accent/30 text-brand-accent font-semibold px-2 py-0.5 rounded-full backdrop-blur-md">
                      {course._count?.chapters || 0} chapitres
                    </span>
                  </div>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
                  <span className="bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md">
                    Coeff: 1
                  </span>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between bg-brand-card">
                <div className="flex items-center gap-2">
                  {course.teacher.avatarUrl ? (
                    <img src={getFileUrl(course.teacher.avatarUrl)} alt="Avatar" className="w-7 h-7 rounded-full border border-brand-border/50 object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-accent/10 flex items-center justify-center border border-brand-border/50">
                      <span className="text-brand-accent font-semibold text-xs">
                        {course.teacher.firstName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="text-xs font-medium text-brand-text-muted">
                    {course.teacher.firstName} {course.teacher.lastName}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedResources;
