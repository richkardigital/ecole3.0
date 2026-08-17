import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api, { getFileUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { 
  Upload, 
  CheckCircle, 
  Clock, 
  User, 
  Award, 
  FileText, 
  Megaphone, 
  ArrowLeft, 
  Download, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Paperclip,
  Save,
  Eye
} from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface QuestionModel {
  id: string;
  text: string;
  type: string;
  points: number;
  expectedAnswer?: string;
  imageUrl?: string;
  options?: QuestionOption[];
}

interface AssignmentModel {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  dueDate: string;
  type?: string;
  coefficient?: number;
  points?: number;
  timeLimit?: number;
  autoGrade?: boolean;
  published?: boolean;
  isPublished?: boolean;
  courseId?: string;
  course?: {
    id?: string;
    subject?: { name: string };
    class?: { name: string };
  };
  subject?: { name: string };
  niveau?: { nom?: string; name?: string };
  attachments?: string[];
  correctionUrl?: string;
  questions?: QuestionModel[];
  submissions?: {
    id: string;
    content?: string;
    fileUrl?: string;
    createdAt?: string;
    submittedAt?: string;
    grade?: {
      value: number;
      comment?: string;
    };
  }[];
}

interface SubmissionModel {
  id: string;
  content?: string;
  fileUrl?: string;
  createdAt?: string;
  submittedAt?: string;
  student: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    enrollments?: { class: { id: string; name: string } }[];
  };
  grade?: {
    id?: string;
    value: number;
    comment?: string;
  };
}

const AssignmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, success, error: toastError } = useToast();

  const [assignment, setAssignment] = useState<AssignmentModel | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Student interaction
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [voiceNote, setVoiceNote] = useState<File | null>(null);
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);
  
  // Student Questionnaire Answers State
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});

  // Staff grading
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionModel | null>(null);
  const [inspectSubmissionAnswers, setInspectSubmissionAnswers] = useState<SubmissionModel | null>(null);

  // Publish & Delete modals
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishScope, setPublishScope] = useState('CLASSE');
  const [isPublishing, setIsPublishing] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register: registerSubmit, handleSubmit: handleSubmitSubmit, reset: resetSubmit } = useForm();
  const { register: registerGrade, handleSubmit: handleSubmitGrade, reset: resetGrade } = useForm();

  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR' || user?.role === 'ENSEIGNANT' || user?.role === 'EDUCATEUR';

  const getBackPath = () => {
    if (user?.role === 'SUPER_ADMIN') return '/admin/assignments';
    if (user?.role === 'DIRECTEUR') return '/directeur/assignments';
    if (user?.role === 'ENSEIGNANT') return '/enseignant/assignments';
    return '/assignments';
  };

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (assignment?.courseId) {
      const courseBase = user?.role === 'SUPER_ADMIN' ? '/admin/courses' : user?.role === 'DIRECTEUR' ? '/directeur/courses' : user?.role === 'ENSEIGNANT' ? '/enseignant/courses' : '/courses';
      navigate(`${courseBase}/${assignment.courseId}?tab=ASSIGNMENTS`);
    } else {
      navigate(getBackPath());
    }
  };

  const getEditPath = () => {
    if (user?.role === 'SUPER_ADMIN') return `/admin/assignments/${id}/edit`;
    if (user?.role === 'DIRECTEUR') return `/directeur/assignments/${id}/edit`;
    if (user?.role === 'ENSEIGNANT') return `/enseignant/assignments/${id}/edit`;
    return `/assignments/${id}/edit`;
  };

  // Helper to extract file link from description
  const getAssignmentFile = (desc?: string) => {
    if (!desc) return null;
    const match = desc.match(/\[Télécharger le fichier joint\]\((.*?)\)/);
    return match ? match[1] : null;
  };

  const cleanDescription = (desc?: string) => {
    if (!desc) return "Aucune consigne spécifiée.";
    return desc.replace(/\[Télécharger le fichier joint\]\(.*?\)/, '').trim() || "Aucune consigne spécifiée.";
  };

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/assignments/${id}`);
      setAssignment(response.data);
      
      if (isStaff) {
        const subsResponse = await api.get(`/assignments/${id}/submissions`);
        setSubmissions(subsResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching assignment', error);
      toastError("Impossible de charger le devoir.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAssignment();
    }
  }, [id, user?.role]);

  // Handle student questionnaire answer change
  const handleOptionSelect = (questionId: string, optionId: string, isMultiple = false) => {
    setStudentAnswers(prev => {
      if (isMultiple) {
        const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        const next = current.includes(optionId)
          ? current.filter((x: string) => x !== optionId)
          : [...current, optionId];
        return { ...prev, [questionId]: next };
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const handleTextAnswerChange = (questionId: string, text: string) => {
    setStudentAnswers(prev => ({
      ...prev,
      [questionId]: text
    }));
  };

  // Submit Interactive Questionnaire by Student
  const onSubmitQuestionnaire = async () => {
    if (!assignment?.questions || assignment.questions.length === 0) return;

    try {
      setIsSubmittingWork(true);
      await api.post(`/assignments/${id}/submit`, {
        answers: studentAnswers,
        content: JSON.stringify(studentAnswers)
      });

      success("Devoir rendu avec succès !");
      fetchAssignment();
    } catch (err: any) {
      console.error("Error submitting questionnaire:", err);
      toastError(err.response?.data?.message || "Erreur lors de la remise du devoir.");
    } finally {
      setIsSubmittingWork(false);
    }
  };

  // Submit Free Text / File by Student
  const onSubmitWork = async (data: any) => {
    try {
      setIsSubmittingWork(true);
      const formData = new FormData();
      formData.append('content', data.content || '');
      
      if (voiceNote) {
        formData.append('file', voiceNote);
      } else if (data.file && data.file[0]) {
        formData.append('file', data.file[0]);
      } else if (data.fileUrl) {
        formData.append('fileUrl', data.fileUrl);
      }

      await api.post(`/assignments/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsSubmitModalOpen(false);
      resetSubmit();
      setVoiceNote(null);
      success("Devoir rendu avec succès !");
      fetchAssignment();
    } catch (error: any) {
      console.error('Error submitting work', error);
      toastError(error.response?.data?.message || "Erreur lors de la soumission du devoir");
    } finally {
      setIsSubmittingWork(false);
    }
  };

  const onGradeWork = async (data: any) => {
    if (!selectedSubmission) return;
    try {
      await api.post(`/assignments/submissions/${selectedSubmission.id}/grade`, {
        value: parseFloat(data.value),
        comment: data.comment
      });
      setIsGradeModalOpen(false);
      resetGrade();
      setSelectedSubmission(null);
      fetchAssignment();
      success("Note attribuée avec succès");
    } catch (error) {
      console.error("Error grading work", error);
      toastError("Erreur lors de l'attribution de la note");
    }
  };

  const openGradeModal = (sub: SubmissionModel) => {
    setSelectedSubmission(sub);
    resetGrade({
      value: sub.grade?.value ?? '',
      comment: sub.grade?.comment ?? ''
    });
    setIsGradeModalOpen(true);
  };

  const handlePublishAssignment = async () => {
    try {
      setIsPublishing(true);
      await api.patch(`/assignments/${id}/publish`, { scope: publishScope, published: true });
      setIsPublishModalOpen(false);
      fetchAssignment();
      success("Devoir publié avec succès !");
    } catch (err: any) {
      toastError(err.response?.data?.message || "Erreur lors de la publication.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteAssignment = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/assignments/${id}`);
      setIsDeleteModalOpen(false);
      success("Devoir supprimé avec succès.");
      navigate(getBackPath());
    } catch (err: any) {
      console.error("Error deleting assignment:", err);
      toastError(err.response?.data?.message || "Erreur lors de la suppression du devoir.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !assignment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-brand-text-muted text-sm font-semibold">Chargement des détails du devoir...</p>
      </div>
    );
  }

  const isPublished = assignment.published || assignment.isPublished;
  const isBeforeStart = assignment.startDate && new Date() < new Date(assignment.startDate);
  const mySubmission = assignment.submissions?.[0];
  const hasQuestions = assignment.questions && assignment.questions.length > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-bold text-brand-text-muted hover:text-brand-text transition cursor-pointer p-2 rounded-xl hover:bg-brand-sidebar"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {location.state?.fromLabel || (location.state?.from?.includes('courses') ? "Retour au cours" : "Retour aux devoirs")}
          </span>
        </button>

        {isStaff && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(getEditPath(), { state: { from: location.state?.from || location.pathname } })}
              leftIcon={<Edit className="w-4 h-4" />}
              className="cursor-pointer"
            >
              Modifier
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
              className="cursor-pointer"
            >
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Header Banner */}
      <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-brand-accent mb-2">
              <span className="bg-brand-accent/15 px-2.5 py-1 rounded-lg border border-brand-accent/30 uppercase">
                {assignment.course?.subject?.name || assignment.subject?.name || "Matière"}
              </span>
              <span className="bg-slate-800 text-brand-text-muted px-2.5 py-1 rounded-lg border border-brand-border/60 uppercase">
                {assignment.niveau?.nom || assignment.niveau?.name || assignment.course?.class?.name || "Niveau Global"}
              </span>
              <span className="bg-slate-800 text-brand-text-muted px-2.5 py-1 rounded-lg border border-brand-border/60">
                Coef {assignment.coefficient || 1}
              </span>
              {assignment.points && (
                <span className="bg-slate-800 text-brand-text-muted px-2.5 py-1 rounded-lg border border-brand-border/60">
                  {assignment.points} pts
                </span>
              )}
              {hasQuestions && ((assignment.attachments && assignment.attachments.length > 0) || getAssignmentFile(assignment.description)) ? (
                <span className="bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Mixte : QCM + Document
                </span>
              ) : hasQuestions ? (
                <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Devoir QCM en ligne
                </span>
              ) : (
                <span className="bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Devoir sur Document / Vocal
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight">
              {assignment.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-brand-text-muted mt-2">
              <span className="flex items-center gap-1.5 text-orange-400 font-bold">
                <Clock className="w-4 h-4" />
                Date limite : {new Date(assignment.dueDate).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {assignment.startDate && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  Ouverture : {new Date(assignment.startDate).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isStaff && !isPublished && (
              <Button
                variant="primary"
                onClick={() => setIsPublishModalOpen(true)}
                leftIcon={<Megaphone className="w-4 h-4" />}
                className="shadow-lg shadow-brand-accent/20 cursor-pointer"
              >
                Publier le devoir
              </Button>
            )}
            {isPublished ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Publié
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5" /> Brouillon
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION APPRENANT — Composition ou Statut de Rendu          */}
      {/* ============================================================ */}
      {!isStaff && (
        <div className="space-y-6">
          {isBeforeStart ? (
            <div className="bg-amber-500/10 border border-amber-500/30 p-8 rounded-2xl text-center space-y-3">
              <Clock className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
              <h3 className="text-xl font-bold text-amber-400">Devoir non encore accessible</h3>
              <p className="text-sm text-brand-text-muted max-w-md mx-auto">
                Ce devoir s'ouvrira officiellement le <span className="font-bold text-brand-text">{new Date(assignment.startDate!).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>. Vous pourrez composer et soumettre vos réponses à ce moment-là.
              </p>
            </div>
          ) : mySubmission ? (
            <div className="bg-brand-card p-6 rounded-2xl border border-emerald-500/30 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border/60">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-brand-text">Vous avez déjà rendu ce devoir</h3>
                    <p className="text-xs text-brand-text-muted">
                      Soumis le {new Date(mySubmission.submittedAt || mySubmission.createdAt || Date.now()).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {mySubmission.grade ? (
                  <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-3 rounded-xl border border-emerald-500/40">
                    <Award className="w-8 h-8 text-yellow-400" />
                    <div>
                      <div className="text-[11px] font-black uppercase text-brand-text-muted">Note Finale</div>
                      <div className="text-2xl font-black text-brand-accent">
                        {mySubmission.grade.value} <span className="text-sm text-brand-text-muted">/ 20</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Correction en attente
                  </span>
                )}
              </div>

              {mySubmission.grade?.comment && (
                <div className="p-4 bg-brand-sidebar rounded-xl border border-brand-border/60">
                  <span className="text-xs font-bold text-brand-text-muted uppercase">Appréciation de l'enseignant :</span>
                  <p className="text-sm text-brand-text italic mt-1">"{mySubmission.grade.comment}"</p>
                </div>
              )}

              {/* Submitted document if file upload */}
              {mySubmission.fileUrl && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs text-brand-text-muted font-bold">Copie soumise :</span>
                  {mySubmission.fileUrl.endsWith('.mp3') || mySubmission.fileUrl.endsWith('.wav') || mySubmission.fileUrl.endsWith('.webm') ? (
                    <audio controls src={getFileUrl(mySubmission.fileUrl)} className="h-8" />
                  ) : (
                    <a
                      href={getFileUrl(mySubmission.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-bold text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 px-3 py-1.5 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Télécharger mon document
                    </a>
                  )}
                </div>
              )}

              {/* Submitted QCM Answers Review */}
              {hasQuestions && mySubmission.content && mySubmission.content.startsWith('{') && (
                <div className="pt-4 border-t border-brand-border/60 space-y-4">
                  <h4 className="text-sm font-bold text-brand-text flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-accent" />
                    Récapitulatif de vos réponses QCM
                  </h4>
                  
                  {(() => {
                    let parsed: Record<string, any> = {};
                    try {
                      parsed = JSON.parse(mySubmission.content || '{}');
                    } catch (_) {}

                    return (
                      <div className="space-y-4">
                        {assignment.questions!.map((q, idx) => {
                          const userAns = parsed[q.id];
                          return (
                            <div key={q.id || idx} className="p-4 bg-brand-sidebar rounded-xl border border-brand-border/70 space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-brand-accent font-black">Question {idx + 1}</span>
                                <span className="text-brand-text-muted">{q.points} pt{q.points > 1 ? 's' : ''}</span>
                              </div>
                              <div 
                                className="text-sm font-medium text-brand-text" 
                                dangerouslySetInnerHTML={{ __html: q.text }}
                              />
                              {q.imageUrl && (
                                <img
                                  src={getFileUrl(q.imageUrl)}
                                  alt={`Illustration Question ${idx + 1}`}
                                  className="max-h-56 max-w-full rounded-xl border border-brand-border/60 object-contain my-2"
                                />
                              )}

                              {q.options && q.options.length > 0 ? (
                                <div className="space-y-1.5 pt-1">
                                  {q.options.map(opt => {
                                    const isSelected = Array.isArray(userAns) ? userAns.includes(opt.id) : userAns === opt.id;
                                    const showCorrect = opt.isCorrect !== undefined;

                                    return (
                                      <div
                                        key={opt.id}
                                        className={`p-2.5 rounded-lg text-xs font-medium border flex items-center justify-between transition-all ${
                                          isSelected
                                            ? 'bg-brand-accent/20 border-brand-accent text-brand-text font-bold'
                                            : 'bg-brand-card/50 border-brand-border/40 text-brand-text-muted'
                                        }`}
                                      >
                                        <span className="flex items-center gap-2">
                                          <input
                                            type={q.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                                            checked={isSelected}
                                            disabled
                                            className="w-3.5 h-3.5 text-brand-accent"
                                          />
                                          <span>{opt.text}</span>
                                        </span>
                                        <div className="flex items-center gap-2">
                                          {isSelected && (
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-accent text-white">
                                              Votre choix
                                            </span>
                                          )}
                                          {showCorrect && opt.isCorrect && (
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                              Bonne réponse
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="p-3 bg-brand-card rounded-lg text-xs text-brand-text border border-brand-border/60">
                                  <span className="text-brand-text-muted font-bold block mb-1">Votre réponse rédigée :</span>
                                  {userAns || <span className="italic text-brand-text-muted">Aucune réponse renseignée.</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            /* Student NOT YET submitted — Composition View */
            <div className="space-y-6">
              {/* Instructions / Consignes */}
              <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-accent" />
                  Consignes du Devoir
                </h3>
                <div 
                  className="p-4 bg-brand-sidebar rounded-xl border border-brand-border/60 text-sm text-brand-text leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: cleanDescription(assignment.description) }}
                />

                {/* Attached subject file */}
                {(getAssignmentFile(assignment.description) || (assignment.attachments && assignment.attachments.length > 0)) && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {getAssignmentFile(assignment.description) && (
                      <a
                        href={getFileUrl(getAssignmentFile(assignment.description)!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-brand-accent/15 border border-brand-accent/30 text-brand-accent font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-brand-accent/25 transition"
                      >
                        <Download className="w-4 h-4" /> Télécharger le sujet officiel
                      </a>
                    )}
                    {assignment.attachments?.map((att, idx) => (
                      <a
                        key={idx}
                        href={getFileUrl(att)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-brand-sidebar border border-brand-border/70 text-brand-text font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-800 transition"
                      >
                        <Paperclip className="w-4 h-4" /> Pièce jointe #{idx + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Composition Mode: Interactive Questionnaire vs File Upload */}
              {hasQuestions ? (
                <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border/60">
                    <div>
                      <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-accent" />
                        Questionnaire QCM Interactif ({assignment.questions!.length} questions)
                      </h3>
                      <p className="text-xs text-brand-text-muted mt-1">
                        Sélectionnez les bonnes réponses ci-dessous puis validez votre devoir.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-brand-text">
                          {Object.keys(studentAnswers).filter(k => studentAnswers[k] && (Array.isArray(studentAnswers[k]) ? studentAnswers[k].length > 0 : String(studentAnswers[k]).trim().length > 0)).length} / {assignment.questions!.length}
                        </span>
                        <span className="text-[11px] text-brand-text-muted block">répondues</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-brand-sidebar h-2 rounded-full overflow-hidden border border-brand-border/40">
                    <div 
                      className="bg-brand-accent h-full transition-all duration-300 rounded-full"
                      style={{ 
                        width: `${Math.round((Object.keys(studentAnswers).filter(k => studentAnswers[k] && (Array.isArray(studentAnswers[k]) ? studentAnswers[k].length > 0 : String(studentAnswers[k]).trim().length > 0)).length / (assignment.questions!.length || 1)) * 100)}%` 
                      }}
                    />
                  </div>

                  <div className="space-y-6">
                    {assignment.questions!.map((q, idx) => (
                      <div key={q.id || idx} className="p-5 bg-brand-sidebar rounded-xl border border-brand-border/70 space-y-4 hover:border-brand-accent/40 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-2.5">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-brand-accent/20 text-brand-accent shrink-0 mt-0.5">
                              Question {idx + 1}
                            </span>
                            <div className="space-y-3">
                              <div 
                                className="text-sm font-bold text-brand-text prose prose-sm max-w-none [&_p]:m-0"
                                dangerouslySetInnerHTML={{ __html: q.text }}
                              />
                              {q.imageUrl && (
                                <img
                                  src={getFileUrl(q.imageUrl)}
                                  alt={`Illustration Question ${idx + 1}`}
                                  className="max-h-64 max-w-full rounded-xl border border-brand-border/60 object-contain shadow-sm"
                                />
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-brand-text-muted shrink-0 bg-brand-card px-2.5 py-1 rounded-lg border border-brand-border/60">
                            {q.points} pt{q.points > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Options */}
                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-2 pt-2">
                            {q.options.map(opt => {
                              const isChecked = Array.isArray(studentAnswers[q.id])
                                ? studentAnswers[q.id].includes(opt.id)
                                : studentAnswers[q.id] === opt.id;

                              return (
                                <label
                                  key={opt.id}
                                  onClick={() => handleOptionSelect(q.id, opt.id, q.type === 'MULTIPLE_CHOICE')}
                                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                                    isChecked
                                      ? 'bg-brand-accent/15 border-brand-accent ring-1 ring-brand-accent text-brand-text font-bold shadow-sm'
                                      : 'bg-brand-card hover:bg-slate-800/80 border-brand-border/60 text-brand-text-muted'
                                  }`}
                                >
                                  <input
                                    type={q.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="w-4 h-4 text-brand-accent focus:ring-brand-accent rounded"
                                  />
                                  <span className="text-sm font-medium">{opt.text}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="pt-2">
                            <textarea
                              value={studentAnswers[q.id] || ''}
                              onChange={(e) => handleTextAnswerChange(q.id, e.target.value)}
                              placeholder="Rédigez votre réponse ici..."
                              rows={3}
                              className="w-full p-3 bg-brand-card border border-brand-border/70 rounded-xl text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-brand-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-xs font-semibold text-brand-text-muted">
                      {Object.keys(studentAnswers).filter(k => studentAnswers[k] && (Array.isArray(studentAnswers[k]) ? studentAnswers[k].length > 0 : String(studentAnswers[k]).trim().length > 0)).length === assignment.questions!.length 
                        ? "✓ Toutes les questions sont renseignées" 
                        : `Il vous reste ${assignment.questions!.length - Object.keys(studentAnswers).filter(k => studentAnswers[k] && (Array.isArray(studentAnswers[k]) ? studentAnswers[k].length > 0 : String(studentAnswers[k]).trim().length > 0)).length} question(s) non renseignée(s)`}
                    </span>

                    <Button
                      type="button"
                      variant="primary"
                      onClick={onSubmitQuestionnaire}
                      isLoading={isSubmittingWork}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      className="shadow-lg shadow-brand-accent/20 cursor-pointer w-full sm:w-auto"
                    >
                      Valider et Soumettre le Devoir
                    </Button>
                  </div>
                </div>
              ) : (
                /* Free response / Document submission */
                <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-brand-border/60">
                    <div>
                      <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
                        <Upload className="w-5 h-5 text-brand-accent" />
                        Rendre votre Devoir sur Document
                      </h3>
                      <p className="text-xs text-brand-text-muted mt-1">
                        Rédigez votre travail ci-dessous, joignez un fichier ou un enregistrement audio.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitSubmit(onSubmitWork)} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">
                        Réponse Rédigée (Texte Libre)
                      </label>
                      <textarea
                        {...registerSubmit('content')}
                        rows={5}
                        placeholder="Rédigez directement votre travail ici..."
                        className="w-full p-3.5 bg-brand-sidebar border border-brand-border/70 rounded-xl text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                      />
                    </div>

                    <div className="p-4 bg-brand-sidebar rounded-xl border border-brand-border/60 space-y-4">
                      <div className="text-xs font-bold text-brand-text-muted uppercase">Joindre un document ou un enregistrement audio</div>
                      
                      <VoiceRecorder onAudioReady={setVoiceNote} />

                      {!voiceNote && (
                        <div>
                          <label className="block text-xs font-semibold text-brand-text-muted mb-1.5">
                            Fichier joint (PDF, Word, Image)
                          </label>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.wav,.ogg,.webm"
                            {...registerSubmit('file')}
                            className="w-full p-2.5 bg-brand-card border border-brand-border/70 rounded-xl text-xs text-brand-text file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-accent/20 file:text-brand-accent cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSubmittingWork}
                        leftIcon={<Upload className="w-4 h-4" />}
                        className="shadow-lg shadow-brand-accent/20 cursor-pointer"
                      >
                        Confirmer et Rendre le Devoir
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION STAFF — Roster des Travaux et Saisie des Notes       */}
      {/* ============================================================ */}
      {isStaff && (
        <div className="space-y-6">
          {/* Sujet Preview Box */}
          <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-accent" />
              Sujet & Consignes
            </h3>
            <div className="p-4 bg-brand-sidebar rounded-xl border border-brand-border/60 text-sm text-brand-text whitespace-pre-wrap">
              {cleanDescription(assignment.description)}
            </div>

            {getAssignmentFile(assignment.description) && (
              <a
                href={getFileUrl(getAssignmentFile(assignment.description)!)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-brand-accent bg-brand-accent/15 px-4 py-2 rounded-xl hover:bg-brand-accent/25 transition"
              >
                <Download className="w-4 h-4" /> Télécharger le sujet joint
              </a>
            )}
          </div>

          {/* Submissions Roster */}
          <div className="bg-brand-card rounded-2xl border border-brand-border/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-brand-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-accent" />
                  Copies & Travaux des Élèves
                </h2>
                <p className="text-xs text-brand-text-muted mt-0.5">
                  {submissions.length} travail/travaux remis au total
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-sidebar border border-brand-border/60 text-brand-text">
                {submissions.filter(s => s.grade != null).length} / {submissions.length} noté(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-brand-sidebar text-brand-text-muted text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-bold">Élève</th>
                    <th className="p-4 font-bold">Date de remise</th>
                    <th className="p-4 font-bold">Contenu / Copie</th>
                    <th className="p-4 font-bold">Note & Feedback</th>
                    <th className="p-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/50 text-sm">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-brand-text-muted italic">
                        Aucun travail rendu pour le moment.
                      </td>
                    </tr>
                  ) : (
                    submissions.map(sub => {
                      const hasQuizAnswers = sub.content && sub.content.startsWith('{');
                      return (
                        <tr key={sub.id} className="hover:bg-brand-sidebar/60 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-accent/20 text-brand-accent flex items-center justify-center font-bold text-xs">
                                {sub.student.firstName[0]}
                              </div>
                              <div>
                                <div className="font-bold text-brand-text">
                                  {sub.student.firstName} {sub.student.lastName}
                                </div>
                                <div className="text-xs text-brand-text-muted">
                                  {sub.student.enrollments?.[0]?.class?.name || sub.student.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs text-brand-text-muted">
                            {new Date(sub.submittedAt || sub.createdAt || Date.now()).toLocaleDateString('fr-FR')} à {new Date(sub.submittedAt || sub.createdAt || Date.now()).toLocaleTimeString('fr-FR').slice(0, 5)}
                          </td>
                          <td className="p-4">
                            {hasQuizAnswers ? (
                              <button
                                onClick={() => setInspectSubmissionAnswers(sub)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-accent bg-brand-accent/15 hover:bg-brand-accent/25 px-2.5 py-1 rounded-lg transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Voir Réponses QCM
                              </button>
                            ) : (
                              <div className="space-y-1">
                                {sub.content && sub.content !== 'NON_RENDU' && (
                                  <p className="text-xs text-brand-text-muted line-clamp-2">{sub.content}</p>
                                )}
                                {sub.fileUrl && (
                                  <div>
                                    {(sub.fileUrl.endsWith('.mp3') || sub.fileUrl.endsWith('.wav') || sub.fileUrl.endsWith('.ogg') || sub.fileUrl.endsWith('.webm')) ? (
                                      <audio controls src={getFileUrl(sub.fileUrl)} className="h-7 w-44 mt-1" />
                                    ) : (
                                      <a
                                        href={getFileUrl(sub.fileUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-brand-accent hover:underline font-bold"
                                      >
                                        <Download className="w-3 h-3" /> Télécharger la copie
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {sub.grade ? (
                              <div>
                                <span className="font-black text-brand-accent text-base">{sub.grade.value}</span>
                                <span className="text-xs text-brand-text-muted">/20</span>
                                {sub.grade.comment && (
                                  <div className="text-xs text-brand-text-muted italic line-clamp-1">"{sub.grade.comment}"</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-brand-text-muted italic">Non noté</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGradeModal(sub)}
                              leftIcon={<Award className="w-4 h-4" />}
                              className="cursor-pointer"
                            >
                              {sub.grade ? 'Modifier Note' : 'Noter'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      <Modal
        isOpen={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        title={`Noter le travail — ${selectedSubmission?.student.firstName} ${selectedSubmission?.student.lastName}`}
      >
        <form onSubmit={handleSubmitGrade(onGradeWork)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-1.5">Note (/20)</label>
            <input
              type="number"
              step="0.5"
              max="20"
              min="0"
              {...registerGrade('value', { required: 'La note est requise', min: 0, max: 20 })}
              className="w-full p-3 bg-brand-sidebar border border-brand-border/70 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50 font-bold"
              placeholder="Ex: 16.5"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-1.5">Appréciation / Commentaire</label>
            <textarea
              {...registerGrade('comment')}
              rows={3}
              placeholder="Commentaire pour l'élève..."
              className="w-full p-3 bg-brand-sidebar border border-brand-border/70 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/40">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsGradeModalOpen(false)}
              className="cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="shadow-lg shadow-brand-accent/20 cursor-pointer"
            >
              Enregistrer la note
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inspect Student QCM Answers Modal */}
      {inspectSubmissionAnswers && (
        <Modal
          isOpen={!!inspectSubmissionAnswers}
          onClose={() => setInspectSubmissionAnswers(null)}
          title={`Réponses de ${inspectSubmissionAnswers.student.firstName} ${inspectSubmissionAnswers.student.lastName}`}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {assignment.questions && assignment.questions.length > 0 ? (
              assignment.questions.map((q, idx) => {
                let parsed: any = {};
                try {
                  parsed = JSON.parse(inspectSubmissionAnswers.content || '{}');
                } catch (e) {}
                const userAns = parsed[q.id];

                return (
                  <div key={q.id || idx} className="p-4 bg-brand-sidebar rounded-xl border border-brand-border/70 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-brand-accent">Question {idx + 1}</span>
                      <span className="text-brand-text-muted">{q.points} pt{q.points > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm font-semibold text-brand-text">{q.text}</p>
                    {q.imageUrl && (
                      <img
                        src={getFileUrl(q.imageUrl)}
                        alt={`Illustration Question ${idx + 1}`}
                        className="max-h-48 max-w-full rounded-xl border border-brand-border/60 object-contain my-2"
                      />
                    )}
                    
                    {q.options && q.options.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        {q.options.map(opt => {
                          const isSelected = Array.isArray(userAns) ? userAns.includes(opt.id) : userAns === opt.id;
                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
                                isSelected
                                  ? 'bg-brand-accent/20 border-brand-accent text-brand-text font-bold'
                                  : 'bg-brand-card/50 border-brand-border/40 text-brand-text-muted'
                              }`}
                            >
                              <span>{opt.text}</span>
                              {isSelected && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand-accent text-white">
                                  Choix élève
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-brand-card rounded-lg text-xs text-brand-text border border-brand-border/60">
                        {userAns || <span className="italic text-brand-text-muted">Aucune réponse rédigée.</span>}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-brand-text-muted italic">Aucun détail disponible.</p>
            )}

            <div className="flex justify-end pt-4 border-t border-brand-border/40">
              <Button
                variant="secondary"
                onClick={() => setInspectSubmissionAnswers(null)}
                className="cursor-pointer"
              >
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Publish Assignment Modal */}
      <Modal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title="Publier le devoir"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-text-muted">
            La publication d'un devoir va le rendre accessible et visible aux élèves concernés selon la portée choisie.
          </p>
          <div>
            <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">
              Portée de la publication
            </label>
            <select
              value={publishScope}
              onChange={(e) => setPublishScope(e.target.value)}
              className="w-full p-3 bg-brand-sidebar border border-brand-border/70 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50 text-sm font-semibold"
            >
              <option value="CLASSE">Classe Actuelle Uniquement</option>
              <option value="ECOLE">Toute l'École</option>
              <option value="NIVEAU">Tout le Niveau (National)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/40">
            <Button variant="secondary" onClick={() => setIsPublishModalOpen(false)} disabled={isPublishing}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handlePublishAssignment} isLoading={isPublishing}>
              Confirmer la publication
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAssignment}
        title="Supprimer le devoir"
        message="Êtes-vous sûr de vouloir supprimer définitivement ce devoir ? Toutes les soumissions et notes associées seront supprimées."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};

export default AssignmentDetails;
