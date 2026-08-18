import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Award, 
  RotateCcw, 
  Layers, 
  Sparkles, 
  HelpCircle,
  Eye,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

interface Option {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  text: string;
  type: 'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE';
  points: number;
  imageUrl?: string;
  options: Option[];
  correctAnswer?: string;
}

interface ExerciseSubmission {
  id: string;
  score?: number | null;
  maxScore?: number;
  submittedAt: string;
  answers: {
    questionId: string;
    optionId?: string | null;
    textValue?: string | null;
    isCorrect?: boolean | null;
    question?: { text: string; type: string; points: number };
    option?: { text: string; isCorrect: boolean };
  }[];
}

interface ChapterCourseInfo {
  id: string;
  title: string;
  courseId: string;
  course?: {
    id: string;
    title?: string;
    subject?: { id: string; name: string; code?: string };
    niveau?: { id: string; name?: string; nom?: string };
    class?: { id: string; name: string };
  };
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  type: 'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE';
  isGraded: boolean;
  coefficient: number;
  timeLimit?: number | null;
  chapter?: ChapterCourseInfo;
  questions: Question[];
  submissions?: ExerciseSubmission[];
}

export default function TakeExercisePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: toastError } = useToast();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, { optionId?: string; textValue?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmittedView, setIsSubmittedView] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Load Exercise Details
  const fetchExercise = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/exercises/${id}`);
      const data = res.data;
      setExercise(data);

      const hasSubmission = data.submissions && data.submissions.length > 0;
      if (hasSubmission) {
        setIsSubmittedView(true);
        // Preload answers if already submitted
        const sub = data.submissions[0];
        const initialAnswers: Record<string, { optionId?: string; textValue?: string }> = {};
        sub.answers?.forEach((a: any) => {
          initialAnswers[a.questionId] = {
            optionId: a.optionId || undefined,
            textValue: a.textValue || undefined
          };
        });
        setAnswers(initialAnswers);
      } else {
        setIsSubmittedView(false);
      }
    } catch (err: any) {
      console.error('Error fetching exercise:', err);
      toastError(err.response?.data?.message || "Impossible de charger l'exercice.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercise();
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (exercise?.timeLimit && !isSubmittedView) {
      const totalSeconds = exercise.timeLimit * 60;
      setTimeLeft(totalSeconds);

      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            // Auto submit when time runs out
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [exercise?.timeLimit, isSubmittedView]);

  const handleAutoSubmit = async () => {
    if (isSubmittedView) return;
    toastError("Temps écoulé ! Vos réponses ont été envoyées automatiquement.");
    await executeSubmission();
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isSubmittedView) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], optionId }
    }));
  };

  const handleTextAnswer = (questionId: string, textValue: string) => {
    if (isSubmittedView) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], textValue }
    }));
  };

  const executeSubmission = async () => {
    if (!exercise || !id) return;
    const answersList = exercise.questions.map(q => ({
      questionId: q.id,
      optionId: answers[q.id]?.optionId,
      textValue: answers[q.id]?.textValue,
    }));

    try {
      setIsSubmitting(true);
      await api.post(`/exercises/${id}/submit`, { answers: answersList });
      success("Exercice validé avec succès !");
      setShowConfirmModal(false);
      await fetchExercise();
    } catch (err: any) {
      console.error("Submission error:", err);
      toastError(err.response?.data?.message || "Erreur lors de la validation des réponses.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setShowRetryModal(false);
    setIsSubmittedView(false);
    setAnswers({});
    if (exercise?.timeLimit) {
      setTimeLeft(exercise.timeLimit * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleGoBack = () => {
    const courseId = (location.state as any)?.courseId || exercise?.chapter?.courseId || exercise?.chapter?.course?.id;
    if (courseId) {
      navigate(`/courses/${courseId}`);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-brand-text-muted animate-pulse">Chargement de votre exercice...</p>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-brand-card rounded-2xl border border-brand-border/60 text-center shadow-lg">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-brand-text mb-2">Exercice introuvable</h2>
        <p className="text-sm text-brand-text-muted mb-6">Cet exercice n'existe pas ou n'est plus accessible.</p>
        <Button variant="primary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Retour
        </Button>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k]?.optionId || answers[k]?.textValue?.trim()).length;
  const totalQuestions = exercise.questions?.length || 0;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const latestSubmission = exercise.submissions?.[0];
  const score = latestSubmission?.score;
  const maxScore = latestSubmission?.maxScore || totalQuestions;
  const scorePercent = maxScore > 0 && score !== null && score !== undefined ? Math.round((score / maxScore) * 100) : null;

  return (
    <div className="min-h-screen bg-brand-bg pb-24 text-brand-text">
      {/* Top Header / Breadcrumb */}
      <div className="bg-brand-card border-b border-brand-border/70 sticky top-0 z-30 shadow-xs backdrop-blur-md bg-opacity-95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="p-2 rounded-xl bg-brand-sidebar hover:bg-brand-border text-brand-text-muted hover:text-brand-text border border-brand-border transition cursor-pointer shrink-0"
                title="Retour au cours"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-text-muted mb-0.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{exercise.chapter?.course?.subject?.name || exercise.chapter?.course?.title || exercise.chapter?.title || 'Cours'}</span>
                  {exercise.chapter?.title && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{exercise.chapter.title}</span>
                    </>
                  )}
                </div>
                <h1 className="text-lg sm:text-xl font-black text-[#4D3E90] flex items-center gap-2 truncate">
                  {exercise.title}
                </h1>
              </div>
            </div>

            {/* Badges & Timer */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {exercise.type === 'QCM' ? 'QCM' : exercise.type === 'VRAI_FAUX' ? 'Vrai / Faux' : 'Texte Libre'}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-brand-sidebar text-brand-text-muted border border-brand-border">
                  {totalQuestions} question{totalQuestions > 1 ? 's' : ''}
                </span>
              </div>

              {/* Countdown Timer */}
              {timeLeft !== null && !isSubmittedView && (
                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono text-sm font-bold shadow-xs transition-all ${
                  timeLeft < 60 
                    ? 'bg-red-500/15 border-red-500/40 text-red-500 animate-pulse' 
                    : 'bg-brand-sidebar border-brand-border text-brand-text'
                }`}>
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar (During taking) */}
          {!isSubmittedView && totalQuestions > 0 && (
            <div className="mt-4 pt-3 border-t border-brand-border/40 flex items-center gap-4">
              <div className="flex-1 bg-brand-sidebar h-2 rounded-full overflow-hidden border border-brand-border/50">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-brand-text-muted shrink-0">
                {answeredCount} / {totalQuestions} répondu{totalQuestions > 1 ? 's' : ''} ({progressPercent}%)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Description Banner if exists */}
        {exercise.description && !isSubmittedView && (
          <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/70 flex items-start gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="text-sm text-brand-text-muted leading-relaxed">
              <p className="font-bold text-brand-text mb-1">Consignes de l'exercice :</p>
              <p>{exercise.description}</p>
            </div>
          </div>
        )}

        {/* ── SUBMISSION RESULT HERO CARD ── */}
        {isSubmittedView && latestSubmission && (
          <div className="bg-gradient-to-br from-brand-card via-brand-card to-emerald-500/5 p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Award className="w-40 h-40 text-emerald-500" />
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-inner shrink-0">
                <Award className="w-10 h-10" />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Exercice complété
                </div>
                <h2 className="text-2xl font-black text-brand-text">Résultats de votre exercice</h2>
                
                {score !== null && score !== undefined ? (
                  <div className="flex flex-wrap items-baseline gap-3 pt-2">
                    <span className="text-5xl font-black text-emerald-500 tracking-tight">
                      {score.toFixed(1)}
                    </span>
                    <span className="text-xl font-bold text-brand-text-muted">
                      / {maxScore} points
                    </span>
                    {scorePercent !== null && (
                      <span className={`text-sm font-extrabold px-3 py-1 rounded-xl border ${
                        scorePercent >= 80 
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500' 
                          : scorePercent >= 50 
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-500' 
                          : 'bg-red-500/15 border-red-500/30 text-red-500'
                      }`}>
                        {scorePercent}% de réussite
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-brand-text-muted italic pt-1">
                    ⏳ Vos réponses ouvertes sont en attente d'évaluation pédagogique.
                  </p>
                )}

                <p className="text-xs text-brand-text-muted">
                  Soumis le {new Date(latestSubmission.submittedAt).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>

              <div className="flex flex-col gap-2.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                <Button
                  variant="primary"
                  onClick={() => setShowRetryModal(true)}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  className="w-full justify-center !bg-emerald-600 hover:!bg-emerald-700 font-bold"
                >
                  Refaire pour s'entraîner
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleGoBack}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  Retour au cours
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── QUESTIONS LIST ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              {isSubmittedView ? 'Correction détaillée des questions' : 'Questions à résoudre'}
            </h3>
            {isSubmittedView && (
              <span className="text-xs font-semibold text-brand-text-muted">
                Passez en revue les réponses et explications ci-dessous
              </span>
            )}
          </div>

          {exercise.questions.map((q, idx) => {
            const mySubmissionAnswer = isSubmittedView 
              ? latestSubmission?.answers?.find(a => a.questionId === q.id) 
              : null;
            const isCorrect = mySubmissionAnswer?.isCorrect;

            return (
              <div 
                key={q.id}
                className={`bg-brand-card rounded-2xl border transition-all shadow-sm overflow-hidden ${
                  isSubmittedView
                    ? isCorrect === true
                      ? 'border-emerald-500/50 bg-emerald-500/[0.02]'
                      : isCorrect === false
                      ? 'border-red-500/50 bg-red-500/[0.02]'
                      : 'border-brand-border/70'
                    : 'border-brand-border/70 hover:border-emerald-500/40'
                }`}
              >
                {/* Question Header */}
                <div className="p-5 sm:p-6 border-b border-brand-border/40 flex items-start gap-4">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    isSubmittedView
                      ? isCorrect === true
                        ? 'bg-emerald-500 text-white'
                        : isCorrect === false
                        ? 'bg-red-500 text-white'
                        : 'bg-brand-sidebar text-brand-text border border-brand-border'
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {idx + 1}
                  </span>

                  <div className="flex-1 space-y-2.5">
                    <p className="text-base font-bold text-brand-text leading-snug">
                      {q.text}
                    </p>

                    {/* Question Illustration Image */}
                    {q.imageUrl && (
                      <div className="mt-2.5">
                        <div
                          onClick={() =>
                            setZoomedImage(
                              q.imageUrl?.startsWith('http') || q.imageUrl?.startsWith('/uploads')
                                ? q.imageUrl
                                : `/uploads/${q.imageUrl}`
                            )
                          }
                          className="cursor-pointer inline-block group/img relative rounded-xl overflow-hidden border border-brand-border/80 bg-brand-surface hover:border-brand-accent transition shadow-sm"
                          title="Cliquer pour agrandir l'image"
                        >
                          <img
                            src={
                              q.imageUrl.startsWith('http') || q.imageUrl.startsWith('/uploads')
                                ? q.imageUrl
                                : `/uploads/${q.imageUrl}`
                            }
                            alt={`Illustration Question ${idx + 1}`}
                            className="max-h-60 max-w-full sm:max-w-md object-contain rounded-xl transition-transform duration-300 group-hover/img:scale-[1.02]"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('localhost:5000') && !target.src.startsWith('http')) {
                                target.src = `http://localhost:5000${q.imageUrl}`;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[1px]">
                            <Eye className="w-4 h-4" /> Agrandir l'image
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-brand-text-muted pt-1">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {q.points} point{q.points > 1 ? 's' : ''}
                      </span>
                      <span>•</span>
                      <span>{q.type === 'QCM' ? 'Choix unique' : q.type === 'VRAI_FAUX' ? 'Vrai ou Faux' : 'Réponse rédigée'}</span>
                    </div>
                  </div>

                  {/* Submission Status Icon */}
                  {isSubmittedView && (
                    <div className="shrink-0 pt-0.5">
                      {isCorrect === true ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                          <CheckCircle className="w-4 h-4" />
                          <span>Correct</span>
                        </div>
                      ) : isCorrect === false ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/30">
                          <AlertCircle className="w-4 h-4" />
                          <span>Incorrect</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                          À corriger
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Options / Answer Input Body */}
                <div className="p-5 sm:p-6 bg-brand-sidebar/40 space-y-3">
                  {(q.type === 'QCM' || q.type === 'VRAI_FAUX') && (
                    <div className="grid grid-cols-1 gap-2.5">
                      {q.options?.map(opt => {
                        const isSelected = answers[q.id]?.optionId === opt.id || mySubmissionAnswer?.optionId === opt.id;
                        const isRealCorrect = isSubmittedView && (opt as any).isCorrect === true;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isSubmittedView}
                            onClick={() => handleSelectOption(q.id, opt.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                              isSubmittedView
                                ? isRealCorrect
                                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 font-bold shadow-xs'
                                  : isSelected && !isRealCorrect
                                  ? 'border-red-500 bg-red-500/15 text-red-950 dark:text-red-100 line-through opacity-80'
                                  : 'border-brand-border/50 text-brand-text-muted opacity-50'
                                : isSelected
                                ? 'border-emerald-500 bg-emerald-500/10 text-brand-text font-bold ring-2 ring-emerald-500/20 shadow-xs'
                                : 'border-brand-border/70 hover:border-emerald-500/40 hover:bg-brand-card text-brand-text'
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                isSubmittedView
                                  ? isRealCorrect
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : isSelected
                                    ? 'border-red-500 bg-red-500 text-white'
                                    : 'border-brand-border'
                                  : isSelected
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-brand-border group-hover:border-emerald-500'
                              }`}>
                                {(isSelected || isRealCorrect) && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                              <span className="text-sm font-medium">{opt.text}</span>
                            </div>

                            {isSubmittedView && isRealCorrect && (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md shrink-0">
                                Bonne réponse
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Free text answer */}
                  {q.type === 'TEXTE_LIBRE' && (
                    <div className="space-y-2">
                      <textarea
                        value={isSubmittedView ? (mySubmissionAnswer?.textValue || '') : (answers[q.id]?.textValue || '')}
                        onChange={e => handleTextAnswer(q.id, e.target.value)}
                        disabled={isSubmittedView}
                        rows={4}
                        placeholder="Rédigez votre réponse détaillée ici..."
                        className="w-full p-4 bg-brand-card border border-brand-border/70 rounded-xl text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none disabled:opacity-75"
                      />
                      {isSubmittedView && q.correctAnswer && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-brand-text space-y-1">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">Élément de réponse attendu :</p>
                          <p className="text-brand-text-muted">{q.correctAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── BOTTOM ACTION BAR (During taking) ── */}
        {!isSubmittedView && (
          <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/70 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg sticky bottom-6 z-20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-text">
                  {answeredCount === totalQuestions 
                    ? "Toutes les questions ont été renseignées !" 
                    : `Il vous reste ${totalQuestions - answeredCount} question(s) non répondue(s)`}
                </p>
                <p className="text-xs text-brand-text-muted">
                  Prenez le temps de relire vos réponses avant de soumettre.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="secondary"
                onClick={handleGoBack}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={() => setShowConfirmModal(true)}
                isLoading={isSubmitting}
                className="w-full sm:w-auto min-w-[160px] !bg-emerald-600 hover:!bg-emerald-700 font-bold"
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Valider mes réponses
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal before Submit */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeSubmission}
        title="Confirmer l'envoi de l'exercice"
        message={
          answeredCount < totalQuestions
            ? `Attention : Vous n'avez répondu qu'à ${answeredCount} question(s) sur ${totalQuestions}. Souhaitez-vous quand même envoyer vos réponses ?`
            : "Êtes-vous certain de vouloir soumettre vos réponses pour correction ?"
        }
        confirmText={isSubmitting ? "Envoi en cours..." : "Confirmer et Envoyer"}
        variant="primary"
      />

      {/* Confirmation Modal to Retry */}
      <ConfirmationModal
        isOpen={showRetryModal}
        onClose={() => setShowRetryModal(false)}
        onConfirm={handleRetry}
        title="Refaire cet exercice"
        message="Voulez-vous réinitialiser vos réponses pour vous réentraîner ? Votre nouveau score sera enregistré."
        confirmText="Oui, recommencer"
        variant="primary"
      />

      {/* Zoomed Question Image Lightbox Modal */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-brand-card p-3 rounded-2xl border border-brand-border shadow-2xl flex flex-col items-center"
          >
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white transition z-10 cursor-pointer"
              title="Fermer l'image"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Schéma agrandi"
              className="max-w-full max-h-[82vh] object-contain rounded-xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('localhost:5000') && !target.src.startsWith('http')) {
                  target.src = `http://localhost:5000${zoomedImage}`;
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
