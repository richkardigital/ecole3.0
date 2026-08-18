import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api, { getFileUrl } from '@/lib/api';
import { getSubjectIllustration } from '@/lib/subjectIllustrations';
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  FileText, 
  Video, 
  ExternalLink, 
  Download, 
  User, 
  School, 
  GraduationCap, 
  Sparkles, 
  PlayCircle, 
  CheckCircle2, 
  Award,
  Layers,
  Network,
  Eye,
  X
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import ExerciseTake from '@/components/ExerciseTake';

interface CourseModel {
  id: string;
  subject: { id: string; name: string; imageUrl?: string | null };
  niveau?: { id: string; nom: string };
  academicYear?: { id: string; name: string };
  class?: { name: string; school?: { name: string } };
  teacher?: { firstName: string; lastName: string; avatarUrl?: string };
}

const SharedCourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseModel | null>(null);
  const [courseContent, setCourseContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exercise training state
  const [takingExerciseId, setTakingExerciseId] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isStudent = user?.role === 'APPRENANT';

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [resCourse, resContent] = await Promise.all([
        api.get(`/courses/${id}`),
        api.get(`/courses/${id}/content`)
      ]);
      setCourse(resCourse.data);
      setCourseContent(resContent.data);
    } catch (err: any) {
      console.error('Error fetching shared course details', err);
      setError("Erreur lors du chargement des détails du cours.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCourseData();
  }, [id]);

  const handlePreviewExercise = async (exerciseId: string) => {
    try {
      setPreviewLoading(true);
      const res = await api.get(`/exercises/${exerciseId}`);
      setPreviewExercise(res.data);
    } catch (err) {
      console.error('Error fetching exercise for preview', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const getIcon = (type: string) => {
    if (type === 'VIDEO' || type.toLowerCase().includes('video')) return <Video className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-brand-text-muted flex flex-col items-center gap-3">
        <BookOpen className="w-10 h-10 text-brand-accent animate-pulse" />
        <p className="text-sm font-bold">Chargement du cours et des exercices du réseau SEEEC...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center gap-4 bg-brand-card rounded-2xl border border-red-500/20">
        <p className="font-bold">{error || "Cours introuvable."}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-brand-sidebar border border-brand-border rounded-xl text-brand-text hover:bg-brand-border text-xs font-bold transition-all">
          Retour au réseau SEEEC
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 bg-brand-card border border-brand-border rounded-xl text-brand-text hover:bg-brand-sidebar transition-colors shadow-sm"
          title="Retour au Réseau"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title="Détails du cours & Exercices (Réseau SEEEC)"
          subtitle="Consultez les ressources officielles et entraînez-vous en autonomie sur les exercices partagés"
        />
      </div>

      {/* ── COURSE BANNER ── */}
      <div className="bg-brand-card border border-brand-border rounded-3xl overflow-hidden shadow-lg">
        <div className="h-56 relative overflow-hidden bg-slate-950">
          <img 
            src={getSubjectIllustration(course.subject.name, course.subject.imageUrl)}
            alt={course.subject.name}
            className="w-full h-full object-cover opacity-80"
          />
          {/* Deep gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30 pointer-events-none"></div>
          
          <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <GraduationCap className="w-4 h-4" />
                {course.niveau?.nom || course.class?.name || 'Niveau standard'}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg bg-black/60 text-white backdrop-blur-md border border-white/15">
                <Network className="w-3.5 h-3.5 text-emerald-400" />
                Réseau SEEEC • Écoles Connectées
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black drop-shadow-md text-white tracking-tight">
              {course.subject.name}
            </h1>
          </div>
        </div>

        {/* ── CONTENT SECTION ── */}
        <div className="p-6 md:p-8 space-y-8 bg-brand-card">
          {/* Student Help Banner */}
          {isStudent && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <Sparkles className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>
                <strong>Mode Entraînement :</strong> Cliquez sur <strong>« S'entraîner »</strong> pour tester vos connaissances sur chaque chapitre. Les exercices sont en auto-évaluation illimitée et ne comptent pas dans vos notes de classe.
              </span>
            </div>
          )}

          {/* Chapters & Exercises */}
          <div className="space-y-6">
            <h2 className="text-xl font-black text-brand-text flex items-center gap-2 border-b border-brand-border/60 pb-3">
              <BookOpen className="w-6 h-6 text-brand-accent" />
              Programme & Chapitres du Réseau ({courseContent?.chapters?.length || 0})
            </h2>

            {courseContent?.chapters?.length > 0 ? (
              <div className="space-y-6">
                {courseContent.chapters.map((chapter: any, idx: number) => {
                  const hasResources = chapter.resources?.length > 0;
                  const hasExercises = chapter.exercises?.length > 0;

                  return (
                    <div key={chapter.id} className="bg-brand-sidebar rounded-2xl p-5 md:p-6 border border-brand-border shadow-sm space-y-5">
                      {/* Chapter Title Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-accent text-white flex items-center justify-center text-sm font-black shadow-sm">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-base md:text-lg text-brand-text leading-snug">
                              {chapter.title}
                            </h3>
                            {chapter.description && (
                              <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">{chapter.description}</p>
                            )}
                          </div>
                        </div>

                        {chapter.term && (
                          <span className="self-start sm:self-auto px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand-card border border-brand-border text-brand-text">
                            {chapter.term.name}
                          </span>
                        )}
                      </div>

                      {/* 1. Chapter Exercises (Exercices d'Entraînement) */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Exercices d'entraînement ({chapter.exercises?.length || 0})
                        </h4>

                        {hasExercises ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {chapter.exercises.map((exercise: any) => {
                              const submission = exercise.submissions?.[0];
                              const hasSubmitted = !!submission;

                              return (
                                <div 
                                  key={exercise.id}
                                  className="p-4 rounded-xl bg-brand-card border border-brand-border hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 shadow-sm"
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20">
                                        {exercise.type === 'QCM' ? 'QCM Interactif' : exercise.type === 'VRAI_FAUX' ? 'Vrai / Faux' : 'Exercice Libre'}
                                      </span>
                                      <span className="text-[11px] font-bold text-brand-text-muted">
                                        {exercise._count?.questions || exercise.questions?.length || 0} question(s)
                                      </span>
                                    </div>

                                    <h5 className="font-bold text-sm text-brand-text line-clamp-2">
                                      {exercise.title}
                                    </h5>

                                    {exercise.description && (
                                      <p className="text-xs text-brand-text-muted line-clamp-1 mt-0.5">{exercise.description}</p>
                                    )}

                                    {exercise.createdBy && (
                                      <p className="text-[10px] font-semibold text-brand-text-muted mt-2">
                                        Partagé par : Prof. {exercise.createdBy.firstName} {exercise.createdBy.lastName}
                                      </p>
                                    )}
                                  </div>

                                  {/* Footer / Action */}
                                  <div className="pt-2 border-t border-brand-border/50 flex items-center justify-between">
                                    {hasSubmitted ? (
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        <Award className="w-4 h-4" />
                                        <span>Score : {submission.score}/{submission.maxScore}</span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-brand-text-muted font-medium">Non encore réalisé</span>
                                    )}

                                    {isStudent ? (
                                      <button
                                        onClick={() => navigate(`/exercises/${exercise.id}`, { state: { courseId: id } })}
                                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                        {hasSubmitted ? 'Refaire' : "S'entraîner"}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handlePreviewExercise(exercise.id)}
                                        className="px-3 py-1.5 rounded-lg bg-brand-sidebar hover:bg-brand-border text-brand-text border border-brand-border text-xs font-bold flex items-center gap-1.5 transition-all"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        Aperçu (Prof)
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-brand-text-muted italic bg-brand-card/50 p-3 rounded-xl border border-dashed border-brand-border">
                            Aucun exercice interactif partagé pour ce chapitre pour l'instant.
                          </p>
                        )}
                      </div>

                      {/* 2. Chapter Resources (Documents & Vidéos) */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          Supports & Documents pédagogiques ({chapter.resources?.length || 0})
                        </h4>

                        {hasResources ? (
                          <ul className="space-y-2">
                            {chapter.resources.map((res: any) => (
                              <li 
                                key={res.id} 
                                className="flex items-center justify-between p-3 rounded-xl bg-brand-card border border-brand-border hover:border-brand-accent/30 transition-colors shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-brand-sidebar rounded-lg border border-brand-border">
                                    {getIcon(res.type)}
                                  </div>
                                  <div>
                                    <span className="text-brand-text font-bold text-xs block">{res.title}</span>
                                    <span className="text-[10px] text-brand-text-muted flex items-center gap-1 mt-0.5 font-medium">
                                      <Clock className="w-3 h-3" />
                                      {new Date(res.createdAt).toLocaleDateString('fr-FR')}
                                    </span>
                                  </div>
                                </div>

                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-accent hover:bg-brand-accent hover:text-white transition-colors flex items-center gap-1.5 bg-brand-accent/10 px-3 py-1.5 rounded-lg border border-brand-accent/20 text-xs font-bold"
                                >
                                  {res.type === 'VIDEO' ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                  <span>{res.type === 'VIDEO' ? 'Visionner' : 'Télécharger'}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-brand-text-muted italic bg-brand-card/50 p-3 rounded-xl border border-dashed border-brand-border">
                            Aucun document ou vidéo déposé pour ce chapitre.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-brand-border rounded-2xl bg-brand-sidebar">
                <BookOpen className="w-10 h-10 text-brand-text-muted mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold text-brand-text-muted">Aucun chapitre n'a encore été publié pour ce cours.</p>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* ── MODAL : APERÇU CONSULTATION ENSEIGNANT / DIRECTEUR ── */}
      {previewExercise && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-card border border-brand-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-brand-sidebar text-brand-accent text-xs font-bold border border-brand-border">
                  Mode Consultation Professeur
                </span>
                <h3 className="text-lg font-bold text-brand-text mt-1">{previewExercise.title}</h3>
              </div>
              <button 
                onClick={() => setPreviewExercise(null)}
                className="p-1.5 rounded-lg bg-brand-sidebar hover:bg-brand-border text-brand-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {previewExercise.description && (
              <p className="text-xs text-brand-text-muted">{previewExercise.description}</p>
            )}

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                Questions ({previewExercise.questions?.length || 0})
              </h4>
              {previewExercise.questions?.map((q: any, qIdx: number) => (
                <div key={q.id || qIdx} className="p-4 rounded-xl bg-brand-sidebar border border-brand-border space-y-2 text-xs">
                  <div className="font-bold text-brand-text">
                    Question {qIdx + 1} : {q.text} ({q.points} pt)
                  </div>
                  {q.imageUrl && (
                    <img
                      src={getFileUrl(q.imageUrl)}
                      alt={`Illustration Q${qIdx + 1}`}
                      className="max-h-48 max-w-full rounded-lg border border-brand-border object-contain my-1.5"
                    />
                  )}
                  {q.options?.length > 0 && (
                    <div className="space-y-1.5 pl-3">
                      {q.options.map((opt: any) => (
                        <div 
                          key={opt.id} 
                          className={`p-2 rounded-lg border flex items-center justify-between ${
                            opt.isCorrect 
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold' 
                              : 'bg-brand-card border-brand-border text-brand-text'
                          }`}
                        >
                          <span>• {opt.text}</span>
                          {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.correctAnswer && (
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold mt-1">
                      Réponse attendue : {q.correctAnswer}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-brand-border flex justify-end">
              <button
                onClick={() => setPreviewExercise(null)}
                className="px-4 py-2 rounded-xl bg-brand-sidebar hover:bg-brand-border text-brand-text text-xs font-bold"
              >
                Fermer l'aperçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedCourseDetails;
