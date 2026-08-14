import { useState } from 'react';
import { Plus, Trash2, CheckCircle, X } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface ExerciseOption {
  text: string;
  isCorrect: boolean;
}

interface ExerciseQuestion {
  text: string;
  type: 'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE';
  points: number;
  correctAnswer?: string;
  options: ExerciseOption[];
}

interface ExerciseEditorProps {
  chapterId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const defaultOption = (): ExerciseOption => ({ text: '', isCorrect: false });

const defaultQuestion = (type: 'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE'): ExerciseQuestion => {
  if (type === 'VRAI_FAUX') {
    return { text: '', type, points: 1, options: [{ text: 'Vrai', isCorrect: true }, { text: 'Faux', isCorrect: false }] };
  }
  return { text: '', type, points: 1, options: type === 'QCM' ? [defaultOption(), defaultOption()] : [] };
};

export default function ExerciseEditor({ chapterId, isOpen, onClose, onSuccess }: ExerciseEditorProps) {
  const { success, error: toastError } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE'>('QCM');
  const [isGraded, setIsGraded] = useState(false);
  const [coefficient, setCoefficient] = useState(1);
  const [timeLimit, setTimeLimit] = useState<number | ''>('');
  const [questions, setQuestions] = useState<ExerciseQuestion[]>([defaultQuestion('QCM')]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (newType: 'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE') => {
    setType(newType);
    setQuestions([defaultQuestion(newType)]);
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, defaultQuestion(type)]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof ExerciseQuestion, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const addOption = (qIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, defaultOption()] } : q));
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q
    ));
  };

  const updateOption = (qIdx: number, oIdx: number, field: 'text' | 'isCorrect', value: any) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const options = q.options.map((o, j) => {
        if (j !== oIdx) return o;
        return { ...o, [field]: value };
      });
      // For QCM: allow multiple correct, for VRAI_FAUX: only one correct
      if (field === 'isCorrect' && type === 'VRAI_FAUX' && value === true) {
        return { ...q, options: options.map((o, j) => ({ ...o, isCorrect: j === oIdx })) };
      }
      return { ...q, options };
    }));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    if (questions.length === 0) { setError('Ajoutez au moins une question.'); return; }
    for (const q of questions) {
      if (!q.text.trim()) { setError('Toutes les questions doivent avoir un texte.'); return; }
      if ((type === 'QCM' || type === 'VRAI_FAUX') && q.options.length < 2) {
        setError('Chaque question QCM/Vrai-Faux doit avoir au moins 2 options.'); return;
      }
      if ((type === 'QCM' || type === 'VRAI_FAUX') && !q.options.some(o => o.isCorrect)) {
        setError('Chaque question doit avoir au moins une bonne réponse cochée.'); return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.post(`/chapters/${chapterId}/exercises`, {
        title, description, type, isGraded, coefficient, timeLimit: timeLimit || null, questions
      });
      success('Exercice créé avec succès !');
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création de l\'exercice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle(''); setDescription(''); setType('QCM'); setIsGraded(false);
    setCoefficient(1); setTimeLimit(''); setQuestions([defaultQuestion('QCM')]); setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Créer un Exercice" size="lg">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Infos générales */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-brand-text mb-1">Titre de l'exercice *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              placeholder="Ex: Exercice sur les fractions"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brand-text mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50 resize-none"
              placeholder="Instructions pour les élèves..."
            />
          </div>
        </div>

        {/* Type et options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-brand-text mb-1">Type d'exercice</label>
            <select
              value={type}
              onChange={e => handleTypeChange(e.target.value as any)}
              className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            >
              <option value="QCM">QCM (Choix Multiple)</option>
              <option value="VRAI_FAUX">Vrai / Faux</option>
              <option value="TEXTE_LIBRE">Texte Libre (Correction manuelle)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-brand-text mb-1">Limite de temps (min, optionnel)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={e => setTimeLimit(e.target.value ? parseInt(e.target.value) : '')}
              min={1}
              className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              placeholder="Sans limite"
            />
          </div>
          <div className="col-span-2 p-3 bg-brand-accent/10 border border-brand-accent/30 rounded-xl flex items-center justify-between text-xs text-brand-text">
            <span className="font-semibold text-brand-accent flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Exercice d'entraînement pédagogique (Non noté)
            </span>
            <span className="text-brand-text-muted">Évaluation formative et auto-correction</span>
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-brand-text">Questions</h3>
            <button
              onClick={addQuestion}
              className="flex items-center gap-1 text-sm text-brand-accent hover:bg-brand-accent/10 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Ajouter une question
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-brand-sidebar p-4 rounded-xl border border-brand-border/50">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xs font-bold text-brand-text-muted bg-brand-card border border-brand-border/50 px-2 py-1 rounded-lg min-w-[30px] text-center mt-1">
                    {qIdx + 1}
                  </span>
                  <div className="flex-1">
                    <textarea
                      value={q.text}
                      onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                      className="w-full p-2.5 bg-brand-card border border-brand-border/50 rounded-lg text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent/50 resize-none"
                      rows={2}
                      placeholder="Texte de la question..."
                    />
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-brand-text-muted">Points:</span>
                      <input
                        type="number"
                        value={q.points}
                        onChange={e => updateQuestion(qIdx, 'points', parseFloat(e.target.value) || 1)}
                        min={0.5}
                        step={0.5}
                        className="w-16 p-1 bg-brand-card border border-brand-border/50 rounded text-brand-text text-xs text-center"
                      />
                    </div>
                  </div>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(qIdx)} className="text-red-400 hover:text-red-600 p-1 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Options QCM / Vrai-Faux */}
                {(type === 'QCM' || type === 'VRAI_FAUX') && (
                  <div className="ml-10 space-y-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          onClick={() => updateOption(qIdx, oIdx, 'isCorrect', !opt.isCorrect)}
                          className={`p-1 rounded-full transition ${opt.isCorrect ? 'text-emerald-500' : 'text-brand-border hover:text-brand-text-muted'}`}
                          title="Marquer comme bonne réponse"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <input
                          value={opt.text}
                          onChange={e => updateOption(qIdx, oIdx, 'text', e.target.value)}
                          className={`flex-1 p-2 bg-brand-card border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent/50 ${opt.isCorrect ? 'border-emerald-500/50' : 'border-brand-border/50'}`}
                          placeholder={`Option ${oIdx + 1}`}
                          disabled={type === 'VRAI_FAUX'}
                        />
                        {type === 'QCM' && q.options.length > 2 && (
                          <button onClick={() => removeOption(qIdx, oIdx)} className="text-red-400 hover:text-red-600 p-1 transition">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {type === 'QCM' && (
                      <button
                        onClick={() => addOption(qIdx)}
                        className="text-xs text-brand-accent hover:underline flex items-center gap-1 ml-6 mt-1"
                      >
                        <Plus className="w-3 h-3" /> Ajouter une option
                      </button>
                    )}
                  </div>
                )}

                {/* Réponse attendue (TEXTE_LIBRE) */}
                {type === 'TEXTE_LIBRE' && (
                  <div className="ml-10">
                    <label className="block text-xs text-brand-text-muted mb-1">Réponse attendue (optionnel, pour référence)</label>
                    <textarea
                      value={q.correctAnswer || ''}
                      onChange={e => updateQuestion(qIdx, 'correctAnswer', e.target.value)}
                      rows={2}
                      className="w-full p-2.5 bg-brand-card border border-brand-border/50 rounded-lg text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent/50 resize-none"
                      placeholder="Réponse modèle..."
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/30">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            Créer l'exercice
          </Button>
        </div>
      </div>
    </Modal>
  );
}
