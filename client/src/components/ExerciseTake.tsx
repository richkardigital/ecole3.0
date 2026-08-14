import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, BookOpen, Award } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: 'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE';
  points: number;
  options: Option[];
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  type: 'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE';
  isGraded: boolean;
  coefficient: number;
  timeLimit?: number;
  questions: Question[];
  submissions?: {
    id: string;
    score?: number;
    maxScore?: number;
    submittedAt: string;
    answers: {
      questionId: string;
      optionId?: string;
      textValue?: string;
      isCorrect?: boolean;
      question: { text: string; type: string; points: number };
      option?: { text: string; isCorrect: boolean };
    }[];
  }[];
}

interface ExerciseTakeProps {
  exerciseId: string;
  onClose?: () => void;
}

export default function ExerciseTake({ exerciseId, onClose }: ExerciseTakeProps) {
  const { success, error: toastError } = useToast();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, { optionId?: string; textValue?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    fetchExercise();
  }, [exerciseId]);

  // Timer
  useEffect(() => {
    if (exercise?.timeLimit && !submitted) {
      const seconds = exercise.timeLimit * 60;
      setTimeLeft(seconds);

      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            handleSubmit(); // Auto-submit
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [exercise?.timeLimit, submitted]);

  const fetchExercise = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/exercises/${exerciseId}`);
      const data = res.data;
      setExercise(data);

      // Check if already submitted
      if (data.submissions && data.submissions.length > 0) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Error fetching exercise', err);
      toastError('Erreur lors du chargement de l\'exercice');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, optionId?: string, textValue?: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { optionId, textValue }
    }));
  };

  const handleSubmit = async () => {
    if (!exercise) return;

    const answersList = exercise.questions.map(q => ({
      questionId: q.id,
      optionId: answers[q.id]?.optionId,
      textValue: answers[q.id]?.textValue,
    }));

    try {
      setIsSubmitting(true);
      await api.post(`/exercises/${exerciseId}/submit`, { answers: answersList });
      success('Exercice soumis avec succès !');
      fetchExercise(); // Reload with results
      setSubmitted(true);
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="p-6 text-center text-brand-text-muted">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Exercice introuvable.</p>
      </div>
    );
  }

  const mySubmission = exercise.submissions?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-brand-card p-6 rounded-xl border border-brand-border/50 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-brand-accent" />
            <h2 className="text-xl font-bold text-brand-text">{exercise.title}</h2>
          </div>
          {exercise.description && (
            <p className="text-sm text-brand-text-muted mt-1">{exercise.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2 py-1 rounded font-bold">
              {exercise.type === 'QCM' ? 'QCM' : exercise.type === 'VRAI_FAUX' ? 'Vrai / Faux' : 'Texte Libre'}
            </span>
            <span className="text-xs text-brand-text-muted">{exercise.questions.length} question(s)</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded font-bold">
              Exercice d'entraînement
            </span>
          </div>
        </div>

        {/* Timer */}
        {timeLeft !== null && !submitted && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-lg font-bold ${
            timeLeft < 60 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-brand-sidebar border-brand-border/50 text-brand-text'
          }`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Result if submitted */}
      {submitted && mySubmission && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-emerald-500" />
            <h3 className="text-lg font-bold text-brand-text">Résultats de votre soumission</h3>
          </div>
          {mySubmission.score !== null && mySubmission.score !== undefined ? (
            <div className="flex items-center gap-4">
              <div className="text-4xl font-black text-emerald-500">
                {mySubmission.score.toFixed(1)}
              </div>
              <div>
                <div className="text-brand-text-muted text-sm">/ {mySubmission.maxScore} points</div>
                <div className="text-brand-text-muted text-xs mt-1">
                  {((mySubmission.score / (mySubmission.maxScore || 1)) * 100).toFixed(0)}% de réussite
                </div>
              </div>
            </div>
          ) : (
            <p className="text-brand-text-muted text-sm italic">
              ⏳ Cet exercice sera corrigé manuellement par votre enseignant.
            </p>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {exercise.questions.map((q, idx) => {
          const myAnswer = submitted ? mySubmission?.answers.find(a => a.questionId === q.id) : null;

          return (
            <div key={q.id} className={`bg-brand-card rounded-xl border p-5 transition-all ${
              submitted && myAnswer
                ? myAnswer.isCorrect === true
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : myAnswer.isCorrect === false
                  ? 'border-red-500/40 bg-red-500/5'
                  : 'border-brand-border/50'
                : 'border-brand-border/50'
            }`}>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-xs font-bold text-brand-text-muted bg-brand-sidebar border border-brand-border/50 px-2 py-1 rounded-lg min-w-[30px] text-center mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-brand-text">{q.text}</p>
                  <span className="text-xs text-brand-text-muted mt-1 inline-block">{q.points} pt(s)</span>
                </div>
                {submitted && myAnswer && (
                  myAnswer.isCorrect === true
                    ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    : myAnswer.isCorrect === false
                    ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    : null
                )}
              </div>

              {/* Options QCM / Vrai-Faux */}
              {(q.type === 'QCM' || q.type === 'VRAI_FAUX') && (
                <div className="space-y-2 ml-10">
                  {q.options.map(opt => {
                    const isSelected = answers[q.id]?.optionId === opt.id || myAnswer?.optionId === opt.id;
                    const isCorrectOption = submitted && (opt as any).isCorrect;

                    return (
                      <button
                        key={opt.id}
                        disabled={submitted}
                        onClick={() => handleAnswer(q.id, opt.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          submitted
                            ? isCorrectOption
                              ? 'border-emerald-500/60 bg-emerald-500/10 text-brand-text'
                              : isSelected && !isCorrectOption
                              ? 'border-red-500/60 bg-red-500/10 text-brand-text'
                              : 'border-brand-border/50 text-brand-text-muted opacity-60'
                            : isSelected
                            ? 'border-brand-accent bg-brand-accent/10 text-brand-text'
                            : 'border-brand-border/50 hover:border-brand-accent/40 hover:bg-brand-sidebar text-brand-text'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            isSelected ? 'border-brand-accent' : 'border-brand-border'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-brand-accent" />}
                          </div>
                          <span className="text-sm">{opt.text}</span>
                          {submitted && isCorrectOption && (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Texte Libre */}
              {q.type === 'TEXTE_LIBRE' && (
                <div className="ml-10">
                  <textarea
                    value={submitted ? (myAnswer?.textValue || '') : (answers[q.id]?.textValue || '')}
                    onChange={e => handleAnswer(q.id, undefined, e.target.value)}
                    disabled={submitted}
                    rows={3}
                    className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-xl text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 resize-none disabled:opacity-60"
                    placeholder="Votre réponse..."
                  />
                  {submitted && (
                    <p className="text-xs text-brand-text-muted mt-1 italic">
                      ℹ️ Cette réponse sera corrigée manuellement par votre enseignant.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/30">
          {onClose && (
            <Button variant="secondary" onClick={onClose}>Fermer</Button>
          )}
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="min-w-[140px]"
          >
            Soumettre mes réponses
          </Button>
        </div>
      )}

      {submitted && onClose && (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Fermer</Button>
        </div>
      )}
    </div>
  );
}
