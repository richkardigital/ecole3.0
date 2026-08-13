import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { getFileUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { Book, FileText, Video, File, Link as LinkIcon, Plus, Trash2, FolderPlus, Award, Pencil, ArrowLeft, Megaphone, PlayCircle, CheckCircle } from 'lucide-react';
import Gradebook from '@/components/Gradebook';
import QuizList from '@/components/QuizList';
import ExerciseEditor from '@/components/ExerciseEditor';
import ExerciseTake from '@/components/ExerciseTake';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

interface ExerciseModel {
  id: string;
  title: string;
  type: string;
  isGraded: boolean;
  coefficient: number;
  timeLimit?: number;
  _count: { questions: number };
  submissions?: { id: string; score?: number; maxScore?: number }[];
}

interface CourseModel {
    id: string;
    class: { name: string; school?: { name: string } };
    subject: { name: string };
    teacher: { firstName: string; lastName: string };
    isPublished?: boolean;
  }

interface AssignmentModel {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  type: string;
  _count?: {
    submissions: number;
  };
  submissions?: {
    grade?: {
      value: number;
    }
  }[];
}

interface MaterialModel {
    id: string;
    title: string;
    type: 'PDF' | 'VIDEO' | 'LINK';
    url: string;
    createdAt: string;
    source?: string;
    chapterId?: string;
}

interface ChapterModel {
    id: string;
    title: string;
    content?: string;
    materials: MaterialModel[];
    createdAt?: string;
    progress?: { completed: boolean }[];
    exercises?: ExerciseModel[];
}

interface CourseStats {
    totalStudents: number;
    totalChapters: number;
    totalProgressMarked: number;
    averageProgress: number;
}

const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentModel[]>([]);
  const [activeTab, setActiveTab] = useState<'CONTENT' | 'STUDENTS' | 'TEACHERS' | 'RESOURCES' | 'ASSIGNMENTS' | 'QUIZZES' | 'GRADES'>('CONTENT');
  
  // Chapter & Material State
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [orphanMaterials, setOrphanMaterials] = useState<MaterialModel[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStats | null>(null);
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [courseTeachers, setCourseTeachers] = useState<any[]>([]);
  
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [isSubmittingMat, setIsSubmittingMat] = useState(false);
  const [isSubmittingChap, setIsSubmittingChap] = useState(false);
  
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const [isDeleteAssignModalOpen, setIsDeleteAssignModalOpen] = useState(false);

  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [isDeleteMatModalOpen, setIsDeleteMatModalOpen] = useState(false);

  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null);
  const [isDeleteChapterModalOpen, setIsDeleteChapterModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishScope, setPublishScope] = useState('CLASSE');
  const [isPublishing, setIsPublishing] = useState(false);

  // Exercises Modals State
  const [isExerciseEditorOpen, setIsExerciseEditorOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [takingExerciseId, setTakingExerciseId] = useState<string | null>(null);

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [conductStudents, setConductStudents] = useState<any[]>([]);
  const [conductGrades, setConductGrades] = useState<any[]>([]);
  const [savingConduct, setSavingConduct] = useState<string | null>(null);
  const [saveConductSuccess, setSaveConductSuccess] = useState<string | null>(null);

  // ... (handleConductChange function)
  const handleConductChange = async (studentId: string, value: string, comment?: string) => {
    // Validation
    if (value === '') return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
        alert("La note doit être comprise entre 0 et 20");
        return;
    }

    setSavingConduct(studentId);
    setSaveConductSuccess(null);

    try {
        await api.post('/grades/save', {
            studentId,
            courseId: id,
            value: numValue,
            comment
        });

        // Update local state
        setConductGrades(prev => {
            const existing = prev.find((g: any) => g.studentId === studentId);
            if (existing) {
                return prev.map((g: any) => g.studentId === studentId ? { ...g, value: numValue, comment } : g);
            } else {
                return [...prev, { id: 'temp', studentId, value: numValue, comment }];
            }
        });

        setSaveConductSuccess(studentId);
        setTimeout(() => setSaveConductSuccess(null), 2000);
    } catch (error) {
        console.error("Error saving conduct grade", error);
        alert("Erreur lors de l'enregistrement de la note.");
    } finally {
        setSavingConduct(null);
    }
  };

  const getConductGrade = (studentId: string) => {
      return conductGrades.find((g: any) => g.studentId === studentId);
  };
  const { register: registerMat, handleSubmit: handleSubmitMat, reset: resetMat, watch: watchMat, formState: { errors: errorsMat } } = useForm<{ title: string; type: string; url: string; source?: string; chapterId?: string; file?: FileList }>();
  const { register: registerChap, handleSubmit: handleSubmitChap, reset: resetChap } = useForm<{ title: string; content?: string }>();
  const { register: registerAssign, handleSubmit: handleSubmitAssign, reset: resetAssign, formState: { errors: errorsAssign } } = useForm<{ title: string; description?: string; type: string; dueDate: string; coefficient: number; file?: FileList; voiceNote?: FileList; correction?: FileList }>({
    defaultValues: { type: 'DEVOIR_MAISON' }
  });

  const isTeacher = user?.role === 'ENSEIGNANT' || user?.role === 'DIRECTEUR' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // Seul le SUPER_ADMIN peut créer/modifier les cours, chapitres et supports
  const canCreateContent = isSuperAdmin;
  // Le SUPER_ADMIN et l'ENSEIGNANT peuvent créer des exercices
  const canCreateExercise = isSuperAdmin || user?.role === 'ENSEIGNANT';

  const selectedMatType = watchMat('type', 'PDF');

  const openDeleteAssignmentModal = (assignId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setAssignmentToDelete(assignId);
      setIsDeleteAssignModalOpen(true);
  }

  const openDeleteMaterialModal = (matId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setMaterialToDelete(matId);
      setIsDeleteMatModalOpen(true);
  }

  const openDeleteChapterModal = (chapId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setChapterToDelete(chapId);
      setIsDeleteChapterModalOpen(true);
  }

  const openEditChapterModal = (chapter: ChapterModel, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setEditingChapterId(chapter.id);
      resetChap({ title: chapter.title, content: chapter.content || '' });
      setIsChapterModalOpen(true);
  }

  const confirmDeleteAssignment = async () => {
      if (!assignmentToDelete) return;
      try {
          await api.delete(`/assignments/${assignmentToDelete}`);
          setIsDeleteAssignModalOpen(false);
          setAssignmentToDelete(null);
          fetchCourseDetails();
      } catch (error) {
          console.error("Error deleting assignment", error);
          alert("Impossible de supprimer ce devoir. Veuillez réessayer.");
      }
  }

  const confirmDeleteMaterial = async () => {
      if (!materialToDelete) return;
      try {
          await api.delete(`/courses/materials/${materialToDelete}`);
          setIsDeleteMatModalOpen(false);
          setMaterialToDelete(null);
          fetchCourseDetails();
      } catch (error) {
          console.error("Error deleting material", error);
          alert("Impossible de supprimer ce support. Veuillez réessayer.");
      }
  }

  const confirmDeleteChapter = async () => {
      if (!chapterToDelete) return;
      try {
          await api.delete(`/courses/chapters/${chapterToDelete}`);
          setIsDeleteChapterModalOpen(false);
          setChapterToDelete(null);
          fetchCourseDetails();
      } catch (error) {
          console.error("Error deleting chapter", error);
          alert("Impossible de supprimer ce chapitre. Veuillez réessayer.");
      }
  }

  const fetchCourseDetails = async () => {
    try {
      if (!id) return;
      setError(null);

      // Fetch course first
      try {
        const courseRes = await api.get(`/courses/${id}`);
        setCourse(courseRes.data);
      } catch (err) {
        console.error("Error fetching course info", err);
        setError("Impossible de charger les détails du cours.");
        return; 
      }

      // Fetch other data
      const fetchAssignments = api.get(`/assignments?courseId=${id}`)
        .then(res => setAssignments(res.data))
        .catch(err => console.error("Error fetching assignments", err));

      const fetchChapters = api.get(`/courses/${id}/content`)
        .then(res => {
            // Mapping to ensure we have dates and content
            const chaptersWithDates = res.data.chapters.map((c: any) => ({
                ...c,
                materials: c.resources || [], // Map backend resources to frontend materials
                createdAt: c.createdAt || new Date().toISOString() // Fallback if not returned
            }));
            setChapters(chaptersWithDates);
            setOrphanMaterials(res.data.orphanMaterials);
        })
        .catch(err => console.error("Error fetching chapters", err));

      const fetchQuizzes = api.get(`/quizzes?courseId=${id}`)
        .then(res => setQuizzes(res.data))
        .catch(err => console.error("Error fetching quizzes", err));

      if (user?.role === 'ENSEIGNANT' || user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR') {
          api.get(`/courses/${id}/stats`)
            .then(res => setCourseStats(res.data))
            .catch(err => console.error("Error fetching course stats", err));
      }

      
      const fetchStudents = api.get(`/courses/${id}/students`)
        .then(res => setCourseStudents(res.data))
        .catch(err => console.error("Error fetching students", err));

      const fetchTeachers = api.get(`/courses/${id}/teachers`)
        .then(res => setCourseTeachers(res.data))
        .catch(err => console.error("Error fetching teachers", err));

      const fetchConduct = api.get(`/grades/${id}/conduct`)

        .then(res => {
            setConductStudents(res.data.students);
            setConductGrades(res.data.grades);
        })
        .catch(err => console.error("Error fetching conduct grades", err));

      await Promise.allSettled([fetchAssignments, fetchChapters, fetchQuizzes, fetchConduct, fetchStudents, fetchTeachers]);

    } catch (error) {
      console.error('Error fetching course details', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
    }
  }, [id]);

  const onSubmitAssignment = async (data: { title: string; description?: string; type: string; dueDate: string; coefficient: number; file?: FileList; voiceNote?: FileList; correction?: FileList }) => {
    try {
      setIsSubmittingAssign(true);
      setAssignmentError(null);
      
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('type', data.type);
    formData.append('dueDate', data.dueDate);
      formData.append('courseId', id as string);
      formData.append('coefficient', String(data.coefficient || 1));
      
      if (data.file && data.file[0]) {
          formData.append('file', data.file[0]);
      }
      if (data.voiceNote && data.voiceNote[0]) {
          formData.append('voiceNote', data.voiceNote[0]); // This assumes backend handles 'voiceNote' field in multer
      }
      if (data.correction && data.correction[0]) {
          formData.append('correction', data.correction[0]); // This assumes backend handles 'correction' field in multer
      }

      await api.post('/assignments', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsAssignmentModalOpen(false);
      resetAssign();
      fetchCourseDetails();
    } catch (error) {
      console.error('Error creating assignment', error);
      const err = error as { response?: { data?: { message?: string } } };
      setAssignmentError(err.response?.data?.message || "Erreur lors de la création du devoir.");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const onSubmitChapter = async (data: { title: string; content?: string }) => {
      try {
          setIsSubmittingChap(true);
          if (editingChapterId) {
              await api.put(`/courses/chapters/${editingChapterId}`, data);
          } else {
              await api.post(`/courses/${id}/chapters`, data);
          }
          setIsChapterModalOpen(false);
          setEditingChapterId(null);
          resetChap();
          fetchCourseDetails();
      } catch (error) {
          console.error("Error creating chapter", error);
          const status = (error as any)?.response?.status;
          const apiMessage = (error as any)?.response?.data?.message;
          const fallbackMessage = (error as any)?.message || "Erreur lors de la création du chapitre";
          const finalMessage = apiMessage || fallbackMessage;
          alert(status ? `${status} - ${finalMessage}` : finalMessage);
      } finally {
          setIsSubmittingChap(false);
      }
  }

  const onSubmitMaterial = async (data: { title: string; type: string; url: string; source?: string; chapterId?: string; file?: FileList }) => {
      try {
          setIsSubmittingMat(true);
          setMaterialError(null);

          if (data.type !== 'LINK' && data.type !== 'VIDEO') {
            if (data.file && data.file[0] && data.file[0].size > 50 * 1024 * 1024) {
              setMaterialError("Le fichier est trop volumineux (max 50MB).");
              setIsSubmittingMat(false);
              return;
            }
          }

          const formData = new FormData();
          formData.append('title', data.title);
          formData.append('type', data.type);
          if (data.source) formData.append('source', data.source);
          if (data.chapterId) formData.append('chapterId', data.chapterId);
          
          if (data.type === 'LINK' || data.type === 'VIDEO') {
               formData.append('url', data.url);
          } else {
               if (data.file && data.file[0]) {
                   formData.append('file', data.file[0]);
               }
          }

          if (editingMaterialId) {
              await api.put(`/courses/materials/${editingMaterialId}`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
              });
          } else {
              await api.post(`/courses/${id}/materials`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
              });
          }
          
          setIsMaterialModalOpen(false);
          setEditingMaterialId(null);
          resetMat();
          fetchCourseDetails();
      } catch (error) {
          console.error("Error adding material", error);
          const err = error as { response?: { data?: { message?: string } } };
          setMaterialError(err.response?.data?.message || "Erreur lors de l'ajout du contenu.");
      } finally {
          setIsSubmittingMat(false);
      }
  }

  const handlePublishCourse = async () => {
      try {
          setIsPublishing(true);
          await api.patch(`/courses/${id}/publish`, { scope: publishScope });
          setIsPublishModalOpen(false);
          fetchCourseDetails();
      } catch (err: any) {
          alert(err.response?.data?.message || "Erreur lors de la publication.");
      } finally {
          setIsPublishing(false);
      }
  };

  const getMaterialIcon = (type: string) => {
      switch (type) {
          case 'VIDEO': return <Video className="w-5 h-5 text-red-500" />;
          case 'PDF': return <File className="w-5 h-5 text-red-500" />;
          case 'LINK': return <LinkIcon className="w-5 h-5 text-blue-500" />;
          default: return <FileText className="w-5 h-5 text-brand-text-muted" />;
      }
  }

  // Helper to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
  };

  const cleanDescription = (desc?: string) => {
    if (!desc) return "";
    return desc.replace(/\[Télécharger le fichier joint\]\(.*?\)/, '').trim();
  };

  if (error) return <div className="p-6 text-red-600 dark:text-red-400">{error}</div>;
  if (!course) return <div className="p-6 text-brand-text">Chargement...</div>;

  const backPath = user?.role === 'SUPER_ADMIN' ? '/admin/courses' : user?.role === 'DIRECTEUR' ? '/directeur/courses' : '/enseignant/courses';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={backPath} className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-bold text-brand-text">Détails du Cours</h2>
      </div>

      <div className="bg-brand-card p-6 rounded-xl shadow-sm border border-brand-border/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
                <Book className="w-8 h-8 text-brand-accent" />
                {course.subject?.name}
                </h1>
                <p className="text-brand-text-muted mt-1">École: <span className="font-semibold">{course.class?.school?.name || 'Non spécifié'}</span> • Classe: <span className="font-semibold">{course.class?.name}</span> • Professeur: <span className="font-semibold">{course.teacher?.firstName} {course.teacher?.lastName}</span></p>
            </div>
            {activeTab === 'CONTENT' && (
                    <div className="flex flex-wrap gap-2">
                        {isSuperAdmin && !course.isPublished && (
                            <Button
                                variant="primary"
                                onClick={() => setIsPublishModalOpen(true)}
                                leftIcon={<Megaphone className="w-4 h-4" />}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-none text-white shadow-lg shadow-emerald-500/20"
                            >
                                Publier (CNED)
                            </Button>
                        )}
                        {canCreateContent && (
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={() => setIsChapterModalOpen(true)}
                                    leftIcon={<FolderPlus className="w-4 h-4" />}
                                >
                                    Nouveau Chapitre
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => setIsMaterialModalOpen(true)}
                                    leftIcon={<Plus className="w-4 h-4" />}
                                >
                                    Ajouter Contenu
                                </Button>
                            </>
                        )}
                    </div>
                )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-brand-border/50 overflow-x-auto">
            <button
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'CONTENT' ? 'text-brand-accent' : 'text-brand-text-muted hover:text-brand-text'}`}
                onClick={() => setActiveTab('CONTENT')}
            >
                Contenu
                {activeTab === 'CONTENT' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-accent"></div>}
            </button>
            <button
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'STUDENTS' ? 'text-brand-accent' : 'text-brand-text-muted hover:text-brand-text'}`}
                onClick={() => setActiveTab('STUDENTS')}
            >
                Élèves
                {activeTab === 'STUDENTS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-accent"></div>}
            </button>
            <button
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'TEACHERS' ? 'text-brand-accent' : 'text-brand-text-muted hover:text-brand-text'}`}
                onClick={() => setActiveTab('TEACHERS')}
            >
                Enseignants
                {activeTab === 'TEACHERS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-accent"></div>}
            </button>
            <button
                className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'ASSIGNMENTS' ? 'text-brand-accent' : 'text-brand-text-muted hover:text-brand-text'}`}
                onClick={() => setActiveTab('ASSIGNMENTS')}
            >
                Devoirs
                {activeTab === 'ASSIGNMENTS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-accent"></div>}
            </button>
            {isTeacher && (
                <button
                    className={`px-6 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${activeTab === 'GRADES' ? 'text-brand-accent' : 'text-brand-text-muted hover:text-brand-text'}`}
                    onClick={() => setActiveTab('GRADES')}
                >
                    Notes & Évaluations
                    {activeTab === 'GRADES' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-accent"></div>}
                </button>
            )}
        </div>
      </div>

      {activeTab === 'CONTENT' ? (
        <div className="space-y-8">
            {isTeacher && courseStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-brand-sidebar p-4 rounded-xl border border-brand-border/50 text-center">
                        <p className="text-xs font-bold text-brand-text-muted uppercase mb-1">Élèves Inscrits</p>
                        <p className="text-2xl font-black text-brand-text">{courseStats.totalStudents}</p>
                    </div>
                    <div className="bg-brand-sidebar p-4 rounded-xl border border-brand-border/50 text-center">
                        <p className="text-xs font-bold text-brand-text-muted uppercase mb-1">Chapitres</p>
                        <p className="text-2xl font-black text-brand-text">{courseStats.totalChapters}</p>
                    </div>
                    <div className="bg-brand-sidebar p-4 rounded-xl border border-brand-border/50 text-center">
                        <p className="text-xs font-bold text-brand-text-muted uppercase mb-1">Progression Globale</p>
                        <p className="text-2xl font-black text-brand-accent">{courseStats.averageProgress.toFixed(1)}%</p>
                    </div>
                    <div className="bg-brand-sidebar p-4 rounded-xl border border-brand-border/50 text-center">
                        <p className="text-xs font-bold text-brand-text-muted uppercase mb-1">Chapitres Terminés (Total)</p>
                        <p className="text-2xl font-black text-green-500">{courseStats.totalProgressMarked}</p>
                    </div>
                </div>
            )}

            {chapters.length === 0 ? (
                <div className="text-center py-12 text-brand-text-muted">
                    Aucun chapitre créé pour le moment.
                </div>
            ) : (
                chapters.map(chapter => (
                    <div key={chapter.id} className="bg-brand-card rounded-xl shadow-sm border border-brand-border/50 overflow-hidden">
                        <div className="bg-brand-sidebar p-4 border-b border-brand-border/50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-brand-text">{chapter.title}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-brand-text-muted">
                                    {formatDate(chapter.createdAt)}
                                </span>
                                {canCreateContent && (
                                    <>
                                        <button
                                            onClick={(e) => openEditChapterModal(chapter, e)}
                                            className="p-2 text-brand-text-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition"
                                            title="Modifier"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => openDeleteChapterModal(chapter.id, e)}
                                            className="p-2 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                                {user?.role === 'APPRENANT' && (
                                    <label className="flex items-center gap-2 cursor-pointer bg-brand-sidebar px-3 py-1.5 rounded-lg border border-brand-border/50 hover:border-brand-accent/50 transition">
                                        <input
                                            type="checkbox"
                                            checked={chapter.progress?.[0]?.completed || false}
                                            onChange={async (e) => {
                                                const completed = e.target.checked;
                                                try {
                                                    await api.post(`/courses/chapters/${chapter.id}/progress`, { completed });
                                                    fetchCourseDetails();
                                                } catch (err) {
                                                    console.error(err);
                                                }
                                            }}
                                            className="w-4 h-4 text-brand-accent rounded border-brand-border focus:ring-brand-accent"
                                        />
                                        <span className="text-xs font-medium text-brand-text">Marqué comme terminé</span>
                                    </label>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {/* Content */}
                            {chapter.content && (
                                <div className="prose prose-invert max-w-none mb-6">
                                    <p className="whitespace-pre-wrap text-brand-text">{chapter.content}</p>
                                </div>
                            )}

                            {/* Materials */}
                            <div className="space-y-3">
                                {chapter.materials.length > 0 && <h4 className="font-semibold text-brand-text mb-2">Supports de cours</h4>}
                                {chapter.materials.map(material => (
                                    <div key={material.id} className="flex items-center justify-between p-3 bg-brand-sidebar rounded-lg border border-brand-border/50">
                                        <div className="flex items-center gap-3">
                                            {getMaterialIcon(material.type)}
                                            <div>
                                                <a 
                                                    href={material.type === 'PDF' ? `${getFileUrl(material.url)}#toolbar=0` : getFileUrl(material.url)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="font-medium text-brand-accent hover:underline"
                                                >
                                                    {material.title}
                                                </a>
                                                {material.type === 'PDF' && <span className="text-xs text-brand-text-muted ml-2">(Lecture seule)</span>}
                                            </div>
                                        </div>
                                        {canCreateContent && (
                                            <div className="flex gap-2">
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingMaterialId(material.id);
                                                    resetMat({
                                                        title: material.title,
                                                        type: material.type,
                                                        url: material.type === 'LINK' || material.type === 'VIDEO' ? material.url : '',
                                                        source: material.source || '',
                                                        chapterId: material.chapterId || ''
                                                    });
                                                    setIsMaterialModalOpen(true);
                                                }} className="text-brand-text-muted hover:text-brand-accent hover:bg-brand-accent/10 p-1 rounded transition">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => openDeleteMaterialModal(material.id, e)} className="text-red-500 hover:bg-red-500/10 p-1 rounded transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Exercises */}
                            <div className="space-y-3 mt-6 pt-4 border-t border-brand-border/30">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-brand-text">Exercices</h4>
                                    {canCreateExercise && (
                                        <button
                                            onClick={() => { setSelectedChapterId(chapter.id); setIsExerciseEditorOpen(true); }}
                                            className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Créer un exercice
                                        </button>
                                    )}
                                </div>
                                
                                {(!chapter.exercises || chapter.exercises.length === 0) && (
                                    <p className="text-sm text-brand-text-muted italic">Aucun exercice pour ce chapitre.</p>
                                )}
                                
                                {chapter.exercises?.map(exercise => {
                                    const submission = exercise.submissions?.[0];
                                    return (
                                        <div key={exercise.id} className="flex items-center justify-between p-3 bg-brand-card rounded-lg border border-brand-border/50 hover:border-brand-accent/50 transition">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${submission ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-accent/10 text-brand-accent'}`}>
                                                    {submission ? <CheckCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold text-brand-text text-sm">{exercise.title}</h5>
                                                    <div className="flex items-center gap-2 text-xs text-brand-text-muted mt-0.5">
                                                        <span className="font-medium">{exercise.type}</span>
                                                        <span>• {exercise._count.questions} question(s)</span>
                                                        {exercise.isGraded && <span className="text-yellow-500 font-medium">• Noté</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {submission && submission.score !== undefined && submission.score !== null && (
                                                    <div className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">
                                                        {submission.score.toFixed(1)} / {submission.maxScore}
                                                    </div>
                                                )}
                                                
                                                {user?.role === 'APPRENANT' ? (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => setTakingExerciseId(exercise.id)}
                                                        leftIcon={<PlayCircle className="w-4 h-4" />}
                                                    >
                                                        {submission ? 'Voir Résultat' : 'Commencer'}
                                                    </Button>
                                                ) : canCreateExercise ? (
                                                    <div className="flex gap-2">
                                                        {/* L'enseignant peut supprimer l'exercice */}
                                                        <button 
                                                            onClick={async () => {
                                                                if (window.confirm("Supprimer cet exercice ?")) {
                                                                    await api.delete(`/exercises/${exercise.id}`);
                                                                    fetchCourseDetails();
                                                                }
                                                            }}
                                                            className="text-brand-text-muted hover:text-red-500 transition p-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      ) : activeTab === 'RESOURCES' ? (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Filter orphan materials or all materials */}
                 {/* Currently showing orphan materials + any other specific resource types requested */}
                 {orphanMaterials.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-brand-text-muted">
                        Aucune ressource supplémentaire.
                    </div>
                 ) : (
                    orphanMaterials.map(material => (
                        <div key={material.id} className="bg-brand-card p-4 rounded-xl shadow-sm border border-brand-border/50 flex flex-col hover:border-brand-accent/30 transition">
                            <div className="flex justify-between items-start mb-3">
                                {getMaterialIcon(material.type)}
                                {isTeacher && (
                                    <button onClick={(e) => openDeleteMaterialModal(material.id, e)} className="text-brand-text-muted hover:text-red-500 transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <h3 className="font-semibold text-brand-text mb-1 line-clamp-1">{material.title}</h3>
                            <p className="text-xs text-brand-text-muted mb-4">{formatDate(material.createdAt)}</p>
                            <a 
                                href={getFileUrl(material.url)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-auto text-sm font-medium text-brand-accent hover:underline flex items-center gap-1"
                            >
                                Ouvrir la ressource
                            </a>
                        </div>
                    ))
                 )}
            </div>
        </div>
      ) : activeTab === 'ASSIGNMENTS' ? (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
                    <FileText className="w-6 h-6 text-brand-accent" />
                    Devoirs à rendre
                </h2>
                {isTeacher && (
                    <Button
                        variant="primary"
                        onClick={() => navigate(`/enseignant/courses/${id}/assignments/new`)}
                        leftIcon={<Plus className="w-4 h-4" />}
                    >
                        Ajouter Devoir
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.length === 0 && <div className="col-span-full text-center text-brand-text-muted italic py-10">Aucun devoir publié.</div>}
                {assignments.map(assignment => (
                    <div key={assignment.id} className="bg-brand-card p-6 rounded-xl border border-brand-border/50 hover:shadow-lg transition-all duration-300 hover:border-brand-accent/50 group relative">
                            <Link to={`/assignments/${assignment.id}`} className="block h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-brand-accent/10 p-2 rounded-lg text-brand-accent">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-2">
                                        {assignment.submissions?.[0]?.grade && (
                                            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">
                                                {assignment.submissions[0].grade.value}/20
                                            </span>
                                        )}
                                        <span className="text-xs font-mono bg-orange-500/10 text-orange-500 px-2 py-1 rounded">
                                            {new Date(assignment.dueDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded">
                                        {assignment.type === 'EXERCICE_MAISON' ? 'Exercice (Non noté)' : 
                                         assignment.type === 'DEVOIR_CLASSE' ? 'Devoir de classe' : 
                                         assignment.type === 'DEVOIR_NIVEAU' ? 'Devoir de niveau' : 'Devoir maison'}
                                    </span>
                                </div>

                                <h3 className="font-bold text-lg text-brand-text group-hover:text-brand-accent transition mb-2">{assignment.title}</h3>
                                
                                {assignment.description && <p className="text-sm text-brand-text-muted line-clamp-3 mb-4 grow">{cleanDescription(assignment.description)}</p>}
                                
                                <div className="mt-auto pt-4 border-t border-brand-border/50 flex justify-between items-center text-sm">
                                    <span className="text-brand-text-muted">
                                        {isTeacher ? `${assignment._count?.submissions || 0} rendus` : 'Voir les détails'}
                                    </span>
                                    <span className="text-brand-accent font-medium group-hover:underline">Ouvrir</span>
                                </div>
                            </div>
                    </Link>
                        {isTeacher && (
                            <button 
                                onClick={(e) => openDeleteAssignmentModal(assignment.id, e)}
                                className="absolute top-4 right-4 p-2 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                                title="Supprimer le devoir"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        </div>
                ))}
            </div>
        </div>
      ) : activeTab === 'QUIZZES' ? (
        <QuizList courseId={id!} isTeacher={isTeacher} quizzes={quizzes} onUpdate={fetchCourseDetails} />
      ) : (
        <div className="space-y-8">
            {/* Conduct / Participation Section */}
            <div className="bg-brand-card p-6 rounded-xl shadow-sm border border-brand-border/50 overflow-x-auto">
                <h2 className="text-xl font-bold text-brand-text mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-brand-accent" />
                    Note de Conduite / Participation
                </h2>
                
                {conductStudents.length === 0 ? (
                    <p className="text-brand-text-muted italic">Aucun élève inscrit.</p>
                ) : (
                    <table className="w-full border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-brand-sidebar">
                                <th className="p-3 text-left border border-brand-border/30 text-sm font-semibold text-brand-text">Élève</th>
                                <th className="p-3 text-center border border-brand-border/30 text-sm font-semibold text-brand-text w-32">Note /20</th>
                                <th className="p-3 text-left border border-brand-border/30 text-sm font-semibold text-brand-text">Commentaire (Optionnel)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conductStudents.map((student: any) => {
                                const grade = getConductGrade(student.id);
                                const isSaving = savingConduct === student.id;
                                const isSuccess = saveConductSuccess === student.id;
                                
                                return (
                                    <tr key={student.id} className="hover:bg-brand-sidebar/50 transition">
                                        <td className="p-3 border border-brand-border/30 text-sm font-medium text-brand-text">
                                            {student.lastName} {student.firstName}
                                        </td>
                                        <td className="p-2 border border-brand-border/30 text-center relative">
                                            <div className="flex items-center justify-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="20"
                                                    step="0.5"
                                                    className={`w-20 p-2 text-center border rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text ${isSuccess ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-brand-border/50'}`}
                                                    defaultValue={grade ? grade.value : ''}
                                                    onBlur={(e) => {
                                                        const val = e.target.value;
                                                        const currentVal = grade ? grade.value : undefined;
                                                        if (val !== '' && parseFloat(val) !== currentVal) {
                                                            handleConductChange(student.id, val, grade?.comment);
                                                        }
                                                    }}
                                                    disabled={!isTeacher}
                                                />
                                                {isSaving && <span className="w-3 h-3 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></span>}
                                                {isSuccess && <div className="text-emerald-500">✓</div>}
                                            </div>
                                        </td>
                                        <td className="p-2 border border-brand-border/30">
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text text-sm"
                                                placeholder="Ajouter une observation..."
                                                defaultValue={grade ? grade.comment || '' : ''}
                                                onBlur={(e) => {
                                                    const comment = e.target.value;
                                                    const currentComment = grade ? grade.comment : '';
                                                    if (comment !== currentComment && grade && grade.value !== undefined) {
                                                        handleConductChange(student.id, grade.value.toString(), comment);
                                                    }
                                                }}
                                                disabled={!isTeacher || !grade}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <Gradebook courseId={id!} />
        </div>
      )}

      {/* Delete Assignment Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteAssignModalOpen}
        onClose={() => setIsDeleteAssignModalOpen(false)}
        onConfirm={confirmDeleteAssignment}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer ce devoir ? Cette action est irréversible."
        confirmText="Supprimer"
        confirmStyle="danger"
      />

      {/* Delete Material Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteMatModalOpen}
        onClose={() => setIsDeleteMatModalOpen(false)}
        onConfirm={confirmDeleteMaterial}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer ce support de cours ? Cette action est irréversible."
        confirmText="Supprimer"
        confirmStyle="danger"
      />

      {/* Delete Chapter Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteChapterModalOpen}
        onClose={() => setIsDeleteChapterModalOpen(false)}
        onConfirm={confirmDeleteChapter}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer ce chapitre ? Les supports de ce chapitre seront conservés mais déplacés dans 'Autres Ressources'."
        confirmText="Supprimer"
        confirmStyle="danger"
      />

      {/* Create Chapter Modal */}
      <Modal
        isOpen={isChapterModalOpen}
        onClose={() => {
            setIsChapterModalOpen(false);
            setEditingChapterId(null);
            resetChap();
        }}
        title={editingChapterId ? 'Modifier le chapitre' : 'Nouveau Chapitre'}
      >
        <form onSubmit={handleSubmitChap(onSubmitChapter)} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-text-muted ml-1">Titre du chapitre</label>
                <input
                {...registerChap('title', { required: true })}
                className="w-full bg-brand-sidebar border border-brand-border/50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text"
                placeholder="Ex: Introduction à l'Algèbre"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-text-muted ml-1">Contenu du cours</label>
                <textarea
                {...registerChap('content')}
                rows={6}
                className="w-full bg-brand-sidebar border border-brand-border/50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text resize-none"
                placeholder="Résumé du cours, points clés, instructions..."
                />
            </div>

            <div className="flex gap-4 pt-4">
                <Button
                type="button"
                variant="secondary"
                onClick={() => {
                    setIsChapterModalOpen(false);
                    setEditingChapterId(null);
                    resetChap();
                }}
                className="flex-1"
                >
                Annuler
                </Button>
                <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingChap}
                className="flex-1"
                >
                {isSubmittingChap ? (editingChapterId ? 'Modification...' : 'Création...') : (editingChapterId ? 'Enregistrer' : 'Créer')}
                </Button>
            </div>
        </form>
      </Modal>

      {/* Create Assignment Modal */}
      <Modal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        title="Nouveau Devoir"
      >
        <form onSubmit={handleSubmitAssign(onSubmitAssignment)} className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Titre</label>
            <input
                {...registerAssign('title', { required: 'Le titre est requis' })}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                placeholder="Ex: Exercices Chapitre 1"
            />
            {errorsAssign.title && <span className="text-red-500 text-sm">{errorsAssign.title.message as string}</span>}
            </div>

            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Description</label>
            <textarea
                {...registerAssign('description')}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                placeholder="Instructions..."
                rows={3}
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Coefficient</label>
            <input
                type="number"
                min="1"
                {...registerAssign('coefficient')}
                defaultValue={1}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Fichier (PDF/Word)</label>
            <input
                type="file"
                {...registerAssign('file')}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                accept=".pdf,.doc,.docx"
            />
            <p className="text-xs text-brand-text-muted mt-1">Facultatif : Joindre un fichier d'instructions.</p>
            </div>

            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Note vocale (MP3)</label>
            <input
                type="file"
                {...registerAssign('voiceNote')}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                accept="audio/*"
            />
            <p className="text-xs text-brand-text-muted mt-1">Facultatif : Consigne ou feedback audio.</p>
            </div>

            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Corrigé (PDF/Image)</label>
            <input
                type="file"
                {...registerAssign('correction')}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <p className="text-xs text-brand-text-muted mt-1">Facultatif : Partager le corrigé.</p>
            </div>

            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Date limite</label>
            <input
                type="date"
                {...registerAssign('dueDate', { required: 'La date est requise' })}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
            />
            {errorsAssign.dueDate && <span className="text-red-500 text-sm">{errorsAssign.dueDate.message as string}</span>}
            </div>

            {assignmentError && (
            <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
                {assignmentError}
            </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
            <Button
                type="button"
                variant="secondary"
                onClick={() => setIsAssignmentModalOpen(false)}
                disabled={isSubmittingAssign}
            >
                Annuler
            </Button>
            <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingAssign}
            >
                {isSubmittingAssign ? 'Création...' : 'Créer'}
            </Button>
            </div>
        </form>
      </Modal>

      {/* Create / Edit Material Modal */}
      <Modal
        isOpen={isMaterialModalOpen}
        onClose={() => {
            setIsMaterialModalOpen(false);
            setEditingMaterialId(null);
            resetMat();
        }}
        title={editingMaterialId ? "Modifier le support" : "Ajouter un support"}
      >
        <form onSubmit={handleSubmitMat(onSubmitMaterial)} className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Chapitre</label>
            <select
                {...registerMat('chapterId')}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
            >
                <option value="">-- Aucun (Général) --</option>
                {chapters.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                ))}
            </select>
            </div>
            
            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Titre</label>
            <input
                {...registerMat('title', { required: 'Le titre est requis' })}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                placeholder="Ex: Cours PDF"
            />
            {errorsMat.title && <span className="text-red-500 text-sm">{errorsMat.title.message as string}</span>}
            </div>

            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Source / Auteur (Facultatif)</label>
            <input
                {...registerMat('source')}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                placeholder="Ex: Manuel page 12 ou Nom de l'auteur"
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Type</label>
            <select
                {...registerMat('type', { required: true })}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
            >
                <option value="PDF">PDF / Document</option>
                <option value="VIDEO">Vidéo</option>
                <option value="LINK">Lien Web</option>
            </select>
            </div>

            {selectedMatType === 'LINK' || selectedMatType === 'VIDEO' ? (
            <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1">
                    {selectedMatType === 'VIDEO' ? 'Lien Vidéo (YouTube, Vimeo...)' : 'URL / Lien'}
                </label>
                <input
                {...registerMat('url', { required: 'L\'URL est requise' })}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                placeholder={selectedMatType === 'VIDEO' ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
                />
                {errorsMat.url && <span className="text-red-500 text-sm">{errorsMat.url.message as string}</span>}
            </div>
            ) : (
            <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1">Fichier (PDF, Word...)</label>
                <input
                type="file"
                {...registerMat('file', { required: editingMaterialId ? false : 'Le fichier est requis' })}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                />
                {errorsMat.file && <span className="text-red-500 text-sm">{errorsMat.file.message as string}</span>}
            </div>
            )}

            {materialError && (
            <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
                {materialError}
            </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
            <Button
                type="button"
                variant="secondary"
                onClick={() => setIsMaterialModalOpen(false)}
                disabled={isSubmittingMat}
            >
                Annuler
            </Button>
            <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingMat}
            >
                {isSubmittingMat ? (editingMaterialId ? 'Modification...' : 'Ajout...') : (editingMaterialId ? 'Modifier' : 'Ajouter')}
            </Button>
            </div>
        </form>
      </Modal>

      {/* Publish Course Modal */}
      <Modal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title="Publier le cours (CNED)"
      >
        <div className="space-y-4">
            <p className="text-sm text-brand-text-muted">
                La publication d'un cours va le propager automatiquement aux élèves selon la portée choisie. Cette action est irréversible.
            </p>
            <div>
                <label className="block text-sm font-medium text-brand-text mb-2">Portée de la publication</label>
                <select
                    value={publishScope}
                    onChange={(e) => setPublishScope(e.target.value)}
                    className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                >
                    <option value="CLASSE">Classe Actuelle Uniquement</option>
                    <option value="ECOLE">Toute l'École</option>
                    <option value="NIVEAU">Tout le Niveau (National)</option>
                </select>
                 <label className="text-sm font-semibold text-brand-text-muted ml-1 cursor-pointer">S'applique à tout le niveau au lieu de cette seule classe</label>
          </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/30">
                <Button variant="secondary" onClick={() => setIsPublishModalOpen(false)} disabled={isPublishing}>Annuler</Button>
                <Button variant="primary" onClick={handlePublishCourse} isLoading={isPublishing}>Confirmer la publication</Button>
            </div>
        </div>
      </Modal>

      {/* Exercise Editor Modal */}
      {isExerciseEditorOpen && selectedChapterId && (
        <ExerciseEditor
          chapterId={selectedChapterId}
          isOpen={isExerciseEditorOpen}
          onClose={() => { setIsExerciseEditorOpen(false); setSelectedChapterId(null); }}
          onSuccess={fetchCourseDetails}
        />
      )}

      {/* Exercise Take Modal */}
      {takingExerciseId && (
        <Modal
          isOpen={!!takingExerciseId}
          onClose={() => setTakingExerciseId(null)}
          title="Faire l'exercice"
          size="lg"
        >
          <ExerciseTake 
            exerciseId={takingExerciseId} 
            onClose={() => { setTakingExerciseId(null); fetchCourseDetails(); }}
          />
        </Modal>
      )}
    </div>
  );
};

export default CourseDetails;
