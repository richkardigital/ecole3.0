import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { getFileUrl } from '@/lib/api';
import { getSubjectIllustration } from '@/lib/subjectIllustrations';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { 
  Book, 
  FileText, 
  Video, 
  File, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  FolderPlus, 
  Award, 
  Pencil, 
  ArrowLeft, 
  Megaphone, 
  PlayCircle, 
  CheckCircle,
  Calendar,
  Clock,
  Download,
  Eye,
  Layers,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  FileCheck,
  BookOpen,
  Users,
  GraduationCap,
  Building2,
  Search,
  Filter,
  Mail,
  Phone,
  School,
  UserCheck,
  TrendingUp,
  BarChart3,
  CheckSquare,
  MessageCircle,
  FileSpreadsheet,
  Volume2,
  Image as ImageIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Gradebook from '@/components/Gradebook';
import QuizList from '@/components/QuizList';
import ExerciseTake from '@/components/ExerciseTake';
import { EvaluationPreviewModal } from '@/components/EvaluationPreviewModal';
import { CreateEvaluationPage } from './CreateEvaluationPage';
import { CreateExercisePage } from './CreateExercisePage';
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
    subject: { id?: string; name: string; code?: string; imageUrl?: string };
    niveau?: { id: string; name?: string; nom?: string };
    academicYear?: { id: string; name: string };
    teacher: { firstName: string; lastName: string };
    isPublished?: boolean;
    coefficient?: number;
  }

interface AssignmentModel {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  startDate?: string;
  timeLimit?: number;
  points?: number;
  coefficient?: number;
  type: string;
  termId?: string;
  term?: { id: string; name: string };
  attachments?: string[];
  fileUrl?: string;
  correctionUrl?: string;
  questions?: any[];
  isNiveauWide?: boolean;
  creatorId?: string;
  createdById?: string;
  teacherId?: string;
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
    type: 'PDF' | 'VIDEO' | 'LINK' | 'LIEN' | 'AUDIO' | 'IMAGE';
    url: string;
    createdAt: string;
    source?: string;
    chapterId?: string;
}

interface ChapterModel {
    id: string;
    title: string;
    content?: string;
    termId?: string;
    term?: { id: string; name: string };
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentModel[]>([]);

  const initialTab = (searchParams.get('tab') as any) || 'CONTENT';
  const [activeTab, setActiveTab] = useState<'CONTENT' | 'SCHOOLS' | 'STUDENTS' | 'TEACHERS' | 'RESOURCES' | 'ASSIGNMENTS' | 'QUIZZES' | 'GRADES'>(
    ['CONTENT', 'SCHOOLS', 'STUDENTS', 'TEACHERS', 'ASSIGNMENTS', 'QUIZZES', 'GRADES'].includes(initialTab) ? initialTab : 'CONTENT'
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['CONTENT', 'SCHOOLS', 'STUDENTS', 'TEACHERS', 'ASSIGNMENTS', 'QUIZZES', 'GRADES'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Students filtering states
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentSchool, setSelectedStudentSchool] = useState('ALL');
  const [selectedStudentClass, setSelectedStudentClass] = useState('ALL');
  const [selectedStudentTerm, setSelectedStudentTerm] = useState('ALL');
  
  // Chapter & Material State
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [orphanMaterials, setOrphanMaterials] = useState<MaterialModel[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStats | null>(null);
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  const [courseTeachers, setCourseTeachers] = useState<any[]>([]);
  const [courseSchools, setCourseSchools] = useState<any[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('ALL');

  const availableTerms = terms.length > 0 
    ? terms 
    : [
        { id: 'TRIMESTRE_1', name: 'Trimestre 1' },
        { id: 'TRIMESTRE_2', name: 'Trimestre 2' },
        { id: 'TRIMESTRE_3', name: 'Trimestre 3' }
      ];

  const matchesSelectedTerm = (
    item: { termId?: string | null; term?: { id?: string; name?: string } | null; title?: string },
    filter: string,
    termsList: Array<{ id: string; name: string }>
  ) => {
    if (!filter || filter === 'ALL') return true;

    const itemTermId = item.termId || item.term?.id;
    const itemTermName = item.term?.name || (itemTermId ? termsList.find(t => t.id === itemTermId)?.name : null) || '';

    // Direct match
    if (itemTermId === filter) return true;
    if (itemTermName && itemTermName.toLowerCase() === filter.toLowerCase()) return true;

    // Filter term name resolution
    const filterTermObj = termsList.find(t => t.id === filter);
    const filterName = (filterTermObj?.name || filter).toLowerCase();

    // Determine target index: 1, 2, or 3
    const isTargetT1 = filter === 'TRIMESTRE_1' || filterName.includes('1') || filterName.includes('premier') || filterName.includes('trimestre 1');
    const isTargetT2 = filter === 'TRIMESTRE_2' || filterName.includes('2') || filterName.includes('deux') || filterName.includes('second') || filterName.includes('trimestre 2');
    const isTargetT3 = filter === 'TRIMESTRE_3' || filterName.includes('3') || filterName.includes('trois') || filterName.includes('trimestre 3');

    // Check item term name or title (e.g. "Devoir 1 Trimestre 1", "Chapitre 1 - T1")
    const combinedItemText = `${itemTermName} ${item.title || ''}`.toLowerCase();
    if (itemTermName || item.title) {
      if (isTargetT1 && (combinedItemText.includes('1') || combinedItemText.includes('premier') || combinedItemText.includes('trimestre 1') || combinedItemText.includes('t1'))) return true;
      if (isTargetT2 && (combinedItemText.includes('2') || combinedItemText.includes('deux') || combinedItemText.includes('second') || combinedItemText.includes('trimestre 2') || combinedItemText.includes('t2'))) return true;
      if (isTargetT3 && (combinedItemText.includes('3') || combinedItemText.includes('trois') || combinedItemText.includes('trimestre 3') || combinedItemText.includes('t3'))) return true;
    }

    // If item has no term assigned at all, default to Trimestre 1
    if (!itemTermId && !itemTermName) {
      return isTargetT1;
    }

    return false;
  };
  
  const [pageViewMode, setPageViewMode] = useState<'DETAILS' | 'CREATE_EVALUATION' | 'CREATE_EXERCISE'>('DETAILS');
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  const [isCreateEvalModalOpen, setIsCreateEvalModalOpen] = useState(false);
  const [previewEvaluation, setPreviewEvaluation] = useState<any | null>(null);
  const [selectedEvalFilter, setSelectedEvalFilter] = useState<'ALL' | 'COMPOSITION' | 'DEVOIR'>('ALL');
  const [selectedEvalTerm, setSelectedEvalTerm] = useState<string>('ALL');

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

  const [exerciseToDelete, setExerciseToDelete] = useState<string | null>(null);
  const [isDeleteExerciseModalOpen, setIsDeleteExerciseModalOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishScope, setPublishScope] = useState('CLASSE');
  const [isPublishing, setIsPublishing] = useState(false);

  // Exercises State
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [takingExerciseId, setTakingExerciseId] = useState<string | null>(null);

  const [quizzes, setQuizzes] = useState<any[]>([]);

  const { register: registerMat, handleSubmit: handleSubmitMat, reset: resetMat, watch: watchMat, formState: { errors: errorsMat } } = useForm<{ title: string; type: string; url: string; source?: string; chapterId?: string; file?: FileList }>();
  const { register: registerChap, handleSubmit: handleSubmitChap, reset: resetChap } = useForm<{ title: string; content?: string; termId?: string }>();
  const { register: registerAssign, handleSubmit: handleSubmitAssign, reset: resetAssign, formState: { errors: errorsAssign } } = useForm<{ title: string; description?: string; type: string; dueDate: string; coefficient: number; file?: FileList; voiceNote?: FileList; correction?: FileList }>({
    defaultValues: { type: 'DEVOIR_NIVEAU' }
  });

  const isTeacher = user?.role === 'ENSEIGNANT' || user?.role === 'DIRECTEUR' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isDirecteur = user?.role === 'DIRECTEUR';
  // Seul le SUPER_ADMIN et le DIRECTEUR gèrent la création et modification des chapitres
  const canManageChapters = isSuperAdmin || isDirecteur;
  // Le SUPER_ADMIN, DIRECTEUR et l'ENSEIGNANT peuvent ajouter des supports et créer des exercices
  const canCreateContent = isSuperAdmin || isDirecteur || user?.role === 'ENSEIGNANT';
  const canCreateExercise = isSuperAdmin || isDirecteur || user?.role === 'ENSEIGNANT';

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

  const openDeleteExerciseModal = (exerciseId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setExerciseToDelete(exerciseId);
      setIsDeleteExerciseModalOpen(true);
  }

  const confirmDeleteExercise = async () => {
      if (!exerciseToDelete) return;
      try {
          await api.delete(`/exercises/${exerciseToDelete}`);
          setIsDeleteExerciseModalOpen(false);
          setExerciseToDelete(null);
          fetchCourseDetails();
      } catch (error) {
          console.error("Error deleting exercise", error);
          alert("Impossible de supprimer cet exercice. Veuillez réessayer.");
      }
  }

  const openEditChapterModal = (chapter: ChapterModel, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setEditingChapterId(chapter.id);
      resetChap({ title: chapter.title, content: chapter.content || '', termId: chapter.termId || '' });
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

      let currentCourseYearId: string | undefined;
      // Fetch course first
      try {
        const courseRes = await api.get(`/courses/${id}`);
        setCourse(courseRes.data);
        currentCourseYearId = courseRes.data?.academicYearId;
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
        .then(res => setCourseStudents(res.data || []))
        .catch(err => console.error("Error fetching students", err));

      const fetchTeachers = api.get(`/courses/${id}/teachers`)
        .then(res => setCourseTeachers(res.data || []))
        .catch(err => console.error("Error fetching teachers", err));

      const fetchSchools = api.get(`/courses/${id}/schools`)
        .then(res => setCourseSchools(res.data || []))
        .catch(err => console.error("Error fetching schools", err));

      const fetchTerms = api.get('/academic/years')
        .then(res => {
          const years = res.data || [];
          const matchYear = years.find((y: any) => y.id === currentCourseYearId) || years.find((y: any) => y.isCurrent) || years[0];
          if (matchYear && matchYear.terms?.length) {
            setTerms(matchYear.terms);
          }
        })
        .catch(err => console.error("Error fetching terms", err));

      await Promise.allSettled([fetchAssignments, fetchChapters, fetchQuizzes, fetchStudents, fetchTeachers, fetchSchools, fetchTerms]);

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

  const onSubmitChapter = async (data: { title: string; content?: string; termId?: string }) => {
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

  const onSubmitMaterial = async (data: { title: string; type: string; url?: string; source?: string; chapterId?: string; file?: FileList }) => {
      try {
          setIsSubmittingMat(true);
          setMaterialError(null);

          const hasFile = data.file && data.file[0];
          const hasUrl = data.url && data.url.trim() !== '';

          if (hasFile && data.file![0].size > 100 * 1024 * 1024) {
            setMaterialError("Le fichier est trop volumineux (maximum 100 Mo).");
            setIsSubmittingMat(false);
            return;
          }

          if (!editingMaterialId && !hasFile && !hasUrl) {
            setMaterialError("Veuillez soit sélectionner un fichier, soit renseigner un lien/URL.");
            setIsSubmittingMat(false);
            return;
          }

          const formData = new FormData();
          formData.append('title', data.title.trim());
          formData.append('type', data.type || 'PDF');
          if (data.source) formData.append('source', data.source.trim());
          if (data.chapterId) formData.append('chapterId', data.chapterId);
          
          if (hasUrl) {
            formData.append('url', data.url!.trim());
          }
          if (hasFile) {
            formData.append('file', data.file![0]);
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
      } catch (error: any) {
          console.error("Error adding/updating material", error);
          const err = error as { response?: { data?: { message?: string } } };
          setMaterialError(err.response?.data?.message || "Erreur lors de l'enregistrement du support de cours.");
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
      switch (type?.toUpperCase()) {
          case 'VIDEO': return <Video className="w-5 h-5 text-red-500 shrink-0" />;
          case 'PDF': return <FileText className="w-5 h-5 text-emerald-500 shrink-0" />;
          case 'LINK':
          case 'LIEN': return <LinkIcon className="w-5 h-5 text-blue-500 shrink-0" />;
          case 'AUDIO': return <Volume2 className="w-5 h-5 text-purple-500 shrink-0" />;
          case 'IMAGE': return <ImageIcon className="w-5 h-5 text-amber-500 shrink-0" />;
          default: return <FileText className="w-5 h-5 text-brand-text-muted shrink-0" />;
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

  if (pageViewMode === 'CREATE_EVALUATION' && course) {
    return (
      <CreateEvaluationPage
        courseId={course.id}
        courseSubject={course.subject?.name}
        courseNiveau={(course as any).niveau?.name || (course as any).niveau?.nom || course.class?.name || 'Global'}
        defaultCoefficient={(course as any).coefficient || 1}
        availableTerms={availableTerms}
        evaluationId={editingEvaluationId || undefined}
        onBack={() => {
          setEditingEvaluationId(null);
          setPageViewMode('DETAILS');
        }}
        onSuccess={() => {
          setEditingEvaluationId(null);
          setPageViewMode('DETAILS');
          fetchCourseDetails();
        }}
      />
    );
  }

  if (pageViewMode === 'CREATE_EXERCISE' && course) {
    return (
      <CreateExercisePage
        courseId={course.id}
        courseSubject={course.subject?.name}
        courseNiveau={(course as any).niveau?.name || (course as any).niveau?.nom || course.class?.name || 'Global'}
        chapters={chapters.map(c => ({ id: c.id, title: c.title, termId: c.termId, term: c.term }))}
        initialChapterId={selectedChapterId || undefined}
        exerciseId={editingExerciseId || undefined}
        availableTerms={availableTerms}
        onBack={() => {
          setEditingExerciseId(null);
          setPageViewMode('DETAILS');
        }}
        onSuccess={() => {
          setEditingExerciseId(null);
          setPageViewMode('DETAILS');
          fetchCourseDetails();
        }}
      />
    );
  }

  const backPath = user?.role === 'SUPER_ADMIN' ? '/admin/courses' : user?.role === 'DIRECTEUR' ? '/directeur/courses' : user?.role === 'ENSEIGNANT' ? '/enseignant/courses' : user?.role === 'EDUCATEUR' ? '/educateur/courses' : '/courses';

  return (
    <div className="space-y-6">
      {/* ── COURSE BANNER WITH SUBJECT BACKGROUND ILLUSTRATION ── */}
      <div className="bg-brand-card border border-brand-border rounded-3xl overflow-hidden shadow-lg relative group">
        <div className="min-h-56 sm:min-h-64 relative overflow-hidden bg-slate-950 flex flex-col justify-between p-6 sm:p-8">
          {/* Background image of the subject */}
          <img 
            src={getSubjectIllustration(course.subject?.name, course.subject?.imageUrl)} 
            alt={course.subject?.name || "Cours"}
            className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          />
          {/* Deep gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-black/35 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent pointer-events-none" />

          {/* Top Row: Back button, Badges & Actions */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link 
                to={backPath} 
                className="px-3 py-1.5 bg-black/50 hover:bg-black/75 text-white/90 hover:text-white rounded-xl backdrop-blur-md border border-white/15 transition-all shadow-sm flex items-center gap-2 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </Link>
              <span className="bg-brand-accent/25 text-brand-accent text-xs font-black px-3 py-1.5 rounded-xl border border-brand-accent/40 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <Building2 className="w-3.5 h-3.5" />
                {course.class?.school?.name || (course as any).school?.name || (course as any).schoolName || 'Établissement Principal'}
              </span>
              <span className="bg-emerald-500/25 text-emerald-300 text-xs font-black px-3 py-1.5 rounded-xl border border-emerald-500/40 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                {(course as any).niveau?.name || (course as any).niveau?.nom || (course as any).niveauName || course.class?.name || 'Niveau Global'}
              </span>
              <span className="bg-black/50 text-white/90 text-xs font-bold px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-brand-accent" />
                {(course as any).academicYear?.name || 'Année Active'}
              </span>
              <span className="bg-black/50 text-amber-300 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-amber-500/30 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Coef. {(course as any).coefficient || 1}
              </span>
            </div>

            {/* Actions: New Chapter, Evaluation, Grades */}
            <div className="flex flex-wrap items-center gap-2.5">
              {canManageChapters && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsChapterModalOpen(true)}
                  leftIcon={<FolderPlus className="w-4 h-4" />}
                  className="shadow-lg shadow-emerald-950/60 cursor-pointer backdrop-blur-sm"
                >
                  Nouveau Chapitre
                </Button>
              )}
              {activeTab === 'ASSIGNMENTS' && (canCreateContent || isTeacher || isSuperAdmin) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingEvaluationId(null);
                    setPageViewMode('CREATE_EVALUATION');
                  }}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="cursor-pointer backdrop-blur-sm shadow-md"
                >
                  Nouvelle Évaluation
                </Button>
              )}
              {isTeacher && !isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'GRADES' ? 'CONTENT' : 'GRADES')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border backdrop-blur-md ${
                    activeTab === 'GRADES'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-black/50 text-white hover:bg-black/70 border-white/20 shadow-sm'
                  }`}
                >
                  {activeTab === 'GRADES' ? '← Retour au cours' : 'Notes & Évaluations'}
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Course Title & Subject Meta */}
          <div className="relative z-10 mt-6 sm:mt-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white drop-shadow-md tracking-tight flex flex-wrap items-center gap-3">
              <span>{course.subject?.name || 'Détails du Cours'}</span>
              {course.subject?.code && (
                <span className="text-xs font-mono font-bold bg-white/15 text-white/90 px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-xs">
                  {course.subject.code}
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-emerald-200/90 mt-2 flex flex-wrap items-center gap-2 drop-shadow">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{course.class?.school?.name || (course as any).school?.name || 'Établissement Principal'}</span>
              <span>•</span>
              <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{chapters.length} chapitre{chapters.length > 1 ? 's' : ''} configuré{chapters.length > 1 ? 's' : ''}</span>
              <span>•</span>
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{assignments.length} devoir{assignments.length > 1 ? 's' : ''} & évaluation{assignments.length > 1 ? 's' : ''}</span>
              <span>•</span>
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{courseStudents.length} élève{courseStudents.length > 1 ? 's' : ''} inscrit{courseStudents.length > 1 ? 's' : ''}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Chapitres de cours */}
          <button
              type="button"
              onClick={() => setActiveTab('CONTENT')}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 relative group overflow-hidden cursor-pointer ${
                  activeTab === 'CONTENT'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                      : 'bg-brand-card hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border-brand-border/80 hover:border-emerald-500/40'
              }`}
          >
              <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl transition-colors ${activeTab === 'CONTENT' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-brand-surface text-brand-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30'}`}>
                      <BookOpen className="w-5 h-5" />
                  </div>
                  {activeTab === 'CONTENT' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs uppercase tracking-wider">
                          Actif
                      </span>
                  )}
              </div>
              <div className="text-2xl font-black text-brand-text tracking-tight mb-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {chapters.length}
              </div>
              <div className="text-xs font-extrabold text-brand-text truncate">
                  {user?.role === 'APPRENANT' ? 'Mes Cours & Chapitres' : 'Chapitres de cours'}
              </div>
              <div className="text-[11px] text-brand-muted truncate mt-0.5">
                  {user?.role === 'APPRENANT' ? 'Supports, leçons & révisions' : 'Supports, leçons & pédagogie'}
              </div>
          </button>

          {/* 2. Compositions & Évaluations */}
          <button
              type="button"
              onClick={() => setActiveTab('ASSIGNMENTS')}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 relative group overflow-hidden cursor-pointer ${
                  activeTab === 'ASSIGNMENTS'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                      : 'bg-brand-card hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border-brand-border/80 hover:border-emerald-500/40'
              }`}
          >
              <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl transition-colors ${activeTab === 'ASSIGNMENTS' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-brand-surface text-brand-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30'}`}>
                      <Layers className="w-5 h-5" />
                  </div>
                  {activeTab === 'ASSIGNMENTS' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs uppercase tracking-wider">
                          Actif
                      </span>
                  )}
              </div>
              <div className="text-2xl font-black text-brand-text tracking-tight mb-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {assignments.length}
              </div>
              <div className="text-xs font-extrabold text-brand-text truncate">
                  {user?.role === 'APPRENANT' ? 'Concours & Évaluations' : 'Compositions & Évaluations'}
              </div>
              <div className="text-[11px] text-brand-muted truncate mt-0.5">
                  {user?.role === 'APPRENANT' ? 'Devoirs, concours & quiz' : 'Devoirs, compositions & épreuves'}
              </div>
          </button>

          {/* 3. Liste de la classe / Élèves inscrits */}
          <button
              type="button"
              onClick={() => setActiveTab('STUDENTS')}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 relative group overflow-hidden cursor-pointer ${
                  activeTab === 'STUDENTS'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                      : 'bg-brand-card hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border-brand-border/80 hover:border-emerald-500/40'
              }`}
          >
              <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl transition-colors ${activeTab === 'STUDENTS' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-brand-surface text-brand-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30'}`}>
                      <Users className="w-5 h-5" />
                  </div>
                  {activeTab === 'STUDENTS' && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs uppercase tracking-wider">
                          Actif
                      </span>
                  )}
              </div>
              <div className="text-2xl font-black text-brand-text tracking-tight mb-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {courseStudents.length}
              </div>
              <div className="text-xs font-extrabold text-brand-text truncate">
                  {user?.role === 'APPRENANT' ? 'Mes Camarades de Classe' : 'Liste de la Classe'}
              </div>
              <div className="text-[11px] text-brand-muted truncate mt-0.5">
                  {user?.role === 'APPRENANT' ? 'Effectif & messagerie directe' : 'Effectif, notes & participation'}
              </div>
          </button>
      </div>

      {activeTab === 'CONTENT' ? (
        <div className="space-y-6">
            {/* Barre de filtrage par Trimestre */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-card p-3 rounded-2xl border border-brand-border/80 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-brand-text-muted uppercase tracking-wider px-2">Trimestre :</span>
                    <button
                        type="button"
                        onClick={() => setSelectedTermFilter('ALL')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedTermFilter === 'ALL'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'bg-brand-sidebar text-brand-text-muted hover:text-brand-text border border-brand-border/50'
                        }`}
                    >
                        Tous ({chapters.length})
                    </button>
                    {availableTerms.map(t => {
                        const count = chapters.filter(c => matchesSelectedTerm(c, t.id, availableTerms)).length;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setSelectedTermFilter(t.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    selectedTermFilter === t.id
                                        ? 'bg-emerald-500 text-white shadow-md'
                                        : 'bg-brand-sidebar text-brand-text-muted hover:text-brand-text border border-brand-border/50'
                                }`}
                            >
                                {t.name} ({count})
                            </button>
                        );
                    })}
                </div>
                
                {canManageChapters && (
                    <Button
                        type="button"
                        onClick={() => setIsChapterModalOpen(true)}
                        size="sm"
                        variant="primary"
                        className="flex items-center gap-2 shadow-md"
                    >
                        <Plus className="w-4 h-4" /> Nouveau Chapitre
                    </Button>
                )}
            </div>

            {(() => {
                const filteredChapters = chapters.filter(chap => matchesSelectedTerm(chap, selectedTermFilter, availableTerms));
                if (chapters.length === 0) {
                    return (
                        <div className="text-center py-12 text-brand-text-muted bg-brand-card rounded-2xl border border-brand-border/60">
                            Aucun chapitre créé pour le moment.
                        </div>
                    );
                }
                if (filteredChapters.length === 0) {
                    return (
                        <div className="bg-brand-card rounded-2xl p-12 text-center border border-brand-border/60 space-y-3">
                            <BookOpen className="w-10 h-10 text-brand-muted mx-auto opacity-40" />
                            <p className="text-sm font-semibold text-brand-text">Aucun chapitre pour ce trimestre</p>
                            <p className="text-xs text-brand-muted">Ce cours n'a pas encore de chapitre associé à ce trimestre.</p>
                            <button
                                type="button"
                                onClick={() => setSelectedTermFilter('ALL')}
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
                            >
                                Afficher tous les chapitres
                            </button>
                        </div>
                    );
                }
                return filteredChapters.map(chapter => (
                    <div key={chapter.id} className="bg-brand-card rounded-2xl shadow-sm border border-brand-border/80 overflow-hidden hover:border-emerald-500/50 transition-all">
                        <div className="bg-brand-sidebar p-4 border-b border-brand-border/70 flex flex-wrap justify-between items-center gap-3">
                            <div className="flex items-center gap-3">
                                <h3 className="font-black text-lg text-brand-text">{chapter.title}</h3>
                                {chapter.term ? (
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                        {chapter.term.name}
                                    </span>
                                ) : chapter.termId ? (
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                        {availableTerms.find(t => t.id === chapter.termId)?.name || 'Trimestre'}
                                    </span>
                                ) : (
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
                                        Trimestre 1
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-brand-text-muted mr-1">
                                    {formatDate(chapter.createdAt)}
                                </span>

                                {/* Chapter Level Content Creation Actions */}
                                {canCreateContent && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingMaterialId(null);
                                            resetMat({
                                                title: '',
                                                type: 'PDF',
                                                url: '',
                                                source: '',
                                                chapterId: chapter.id
                                            });
                                            setIsMaterialModalOpen(true);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                                        title="Ajouter un support de cours dans ce chapitre"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Ajouter Contenu
                                    </button>
                                )}

                                {canCreateExercise && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedChapterId(chapter.id);
                                            setPageViewMode('CREATE_EXERCISE');
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-brand-accent/15 hover:bg-brand-accent/25 text-brand-accent border border-brand-accent/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                        title="Créer un exercice pour ce chapitre"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Créer Exercice
                                    </button>
                                )}

                                {canManageChapters && (
                                    <div className="flex items-center gap-1 ml-1 pl-2 border-l border-brand-border/50">
                                        <button
                                            onClick={(e) => openEditChapterModal(chapter, e)}
                                            className="p-1.5 text-brand-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                                            title="Modifier le chapitre"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => openDeleteChapterModal(chapter.id, e)}
                                            className="p-1.5 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                            title="Supprimer le chapitre"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {user?.role === 'APPRENANT' && (
                                    <div>
                                        {chapter.progress?.[0]?.completed ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span>Validé</span>
                                            </span>
                                        ) : (
                                            <label className="flex items-center gap-2 cursor-pointer bg-brand-sidebar px-3 py-1.5 rounded-lg border border-brand-border/50 hover:border-emerald-500/50 transition">
                                                <input
                                                    type="checkbox"
                                                    checked={false}
                                                    onChange={async (e) => {
                                                        if (e.target.checked) {
                                                            try {
                                                                await api.post(`/courses/chapters/${chapter.id}/progress`, { completed: true });
                                                                fetchCourseDetails();
                                                            } catch (err) {
                                                                console.error(err);
                                                            }
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-emerald-500 rounded border-brand-border focus:ring-emerald-500 cursor-pointer"
                                                />
                                                <span className="text-xs font-semibold text-brand-text">Valider ce cours</span>
                                            </label>
                                        )}
                                    </div>
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
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-brand-text">Supports de cours ({chapter.materials.length})</h4>
                                    {canCreateContent && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingMaterialId(null);
                                                resetMat({
                                                    title: '',
                                                    type: 'PDF',
                                                    url: '',
                                                    source: '',
                                                    chapterId: chapter.id
                                                });
                                                setIsMaterialModalOpen(true);
                                            }}
                                            className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Ajouter support
                                        </button>
                                    )}
                                </div>

                                {chapter.materials.length === 0 && (
                                    <p className="text-sm text-brand-text-muted italic">Aucun support de cours pour ce chapitre.</p>
                                )}

                                {chapter.materials.map(material => (
                                    <div key={material.id} className="flex items-center justify-between p-3 bg-brand-sidebar rounded-lg border border-brand-border/50">
                                        <div className="flex items-center gap-3">
                                            {getMaterialIcon(material.type)}
                                            <div>
                                                <a 
                                                    href={material.url.startsWith('http') ? material.url : (material.type === 'PDF' ? `${getFileUrl(material.url)}#toolbar=0` : getFileUrl(material.url))} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="font-medium text-brand-accent hover:underline"
                                                >
                                                    {material.title}
                                                </a>
                                                {material.type === 'PDF' && <span className="text-xs text-brand-text-muted ml-2">(Document)</span>}
                                            </div>
                                        </div>
                                        {canCreateContent && (
                                            <div className="flex gap-2">
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingMaterialId(material.id);
                                                    resetMat({
                                                        title: material.title,
                                                        type: material.type === 'LIEN' ? 'LINK' : material.type,
                                                        url: material.url || '',
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
                                            type="button"
                                            onClick={() => {
                                                setSelectedChapterId(chapter.id);
                                                setEditingExerciseId(null);
                                                setPageViewMode('CREATE_EXERCISE');
                                            }}
                                            className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1 cursor-pointer"
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
                                        <div key={exercise.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-brand-card rounded-xl border border-brand-border/60 hover:border-emerald-500/50 transition-all shadow-xs">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl ${submission ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20'}`}>
                                                    {submission ? <CheckCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h5 className="font-bold text-brand-text text-sm">{exercise.title}</h5>
                                                        {submission && (
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                                                Déjà fait
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-brand-text-muted mt-0.5">
                                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{exercise.type}</span>
                                                        <span>• {exercise._count?.questions || 0} question(s)</span>
                                                        {exercise.isGraded && <span className="text-amber-500 font-bold">• Noté</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 self-end sm:self-center">
                                                {submission && submission.score !== undefined && submission.score !== null && (
                                                    <div className="text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                                                        {submission.score.toFixed(1)} / {submission.maxScore}
                                                    </div>
                                                )}
                                                
                                                {user?.role === 'APPRENANT' || user?.role === 'PARENT' ? (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => navigate(`/exercises/${exercise.id}`, { state: { courseId: id } })}
                                                        leftIcon={submission ? <CheckCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                                                        className="!bg-emerald-600 hover:!bg-emerald-700 font-bold shadow-xs"
                                                    >
                                                        {submission ? 'Voir la correction / Refaire' : 'Commencer l\'exercice'}
                                                    </Button>
                                                ) : canCreateExercise ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <button 
                                                            onClick={() => navigate(`/exercises/${exercise.id}`, { state: { courseId: id } })}
                                                            className="p-1.5 text-brand-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition cursor-pointer"
                                                            title="Aperçu / Tester l'exercice"
                                                        >
                                                            <PlayCircle className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingExerciseId(exercise.id);
                                                                setSelectedChapterId(chapter.id);
                                                                setPageViewMode('CREATE_EXERCISE');
                                                            }}
                                                            className="p-1.5 text-brand-text-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition cursor-pointer"
                                                            title="Modifier l'exercice"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => openDeleteExerciseModal(exercise.id, e)}
                                                            className="p-1.5 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                                                            title="Supprimer l'exercice"
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
                ));
            })()}
        </div>
      ) : activeTab === 'ASSIGNMENTS' ? (
        <div className="space-y-6">
            {/* Header & Stats Banner */}
            <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/60 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-brand-text flex items-center gap-2.5">
                            <Layers className="w-6 h-6 text-brand-accent" />
                            Compositions & Évaluations du cours
                        </h2>
                        <p className="text-xs text-brand-text-muted mt-1">
                            Programmez et gérez les épreuves d'examen et devoirs synchronisés avec l'agenda des élèves
                        </p>
                    </div>
                    {(canCreateContent || isTeacher || isSuperAdmin) && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                setEditingEvaluationId(null);
                                setPageViewMode('CREATE_EVALUATION');
                            }}
                            leftIcon={<Plus className="w-4 h-4" />}
                            className="cursor-pointer"
                        >
                            Nouvelle Composition / Devoir
                        </Button>
                    )}
                </div>

                {/* Filters & Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-brand-border/40">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-brand-text-muted uppercase tracking-wider px-1">Type :</span>
                        <button
                            type="button"
                            onClick={() => setSelectedEvalFilter('ALL')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                selectedEvalFilter === 'ALL'
                                    ? 'bg-brand-accent text-white shadow-sm'
                                    : 'bg-brand-sidebar text-brand-text-muted hover:text-brand-text border border-brand-border/50'
                            }`}
                        >
                            Toutes ({assignments.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedEvalFilter('COMPOSITION')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                selectedEvalFilter === 'COMPOSITION'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-brand-sidebar text-brand-text-muted hover:text-brand-text border border-brand-border/50'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                            Compositions ({assignments.filter(a => a.type.startsWith('COMPOSITION') || a.type.startsWith('COMPO')).length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedEvalFilter('DEVOIR')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                selectedEvalFilter === 'DEVOIR'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-brand-sidebar text-brand-text-muted hover:text-brand-text border border-brand-border/50'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            Devoirs ({assignments.filter(a => !a.type.startsWith('COMPOSITION') && !a.type.startsWith('COMPO')).length})
                        </button>
                    </div>

                    {/* Trimestre Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-brand-text-muted uppercase tracking-wider px-1">Trimestre :</span>
                        <button
                            type="button"
                            onClick={() => setSelectedEvalTerm('ALL')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                selectedEvalTerm === 'ALL'
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-brand-sidebar text-brand-text-muted hover:text-brand-text border border-brand-border/50'
                            }`}
                        >
                            Tous ({assignments.length})
                        </button>
                        {availableTerms.map(t => {
                            const count = assignments.filter(a => matchesSelectedTerm(a, t.id, availableTerms)).length;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSelectedEvalTerm(t.id)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        selectedEvalTerm === t.id
                                            ? 'bg-emerald-500 text-white shadow-md'
                                            : 'bg-brand-sidebar text-brand-text-muted hover:text-brand-text border border-brand-border/50'
                                    }`}
                                >
                                    {t.name} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* List / Cards */}
            {(() => {
                const filtered = assignments.filter(a => {
                    const matchesType = 
                        selectedEvalFilter === 'ALL' ? true :
                        selectedEvalFilter === 'COMPOSITION' ? (a.type.startsWith('COMPOSITION') || a.type.startsWith('COMPO')) :
                        (!a.type.startsWith('COMPOSITION') && !a.type.startsWith('COMPO'));
                    const matchesTerm = matchesSelectedTerm(a, selectedEvalTerm, availableTerms);
                    return matchesType && matchesTerm;
                });

                if (filtered.length === 0) {
                    return (
                        <div className="bg-brand-card rounded-2xl p-12 text-center border border-brand-border/60 space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto">
                                <Layers className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-brand-text">Aucune évaluation trouvée</h3>
                                <p className="text-xs text-brand-text-muted max-w-md mx-auto mt-1">
                                    Aucune composition ou devoir n'a été programmé pour ce filtre.
                                </p>
                            </div>
                            {isTeacher && (
                                <Button
                                    variant="primary"
                                    onClick={() => setPageViewMode('CREATE_EVALUATION')}
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    className="cursor-pointer"
                                >
                                    Programmer une première épreuve
                                </Button>
                            )}
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(assignment => {
                            const isCompo = assignment.type.startsWith('COMPOSITION') || assignment.type.startsWith('COMPO');
                            const isLevelWide = assignment.isNiveauWide || 
                                                assignment.type === 'DEVOIR_NIVEAU' || 
                                                isCompo || 
                                                assignment.type.startsWith('EXAMEN');
                            const isAuthor = assignment.creatorId === user?.id || assignment.createdById === user?.id || assignment.teacherId === user?.id;
                            
                            // Seul le Super Admin peut modifier/supprimer les devoirs de niveau et compositions
                            // L'enseignant peut modifier/supprimer uniquement ses propres devoirs de classe/maison
                            const canEditThis = isSuperAdmin || (user?.role === 'ENSEIGNANT' && !isLevelWide && (isAuthor || (!assignment.creatorId && !assignment.createdById)));
                            const canDeleteThis = isSuperAdmin || (user?.role === 'ENSEIGNANT' && !isLevelWide && (isAuthor || (!assignment.creatorId && !assignment.createdById)));
                            const canViewRendus = isTeacher || isSuperAdmin;

                            const hasQuestions = assignment.questions && assignment.questions.length > 0;
                            const hasFile = (assignment.attachments && assignment.attachments.length > 0) || assignment.fileUrl;
                            const subjectUrl = assignment.attachments?.[0] || assignment.fileUrl;
                            const detailPath = user?.role === 'SUPER_ADMIN' 
                                ? `/admin/assignments/${assignment.id}`
                                : user?.role === 'DIRECTEUR'
                                ? `/directeur/assignments/${assignment.id}`
                                : user?.role === 'ENSEIGNANT'
                                ? `/enseignant/assignments/${assignment.id}`
                                : `/assignments/${assignment.id}`;

                            return (
                                <div 
                                    key={assignment.id} 
                                    className={`bg-brand-card p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl group relative flex flex-col justify-between ${
                                        isCompo 
                                            ? 'border-indigo-500/30 hover:border-indigo-500/60' 
                                            : isLevelWide
                                            ? 'border-amber-500/30 hover:border-amber-500/60'
                                            : 'border-emerald-500/30 hover:border-emerald-500/60'
                                    }`}
                                >
                                    <div>
                                        {/* Badges top */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${
                                                isCompo 
                                                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' 
                                                    : isLevelWide
                                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                                {isCompo 
                                                    ? 'Composition de niveau' 
                                                    : isLevelWide 
                                                    ? 'Devoir de niveau' 
                                                    : assignment.type === 'DEVOIR_MAISON' 
                                                    ? 'Devoir Maison' 
                                                    : assignment.type === 'EXERCICE_MAISON' 
                                                    ? 'Exercice Maison' 
                                                    : 'Devoir de classe'}
                                            </span>
                                            
                                            <div className="flex items-center gap-1.5">
                                                {assignment.submissions?.[0]?.grade && (
                                                    <span className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">
                                                        {assignment.submissions[0].grade.value}/20
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-sidebar border border-brand-border/60 text-brand-text">
                                                    Coef: {assignment.coefficient || 1}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h3 
                                            onClick={() => navigate(detailPath, { state: { from: `${location.pathname}?tab=ASSIGNMENTS`, fromLabel: 'Retour au cours' } })}
                                            className="font-bold text-base text-brand-text group-hover:text-brand-accent transition cursor-pointer mb-2 line-clamp-2"
                                            title="Consulter l'évaluation"
                                        >
                                            {assignment.title}
                                        </h3>

                                        {/* Description / Instructions */}
                                        {assignment.description && (
                                            <p className="text-xs text-brand-text-muted line-clamp-2 mb-3">
                                                {cleanDescription(assignment.description)}
                                            </p>
                                        )}

                                        {/* Meta badges: Term, Format, Duration */}
                                        <div className="flex flex-wrap items-center gap-2 my-3">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-sidebar text-brand-text-muted border border-brand-border/50">
                                                {assignment.term?.name || 'Trimestre 1'}
                                            </span>

                                            {hasQuestions ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                                                    <HelpCircle className="w-3 h-3" />
                                                    Quiz ({assignment.questions?.length} Q)
                                                </span>
                                            ) : hasFile ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                                    <FileText className="w-3 h-3" />
                                                    Sujet Doc/PDF
                                                </span>
                                            ) : null}

                                            {assignment.timeLimit && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-sidebar text-brand-text-muted border border-brand-border/50 flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-indigo-400" />
                                                    {assignment.timeLimit} min
                                                </span>
                                            )}
                                        </div>

                                        {/* Dates */}
                                        <div className="space-y-1 py-2 text-[11px] text-brand-text-muted border-t border-b border-brand-border/40 my-3">
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5 text-brand-accent" />
                                                    Date limite :
                                                </span>
                                                <strong className="text-brand-text">
                                                    {new Date(assignment.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </strong>
                                            </div>
                                        </div>

                                        {/* Quick Download Links */}
                                        {(subjectUrl || assignment.correctionUrl) && (
                                            <div className="flex items-center gap-2 mb-3">
                                                {subjectUrl && (
                                                    <a
                                                        href={getFileUrl(subjectUrl)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2 py-1 rounded bg-brand-sidebar hover:bg-brand-accent/10 border border-brand-border/60 hover:border-brand-accent/40 text-[11px] font-bold text-brand-text flex items-center gap-1 transition"
                                                        title="Télécharger le sujet"
                                                    >
                                                        <Download className="w-3 h-3 text-brand-accent" />
                                                        Sujet
                                                    </a>
                                                )}
                                                {assignment.correctionUrl && (
                                                    <a
                                                        href={getFileUrl(assignment.correctionUrl)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-500 flex items-center gap-1 transition"
                                                        title="Consulter le corrigé"
                                                    >
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                        Corrigé
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="pt-3 border-t border-brand-border/50 flex items-center justify-between text-xs gap-2">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => navigate(detailPath, { state: { from: `${location.pathname}?tab=ASSIGNMENTS`, fromLabel: 'Retour au cours' } })}
                                                className="text-brand-accent font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                                title="Consulter l'évaluation"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Aperçu
                                            </button>

                                            {canEditThis && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingEvaluationId(assignment.id);
                                                        setPageViewMode('CREATE_EVALUATION');
                                                    }}
                                                    className="text-emerald-500 hover:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                                    title="Modifier cette évaluation"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Modifier
                                                </button>
                                            )}
                                        </div>

                                        <button 
                                            type="button"
                                            onClick={() => navigate(detailPath, { state: { from: `${location.pathname}?tab=ASSIGNMENTS`, fromLabel: 'Retour au cours' } })}
                                            className="font-bold text-brand-text-muted hover:text-brand-text transition cursor-pointer"
                                        >
                                            {canViewRendus ? `${assignment._count?.submissions || 0} rendus & notes` : 'Participer'} &rarr;
                                        </button>
                                    </div>

                                    {/* Edit & Delete Top-Right Actions (if authorized) */}
                                    {canEditThis && (
                                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingEvaluationId(assignment.id);
                                                    setPageViewMode('CREATE_EVALUATION');
                                                }}
                                                className="p-1.5 text-brand-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition cursor-pointer"
                                                title="Modifier cette évaluation"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            {canDeleteThis && (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => openDeleteAssignmentModal(assignment.id, e)}
                                                    className="p-1.5 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                                                    title="Supprimer cette évaluation"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
      ) : activeTab === 'QUIZZES' ? (
        <QuizList courseId={id!} isTeacher={isTeacher} quizzes={quizzes} onUpdate={fetchCourseDetails} />
      ) : activeTab === 'STUDENTS' ? (
        <div className="space-y-6">
          {/* Header Banner & Summary Stats */}
          <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/60 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-brand-text flex items-center gap-2.5">
                  <Users className="w-6 h-6 text-brand-accent" />
                  Élèves inscrits & Évaluations du cours
                </h2>
                <p className="text-xs text-brand-text-muted mt-1">
                  Suivez la progression, les devoirs, interrogations, et le taux de participation de chaque élève.
                </p>
              </div>

              {/* Bouton Export Excel / CSV */}
              <button
                type="button"
                onClick={() => {
                  if (!courseStudents || courseStudents.length === 0) {
                    alert("Aucun élève à exporter.");
                    return;
                  }
                  const dataToExport = courseStudents.map((s: any) => ({
                    "Matricule": s.matricule || 'N/A',
                    "Nom": s.lastName,
                    "Prénoms": s.firstName,
                    "Établissement": s.school?.name || (course as any)?.class?.school?.name || '',
                    "Classe": s.className || (course as any)?.class?.name || '',
                    "Participation (%)": `${s.participationRate || 0}%`,
                    "Chapitres complétés": `${s.completedChaptersCount || 0} / ${s.totalChaptersCount || chapters.length}`,
                    "Moyenne": s.overallAverage !== null && s.overallAverage !== undefined ? `${s.overallAverage}/20` : 'N/A',
                    "Notes aux devoirs": (s.grades || []).map((g: any) => `${g.assignment?.title || 'Évaluation'}: ${g.value}/20`).join(' | ')
                  }));
                  const ws = XLSX.utils.json_to_sheet(dataToExport);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Élèves");
                  const subjectName = (course?.subject?.name || 'classe').replace(/[^a-zA-Z0-9]/g, '_');
                  XLSX.writeFile(wb, `liste_eleves_${subjectName}.xlsx`);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exporter la liste (Excel)</span>
              </button>
            </div>

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-brand-border/40">
              <div className="bg-brand-surface/60 p-4 rounded-xl border border-brand-border/50">
                <span className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider block">Total Apprenants</span>
                <span className="text-2xl font-black text-brand-text mt-1 block">{courseStudents.length}</span>
              </div>
              <div className="bg-brand-surface/60 p-4 rounded-xl border border-brand-border/50">
                <span className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider block">Participation Moyenne</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {courseStudents.length > 0
                    ? Math.round(courseStudents.reduce((acc: number, s: any) => acc + (s.participationRate || 0), 0) / courseStudents.length)
                    : 0}%
                </span>
              </div>
              <div className="bg-brand-surface/60 p-4 rounded-xl border border-brand-border/50">
                <span className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider block">Moyenne Générale</span>
                <span className="text-2xl font-black text-brand-accent mt-1 block">
                  {(() => {
                    const withAvg = courseStudents.filter((s: any) => s.overallAverage !== null && s.overallAverage !== undefined);
                    if (withAvg.length === 0) return 'N/A';
                    const avg = withAvg.reduce((acc: number, s: any) => acc + s.overallAverage, 0) / withAvg.length;
                    return `${avg.toFixed(2)}/20`;
                  })()}
                </span>
              </div>
              <div className="bg-brand-surface/60 p-4 rounded-xl border border-brand-border/50">
                <span className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider block">Chapitres au Programme</span>
                <span className="text-2xl font-black text-purple-400 mt-1 block">{chapters.length}</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-brand-border/40">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="text"
                  placeholder="Rechercher élève par nom, prénom ou matricule..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
                />
              </div>

              {/* Filter by School */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-muted" />
                <select
                  value={selectedStudentSchool}
                  onChange={(e) => setSelectedStudentSchool(e.target.value)}
                  className="bg-brand-surface border border-brand-border/50 rounded-xl px-2.5 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:border-brand-accent max-w-[170px] truncate"
                >
                  <option value="ALL">Tous les établissements</option>
                  {Array.from(new Set(courseStudents.map((s: any) => s.school?.name).filter(Boolean))).map((schName: any) => (
                    <option key={schName} value={schName}>{schName}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Class */}
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-brand-muted" />
                <select
                  value={selectedStudentClass}
                  onChange={(e) => setSelectedStudentClass(e.target.value)}
                  className="bg-brand-surface border border-brand-border/50 rounded-xl px-2.5 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:border-brand-accent max-w-[140px] truncate"
                >
                  <option value="ALL">Toutes les classes</option>
                  {Array.from(new Set(courseStudents.map((s: any) => s.className).filter(Boolean))).map((clsName: any) => (
                    <option key={clsName} value={clsName}>{clsName}</option>
                  ))}
                </select>
              </div>

              {/* Filter by Trimestre */}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-muted" />
                <select
                  value={selectedStudentTerm}
                  onChange={(e) => setSelectedStudentTerm(e.target.value)}
                  className="bg-brand-surface border border-brand-border/50 rounded-xl px-2.5 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:border-brand-accent max-w-[140px] truncate"
                >
                  <option value="ALL">Tous les trimestres</option>
                  {availableTerms.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Students List Table */}
          {(() => {
            const filtered = courseStudents.filter((s: any) => {
              const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
              const matricule = (s.matricule || '').toLowerCase();
              const email = (s.email || '').toLowerCase();
              const query = studentSearchQuery.toLowerCase().trim();
              const matchesSearch = !query || fullName.includes(query) || matricule.includes(query) || email.includes(query);
              const matchesSchool = selectedStudentSchool === 'ALL' || s.school?.name === selectedStudentSchool;
              const matchesClass = selectedStudentClass === 'ALL' || s.className === selectedStudentClass;
              return matchesSearch && matchesSchool && matchesClass;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-12 text-center text-brand-muted bg-brand-card rounded-2xl border border-brand-border/60 flex flex-col items-center gap-3">
                  <Users className="w-12 h-12 text-brand-border opacity-50" />
                  <p className="text-base font-semibold text-brand-text">Aucun élève trouvé</p>
                  <p className="text-xs text-brand-muted">Modifiez vos filtres pour afficher des résultats.</p>
                </div>
              );
            }

            return (
              <div className="bg-brand-card rounded-2xl border border-brand-border/60 overflow-hidden shadow-xl">
                <div className="overflow-x-auto min-w-full">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-brand-surface/90 text-brand-muted text-xs uppercase font-bold border-b border-brand-border/60 tracking-wider">
                      <tr>
                        <th className="px-5 py-4">Élève</th>
                        <th className="px-5 py-4">Établissement</th>
                        <th className="px-5 py-4">Classe</th>
                        <th className="px-5 py-4 min-w-[180px]">Participation au Cours</th>
                        <th className="px-5 py-4 min-w-[200px]">Notes & Devoirs</th>
                        <th className="px-5 py-4 text-center">Moyenne</th>
                        <th className="px-5 py-4 text-center">Statut</th>
                        <th className="px-5 py-4 text-center">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 font-medium">
                      {filtered.map((student: any) => {
                        const participation = student.participationRate || 0;
                        const filteredGrades = (student.grades || []).filter((g: any) => {
                          if (selectedStudentTerm === 'ALL') return true;
                          return g.termId === selectedStudentTerm || g.term?.id === selectedStudentTerm || g.term?.name === selectedStudentTerm;
                        });

                        const termAvg = selectedStudentTerm !== 'ALL' && student.termAverages
                          ? student.termAverages[selectedStudentTerm]
                          : student.overallAverage;

                        const targetUserId = student.studentId || student.id || student.userId;

                        return (
                          <tr key={student.id || student.studentId} className="hover:bg-white/5 transition-colors">
                            {/* Élève */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {student.avatarUrl ? (
                                  <img 
                                    src={getFileUrl(student.avatarUrl)} 
                                    alt={`${student.firstName} ${student.lastName}`}
                                    className="w-10 h-10 rounded-xl object-cover border border-brand-accent/25 shrink-0 bg-brand-surface"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-brand-accent/15 text-brand-accent font-black text-sm flex items-center justify-center border border-brand-accent/25 shrink-0">
                                    {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-bold text-brand-text text-sm">
                                    {student.lastName} {student.firstName}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-mono text-brand-muted bg-brand-surface px-1.5 py-0.5 rounded border border-brand-border/40">
                                      {student.matricule || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Établissement */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="text-xs font-semibold text-brand-text">
                                {student.school?.name || 'Établissement Principal'}
                              </div>
                              {student.school?.ville && (
                                <div className="text-[11px] text-brand-muted">
                                  {student.school.ville}
                                </div>
                              )}
                            </td>

                            {/* Classe */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                                {student.className || 'Classe N/A'}
                              </span>
                            </td>

                            {/* Participation Rate (%) */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-brand-text">{participation}%</span>
                                  <span className="text-[11px] text-brand-muted">
                                    {student.completedChaptersCount || 0} / {student.totalChaptersCount || chapters.length} chapitres
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-brand-surface rounded-full overflow-hidden border border-brand-border/40">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      participation >= 75
                                        ? 'bg-emerald-500'
                                        : participation >= 40
                                          ? 'bg-amber-500'
                                          : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(participation, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Notes & Évaluations */}
                            <td className="px-5 py-4">
                              {filteredGrades.length === 0 ? (
                                <span className="text-xs text-brand-muted italic">Aucune note</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                                  {filteredGrades.map((g: any, idx: number) => (
                                    <span
                                      key={idx}
                                      title={`${g.assignment?.title || 'Évaluation'} : ${g.value}/20 (coef ${g.coefficient || 1})`}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                                        g.value >= 10
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                                      }`}
                                    >
                                      <span>{g.assignment?.type ? (g.assignment.type.startsWith('COMPO') ? 'Compo' : 'Devoir') : 'Note'}:</span>
                                      <span className="font-black">{g.value}/20</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Moyenne */}
                            <td className="px-5 py-4 whitespace-nowrap text-center">
                              {termAvg !== null && termAvg !== undefined ? (
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-black border ${
                                    termAvg >= 10
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                                  }`}
                                >
                                  {termAvg}/20
                                </span>
                              ) : (
                                <span className="text-xs text-brand-muted font-bold">-</span>
                              )}
                            </td>

                            {/* Statut */}
                            <td className="px-5 py-4 whitespace-nowrap text-center">
                              {participation >= 50 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Assidu
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  En retard
                                </span>
                              )}
                            </td>

                            {/* Action Messagerie Directe */}
                            <td className="px-5 py-4 whitespace-nowrap text-center">
                              <button
                                type="button"
                                onClick={() => navigate(`/chat?userId=${targetUserId}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold text-xs shadow-xs transition-all cursor-pointer group"
                                title={`Envoyer un message à ${student.firstName} ${student.lastName}`}
                              >
                                <MessageCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                <span>Message</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="space-y-6">
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
                <label className="text-sm font-semibold text-brand-text-muted ml-1">Trimestre académique</label>
                <select
                {...registerChap('termId')}
                className="w-full bg-brand-sidebar border border-brand-border/50 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text cursor-pointer"
                >
                    <option value="">Sélectionner un trimestre</option>
                    {availableTerms.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
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
        title="Nouveau Devoir / Évaluation"
      >
        <form onSubmit={handleSubmitAssign(onSubmitAssignment)} className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Titre</label>
            <input
                {...registerAssign('title', { required: 'Le titre est requis' })}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                placeholder="Ex: Devoir 1 - Chapitre 1"
            />
            {errorsAssign.title && <span className="text-red-500 text-sm">{errorsAssign.title.message as string}</span>}
            </div>

            <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Type d'évaluation</label>
            <select
                {...registerAssign('type', { required: 'Le type est requis' })}
                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text cursor-pointer"
            >
                {isSuperAdmin && (
                  <>
                    <option value="COMPOSITION_NIVEAU">Composition de niveau (Super Admin)</option>
                    <option value="DEVOIR_NIVEAU">Devoir de niveau (Super Admin)</option>
                  </>
                )}
                <option value="DEVOIR_CLASSE">Devoir de classe (Noté)</option>
                <option value="DEVOIR_MAISON">Devoir maison (Noté)</option>
                <option value="EXERCICE_MAISON">Exercice de maison (Entraînement)</option>
            </select>
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
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Format du support</label>
            <select
                {...registerMat('type', { required: true })}
                className="w-full p-2.5 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text cursor-pointer font-medium"
            >
                <option value="PDF">📄 Fichier joint (PDF, Word, Excel, PowerPoint, Image, ZIP...)</option>
                <option value="VIDEO">🎥 Vidéo (Lien YouTube / Vimeo / Web ou Fichier MP4)</option>
                <option value="LINK">🌐 Lien Web (Site internet, article, documentation)</option>
                <option value="AUDIO">🎵 Audio / Note vocale (MP3, enregistrement)</option>
            </select>
            </div>

            {selectedMatType === 'LINK' ? (
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1">
                    URL / Lien Web <span className="text-red-500">*</span>
                </label>
                <input
                  {...registerMat('url', { required: 'L\'URL est requise' })}
                  className="w-full p-2.5 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text font-mono text-sm"
                  placeholder="https://..."
                />
                {errorsMat.url && <span className="text-red-500 text-xs mt-1 block">{errorsMat.url.message as string}</span>}
              </div>
            ) : selectedMatType === 'VIDEO' ? (
              <div className="space-y-3 bg-brand-sidebar/50 p-3.5 rounded-xl border border-brand-border/40">
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Option A : Lien Vidéo (YouTube, Vimeo, Web...)
                  </label>
                  <input
                    {...registerMat('url')}
                    className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text font-mono text-xs"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div className="text-center text-[11px] font-bold text-brand-text-muted uppercase tracking-wider">— OU —</div>
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">
                    Option B : Téléverser un fichier vidéo (MP4, WebM...)
                  </label>
                  <input
                    type="file"
                    {...registerMat('file')}
                    className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-accent/15 file:text-brand-accent hover:file:bg-brand-accent/25 cursor-pointer text-xs"
                    accept="video/*,.mp4,.webm,.mkv,.mov"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-1">
                    Fichier joint (Tout format accepté)
                  </label>
                  <input
                    type="file"
                    {...registerMat('file')}
                    className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip,.rar,audio/*,video/*"
                  />
                  <p className="text-[11px] text-brand-text-muted mt-1">
                    Formats supportés : PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Images, Audio, ZIP... (Max 100 Mo)
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    OU Lien externe / Drive (Facultatif)
                  </label>
                  <input
                    {...registerMat('url')}
                    className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text text-xs"
                    placeholder="https://drive.google.com/... ou lien web"
                  />
                </div>
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
        title="Publier le cours"
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



      {/* Delete Confirmation Modals */}
      <ConfirmationModal
        isOpen={isDeleteChapterModalOpen}
        onClose={() => setIsDeleteChapterModalOpen(false)}
        onConfirm={confirmDeleteChapter}
        title="Supprimer le chapitre"
        message="Êtes-vous sûr de vouloir supprimer ce chapitre et tous les supports associés ? Cette action est irréversible."
        confirmText="Supprimer"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isDeleteMatModalOpen}
        onClose={() => setIsDeleteMatModalOpen(false)}
        onConfirm={confirmDeleteMaterial}
        title="Supprimer le support de cours"
        message="Êtes-vous sûr de vouloir supprimer ce support de cours ?"
        confirmText="Supprimer"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isDeleteAssignModalOpen}
        onClose={() => setIsDeleteAssignModalOpen(false)}
        onConfirm={confirmDeleteAssignment}
        title="Supprimer le devoir / composition"
        message="Êtes-vous sûr de vouloir supprimer ce devoir ? Toutes les soumissions associées seront supprimées."
        confirmText="Supprimer"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isDeleteExerciseModalOpen}
        onClose={() => setIsDeleteExerciseModalOpen(false)}
        onConfirm={confirmDeleteExercise}
        title="Supprimer l'exercice"
        message="Êtes-vous sûr de vouloir supprimer cet exercice interactif ?"
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};

export default CourseDetails;
