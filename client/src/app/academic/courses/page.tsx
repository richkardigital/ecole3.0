import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { Plus, Book, User, Trash2, Loader2, Users } from 'lucide-react';
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
  class: { name: string; level?: string };
  subject: { name: string; code?: string };
  teacher: { id: string; firstName: string; lastName: string };
  coefficient: number;
}

interface Option {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
}

const Courses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [bulkTeacherId, setBulkTeacherId] = useState<string>('');
  const [bulkSubjectId, setBulkSubjectId] = useState<string>('');
  const [bulkCoefficient, setBulkCoefficient] = useState<number>(1);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR';
  const isTeacher = user?.role === 'ENSEIGNANT';

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses', error);
    } finally {
        setIsLoading(false);
    }
  };

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
  }

  const openBulkModal = async () => {
      try {
          setBulkError(null);
          const classesRes = await api.get('/classes');
          const subjectsRes = await api.get('/subjects');
          const teachersRes = await api.get('/users?role=ENSEIGNANT');
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

  useEffect(() => {
    fetchCourses();
  }, []);

  const openModal = () => {
      fetchDataForForm();
      setIsModalOpen(true);
  }

  const openDeleteModal = (courseId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setCourseToDelete(courseId);
      setIsDeleteModalOpen(true);
  }

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
  }

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

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isAdmin ? 'Gestion des Cours' : 'Mes Cours'}
        subtitle="Consultez et organisez les matières enseignées dans les classes."
        action={
            isAdmin && (
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

      {isLoading ? (
          <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          </div>
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <div 
                key={course.id} 
                className="bg-brand-card rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-brand-accent/10 hover:-translate-y-1 transition-all duration-300 border border-brand-border group relative flex flex-col"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="relative h-40 overflow-hidden shrink-0">
                    <img 
                        src={getCourseImage(course.subject?.name || '')} 
                        alt={course.subject?.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-brand-card/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-5 text-white">
                        <h3 className="text-xl font-bold drop-shadow-md text-white">{course.subject?.name}</h3>
                        <span className="text-xs bg-brand-sidebar border border-brand-border text-brand-text font-bold px-2.5 py-1 rounded-full inline-block mt-2 shadow-sm backdrop-blur-md">
                            {course.class?.name}
                        </span>
                    </div>
                    <div className="absolute top-4 right-4">
                         <span className="bg-brand-accent/20 border border-brand-accent/30 text-brand-accent text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md">
                            Coeff: {course.coefficient || 1}
                         </span>
                    </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mt-auto">
                        <div className="flex items-center gap-3 text-sm text-brand-text-muted">
                            <div className="w-9 h-9 rounded-full bg-brand-sidebar border border-brand-border flex items-center justify-center text-brand-accent">
                                 {course.teacher?.firstName?.[0]}{course.teacher?.lastName?.[0]}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-brand-text-muted uppercase font-bold tracking-wider">Enseignant</span>
                                <span className="font-bold text-brand-text truncate max-w-[140px]" title={`Prof. ${course.teacher?.firstName} ${course.teacher?.lastName}`}>
                                    {course.teacher?.firstName} {course.teacher?.lastName}
                                </span>
                            </div>
                        </div>

                        {isAdmin && (
                            <button 
                                onClick={(e) => openDeleteModal(course.id, e)}
                                className="p-2.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                                title="Supprimer le cours"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
              </div>
            ))}
            {courses.length === 0 && (
                <div className="col-span-full py-20 text-center bg-brand-card rounded-2xl border border-dashed border-brand-border">
                    <Book className="w-12 h-12 text-brand-text-muted mx-auto mb-4 opacity-50" />
                    <p className="text-brand-text font-medium">Aucun cours disponible.</p>
                </div>
            )}
          </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteCourse}
        title="Supprimer le cours"
        message="Êtes-vous sûr de vouloir supprimer ce cours ? Cette action est irréversible et supprimera tous les devoirs et contenus associés."
        confirmText="Supprimer définitivement"
        variant="danger"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-md shadow-2xl border border-brand-border animate-fade-in-up">
            <h2 className="text-xl font-bold mb-6 text-brand-text flex items-center gap-2">
                <Book className="w-5 h-5 text-brand-accent" />
                {isAdmin ? 'Attribuer un cours' : 'Créer un nouveau cours'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Classe</label>
                <select
                  {...register('classId', { required: 'La classe est requise' })}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none"
                >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                {errors.classId && <span className="text-red-400 text-sm mt-1 block">{errors.classId.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Matière</label>
                <select
                  {...register('subjectId', { required: 'La matière est requise' })}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none"
                >
                    <option value="">Sélectionner une matière</option>
                    {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                {errors.subjectId && <span className="text-red-400 text-sm mt-1 block">{errors.subjectId.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Coefficient</label>
                <input
                  type="number"
                  min="1"
                  {...register('coefficient', { required: 'Le coefficient est requis', valueAsNumber: true })}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text"
                  defaultValue={1}
                />
              </div>

              {isAdmin && (
                <div>
                    <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Enseignant</label>
                    <select
                    {...register('teacherId', { required: 'L\'enseignant est requis' })}
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none"
                    >
                        <option value="">Sélectionner un enseignant</option>
                        {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                        ))}
                    </select>
                    {errors.teacherId && <span className="text-red-400 text-sm mt-1 block">{errors.teacherId.message as string}</span>}
                </div>
              )}

              {submitError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              <div className="bg-brand-sidebar border border-brand-border text-brand-text-muted p-3 rounded-xl text-sm">
                <p className="font-bold text-brand-text mb-1">Note :</p>
                <p>Vous pourrez ajouter du contenu (PDF, Vidéo, etc.) une fois le cours créé, en cliquant dessus.</p>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  Créer le cours
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsBulkModalOpen(false)} />
          <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-3xl shadow-2xl border border-brand-border max-h-[90vh] overflow-y-auto custom-scrollbar animate-fade-in-up">
            <h2 className="text-xl font-bold mb-6 text-brand-text flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-accent" />
                Assignation multiple
            </h2>
            <form onSubmit={onSubmitBulk} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Enseignant</label>
                  <select
                    value={bulkTeacherId}
                    onChange={(e) => setBulkTeacherId(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none"
                  >
                    <option value="">Sélectionner un enseignant</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Matière</label>
                  <select
                    value={bulkSubjectId}
                    onChange={(e) => setBulkSubjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none"
                  >
                    <option value="">Sélectionner une matière</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Coefficient</label>
                  <input
                    type="number"
                    min={1}
                    value={bulkCoefficient}
                    onChange={(e) => setBulkCoefficient(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Classes de l'école</label>
                <div className="border border-brand-border rounded-xl max-h-64 overflow-y-auto custom-scrollbar divide-y divide-brand-border bg-brand-sidebar">
                  {classes.map(cls => (
                    <label key={cls.id} className="flex items-center justify-between px-4 py-3 hover:bg-brand-border/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedClassIds.includes(cls.id)}
                          onChange={() => toggleClassSelection(cls.id)}
                          className="h-4 w-4 text-brand-accent bg-brand-bg border-brand-border rounded focus:ring-brand-accent focus:ring-offset-brand-card"
                        />
                        <span className="text-sm font-medium text-brand-text">{cls.name}</span>
                      </div>
                    </label>
                  ))}
                  {classes.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-brand-text-muted">
                      Aucune classe trouvée pour cette école.
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-brand-text-muted">
                  Cochez toutes les classes dans lesquelles cet enseignant aura ce cours.
                </p>
              </div>

              {bulkError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                  {bulkError}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsBulkModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isBulkSubmitting}
                >
                  Assigner le cours aux classes sélectionnées
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
