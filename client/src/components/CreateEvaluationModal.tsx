import React, { useState } from 'react';
import { 
  FileText, 
  HelpCircle, 
  Calendar, 
  Clock, 
  Upload, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  Paperclip,
  CheckSquare,
  Square,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  id: string;
  text: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'OPEN';
  points: number;
  expectedAnswer?: string;
  imageFile?: File | null;
  imagePreview?: string | null;
  options: QuestionOption[];
}

interface CreateEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseSubject?: string;
  courseNiveau?: string;
  defaultCoefficient?: number;
  availableTerms: { id: string; name: string }[];
  onSuccess: () => void;
}

export const CreateEvaluationModal: React.FC<CreateEvaluationModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseSubject,
  courseNiveau,
  defaultCoefficient = 1,
  availableTerms,
  onSuccess,
}) => {
  // Mode: Document (File) vs Interactive Questionnaire
  const [evaluationFormat, setEvaluationFormat] = useState<'DOCUMENT' | 'QUESTIONNAIRE'>('DOCUMENT');

  // Form Basic Info
  const [evalType, setEvalType] = useState<string>('COMPOSITION_NIVEAU');
  const [title, setTitle] = useState<string>('');
  const [termId, setTermId] = useState<string>(availableTerms[0]?.id || 'TRIMESTRE_1');
  const [coefficient, setCoefficient] = useState<number>(defaultCoefficient || 1);
  const [points, setPoints] = useState<number>(20);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [timeLimit, setTimeLimit] = useState<number | ''>(60);
  const [affecterAgenda, setAffecterAgenda] = useState<boolean>(true);
  const [description, setDescription] = useState<string>('');

  // Mode Document Files
  const [subjectFile, setSubjectFile] = useState<File | null>(null);
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [voiceNoteFile, setVoiceNoteFile] = useState<File | null>(null);

  // Mode Questionnaire Questions
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      id: 'q-1',
      text: '',
      type: 'SINGLE_CHOICE',
      points: 2,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ]
    }
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Helpers for Questions
  const addQuestion = () => {
    const newQ: QuestionDraft = {
      id: `q-${Date.now()}`,
      text: '',
      type: 'SINGLE_CHOICE',
      points: 2,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ]
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestionText = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].text = text;
    setQuestions(updated);
  };

  const updateQuestionPoints = (index: number, points: number) => {
    const updated = [...questions];
    updated[index].points = Math.max(1, points);
    setQuestions(updated);
  };

  const updateQuestionType = (index: number, type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'OPEN') => {
    const updated = [...questions];
    updated[index].type = type;
    setQuestions(updated);
  };

  const handleQuestionImageUpload = (index: number, file: File | null) => {
    const updated = [...questions];
    if (file) {
      updated[index].imageFile = file;
      updated[index].imagePreview = URL.createObjectURL(file);
    } else {
      updated[index].imageFile = null;
      updated[index].imagePreview = null;
    }
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push({ text: '', isCorrect: false });
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return;
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== optIndex);
    setQuestions(updated);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].text = text;
    setQuestions(updated);
  };

  const toggleOptionCorrect = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    const q = updated[qIndex];
    if (q.type === 'SINGLE_CHOICE') {
      q.options.forEach((opt, i) => {
        opt.isCorrect = i === optIndex;
      });
    } else {
      q.options[optIndex].isCorrect = !q.options[optIndex].isCorrect;
    }
    setQuestions(updated);
  };

  const totalCalculatedPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Veuillez saisir un titre pour l'évaluation.");
      return;
    }

    if (!dueDate) {
      setFormError("Veuillez définir une date limite.");
      return;
    }

    if (evaluationFormat === 'DOCUMENT' && !subjectFile && !description.trim()) {
      setFormError("Veuillez joindre le fichier du sujet ou rédiger des consignes détaillées.");
      return;
    }

    if (evaluationFormat === 'QUESTIONNAIRE') {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text.trim()) {
          setFormError(`La question n°${i + 1} n'a pas d'énoncé.`);
          return;
        }
        if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') {
          const hasEmptyOpt = q.options.some(o => !o.text.trim());
          if (hasEmptyOpt) {
            setFormError(`Toutes les options de la question n°${i + 1} doivent être renseignées.`);
            return;
          }
          const hasCorrect = q.options.some(o => o.isCorrect);
          if (!hasCorrect) {
            setFormError(`Veuillez indiquer au moins une bonne réponse pour la question n°${i + 1}.`);
            return;
          }
        }
      }
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('title', title);
      formData.append('type', evalType);
      formData.append('courseId', courseId);
      formData.append('termId', termId);
      formData.append('coefficient', String(coefficient));
      formData.append('points', String(evaluationFormat === 'QUESTIONNAIRE' ? totalCalculatedPoints : points));
      formData.append('startDate', startDate ? new Date(startDate).toISOString() : new Date().toISOString());
      formData.append('dueDate', new Date(dueDate).toISOString());
      if (timeLimit) {
        formData.append('timeLimit', String(timeLimit));
      }
      formData.append('description', description);
      formData.append('syncCalendar', String(affecterAgenda));
      formData.append('published', String(affecterAgenda));
      formData.append('autoGrade', String(evaluationFormat === 'QUESTIONNAIRE'));

      // Attachments for Document Mode
      if (evaluationFormat === 'DOCUMENT') {
        if (subjectFile) {
          formData.append('file', subjectFile);
        }
        if (correctionFile) {
          formData.append('correction', correctionFile);
        }
        if (voiceNoteFile) {
          formData.append('voiceNote', voiceNoteFile);
        }
      } else {
        // Interactive Questionnaire Mode
        const serializableQuestions = questions.map((q, index) => {
          return {
            text: q.text,
            type: q.type,
            points: q.points,
            expectedAnswer: q.expectedAnswer,
            options: q.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect
            }))
          };
        });

        formData.append('questions', JSON.stringify(serializableQuestions));

        // Append images with matching fieldnames: questionImage_0, questionImage_1, etc.
        questions.forEach((q, index) => {
          if (q.imageFile) {
            formData.append(`questionImage_${index}`, q.imageFile);
          }
        });
      }

      await api.post('/assignments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error creating evaluation:", err);
      setFormError(err.response?.data?.message || "Une erreur est survenue lors de la création de l'évaluation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer & Programmer une Évaluation"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {formError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Erreur dans le formulaire</p>
              <p className="text-xs mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        {/* Course Banner */}
        <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/15 text-brand-accent flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-brand-text">
                {courseSubject || 'Matière'} {courseNiveau ? `• ${courseNiveau}` : ''}
              </h4>
              <p className="text-xs text-brand-text-muted">
                Évaluation nationale synchronisée avec l'agenda pédagogique
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-brand-accent text-white shadow-sm">
            Niveau National
          </span>
        </div>

        {/* 1. Type d'évaluation (Select / Cards) */}
        <div>
          <label className="block text-xs font-black text-brand-text uppercase tracking-wider mb-2">
            1. Type d'évaluation <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setEvalType('COMPOSITION_NIVEAU')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                evalType === 'COMPOSITION_NIVEAU' || evalType === 'COMPO_NIVEAU'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-md ring-1 ring-indigo-500/30'
                  : 'border-brand-border/60 hover:border-brand-border bg-brand-sidebar text-brand-text-muted'
              }`}
            >
              <div className={`p-2 rounded-lg ${evalType.startsWith('COMPOSITION') ? 'bg-indigo-500 text-white' : 'bg-brand-card text-brand-text-muted'}`}>
                <Layers className="w-5 h-5" />
              </div>
              <div className="grow">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-brand-text">Composition d'examen</span>
                  {evalType.startsWith('COMPOSITION') && <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-500 text-white">Recommandé</span>}
                </div>
                <p className="text-xs text-brand-text-muted mt-1">
                  Épreuve d'examen périodique (Compo) comptabilisée pour le bulletin.
                </p>
              </div>
            </div>

            <div
              onClick={() => setEvalType('DEVOIR_NIVEAU')}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                evalType === 'DEVOIR_NIVEAU' || evalType === 'DEVOIR_MAISON'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-md ring-1 ring-amber-500/30'
                  : 'border-brand-border/60 hover:border-brand-border bg-brand-sidebar text-brand-text-muted'
              }`}
            >
              <div className={`p-2 rounded-lg ${evalType.startsWith('DEVOIR') ? 'bg-amber-500 text-white' : 'bg-brand-card text-brand-text-muted'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="grow">
                <span className="font-bold text-sm text-brand-text">Devoir de niveau / Évaluation</span>
                <p className="text-xs text-brand-text-muted mt-1">
                  Évaluation continue ou devoir standard programmé pour tous les apprenants.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Titre, Trimestre, Coefficient & Barème */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-brand-text uppercase tracking-wider mb-1.5">
              Titre / Sujet de l'épreuve <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={evalType.startsWith('COMPOSITION') ? "Ex: Composition du 1er Trimestre - Épreuve de Mathématiques" : "Ex: Devoir de synthèse n°1"}
              className="w-full p-3 bg-brand-sidebar border border-brand-border/70 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-brand-text uppercase tracking-wider mb-1.5">
              Trimestre / Période <span className="text-red-500">*</span>
            </label>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="w-full p-3 bg-brand-sidebar border border-brand-border/70 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm font-semibold cursor-pointer"
            >
              {availableTerms.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-brand-text uppercase tracking-wider mb-1.5">
                Coefficient
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={coefficient}
                onChange={(e) => setCoefficient(Number(e.target.value) || 1)}
                className="w-full p-3 bg-brand-sidebar border border-brand-border/70 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-brand-text uppercase tracking-wider mb-1.5">
                Total Barème
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={evaluationFormat === 'QUESTIONNAIRE' ? totalCalculatedPoints : points}
                onChange={(e) => setPoints(Number(e.target.value) || 20)}
                disabled={evaluationFormat === 'QUESTIONNAIRE'}
                className={`w-full p-3 bg-brand-sidebar border border-brand-border/70 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm font-bold text-center ${evaluationFormat === 'QUESTIONNAIRE' ? 'opacity-80' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* 3. Programmation & Agenda */}
        <div className="p-5 rounded-2xl bg-brand-sidebar/60 border border-brand-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-text flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-accent" />
              Programmation & Agenda des élèves
            </h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={affecterAgenda}
                onChange={(e) => setAffecterAgenda(e.target.checked)}
                className="w-4 h-4 text-brand-accent rounded focus:ring-brand-accent"
              />
              <span className="text-xs font-bold text-brand-accent">
                Affecter immédiatement à l'agenda
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-brand-text-muted mb-1">
                Date & Heure de début
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 bg-brand-card border border-brand-border/70 rounded-xl text-brand-text text-xs focus:ring-2 focus:ring-brand-accent focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-brand-text-muted mb-1">
                Date & Heure limite de rendu <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 bg-brand-card border border-brand-border/70 rounded-xl text-brand-text text-xs focus:ring-2 focus:ring-brand-accent focus:outline-none font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-brand-text-muted mb-1">
                Durée estimée (minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="360"
                  step="5"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 60"
                  className="w-full p-2.5 bg-brand-card border border-brand-border/70 rounded-xl text-brand-text text-xs focus:ring-2 focus:ring-brand-accent focus:outline-none font-medium pl-8"
                />
                <Clock className="w-3.5 h-3.5 text-brand-text-muted absolute left-2.5 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Choix du format : Fichiers vs Questionnaire interactif */}
        <div>
          <label className="block text-xs font-black text-brand-text uppercase tracking-wider mb-2">
            2. Format du sujet de composition / devoir
          </label>
          <div className="flex bg-brand-sidebar p-1 rounded-xl border border-brand-border/70">
            <button
              type="button"
              onClick={() => setEvaluationFormat('DOCUMENT')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                evaluationFormat === 'DOCUMENT'
                  ? 'bg-brand-accent text-white shadow-md'
                  : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <FileText className="w-4 h-4" />
              Fichier Sujet & Corrigé (PDF / Word)
            </button>
            <button
              type="button"
              onClick={() => setEvaluationFormat('QUESTIONNAIRE')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                evaluationFormat === 'QUESTIONNAIRE'
                  ? 'bg-brand-accent text-white shadow-md'
                  : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Questionnaire / Quiz interactif ({questions.length} questions)
            </button>
          </div>
        </div>

        {/* FORMAT A : Document (Sujet & Corrigé) */}
        {evaluationFormat === 'DOCUMENT' ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sujet File */}
              <div className="p-4 rounded-2xl bg-brand-sidebar/40 border-2 border-dashed border-brand-border/80 hover:border-brand-accent/60 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-brand-text flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-accent" />
                    Fichier du Sujet (PDF / Doc)
                  </span>
                  {subjectFile && (
                    <button
                      type="button"
                      onClick={() => setSubjectFile(null)}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                {subjectFile ? (
                  <div className="p-3 bg-brand-accent/10 border border-brand-accent/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="w-4 h-4 text-brand-accent shrink-0" />
                      <span className="text-xs font-bold text-brand-text truncate">{subjectFile.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-brand-text-muted">
                      {(subjectFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border border-brand-border/40 rounded-xl cursor-pointer hover:bg-brand-sidebar/80 transition">
                    <Upload className="w-6 h-6 text-brand-text-muted mb-1" />
                    <span className="text-xs font-bold text-brand-text">Sélectionner le sujet</span>
                    <span className="text-[10px] text-brand-text-muted">PDF, Word, Images (max 50MB)</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => e.target.files?.[0] && setSubjectFile(e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              {/* Corrigé File */}
              <div className="p-4 rounded-2xl bg-brand-sidebar/40 border-2 border-dashed border-brand-border/80 hover:border-emerald-500/60 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-brand-text flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Fichier du Corrigé & Barème
                  </span>
                  {correctionFile && (
                    <button
                      type="button"
                      onClick={() => setCorrectionFile(null)}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
                {correctionFile ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-brand-text truncate">{correctionFile.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-brand-text-muted">
                      {(correctionFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border border-brand-border/40 rounded-xl cursor-pointer hover:bg-brand-sidebar/80 transition">
                    <Upload className="w-6 h-6 text-brand-text-muted mb-1" />
                    <span className="text-xs font-bold text-brand-text">Sélectionner le corrigé (Facultatif)</span>
                    <span className="text-[10px] text-brand-text-muted">Visible pour l'enseignant ou post-épreuve</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => e.target.files?.[0] && setCorrectionFile(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Description & Consignes */}
            <div>
              <label className="block text-xs font-black text-brand-text uppercase tracking-wider mb-1.5">
                Consignes textuelles de l'épreuve
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Rédigez les consignes particulières, matériel autorisé, calculatrices autorisées..."
                className="w-full p-3 bg-brand-sidebar border border-brand-border/70 rounded-xl text-brand-text text-xs focus:ring-2 focus:ring-brand-accent focus:outline-none"
              />
            </div>
          </div>
        ) : (
          /* FORMAT B : Questionnaire Interactif (Questions & Images) */
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between p-3 bg-brand-card rounded-xl border border-brand-border/60">
              <span className="text-xs font-bold text-brand-text">
                Questions configurées : <strong className="text-brand-accent">{questions.length}</strong> • Total : <strong className="text-emerald-500">{totalCalculatedPoints} pts</strong>
              </span>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={addQuestion}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Ajouter une question
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-brand-card border border-brand-border/80 shadow-sm space-y-4 transition-all hover:border-brand-accent/40"
                >
                  {/* Header of Question */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-brand-border/40">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-brand-accent text-white flex items-center justify-center font-black text-xs">
                        {qIndex + 1}
                      </span>
                      <span className="text-xs font-black text-brand-text uppercase tracking-wider">
                        Question n°{qIndex + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Question Type */}
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestionType(qIndex, e.target.value as any)}
                        className="p-1.5 bg-brand-sidebar border border-brand-border/60 rounded-lg text-xs font-bold text-brand-text focus:outline-none"
                      >
                        <option value="SINGLE_CHOICE">QCM (Choix unique)</option>
                        <option value="MULTIPLE_CHOICE">QCM (Choix multiples)</option>
                        <option value="FILL_IN_BLANK">Texte court / À compléter</option>
                        <option value="OPEN">Réponse libre</option>
                      </select>

                      {/* Points */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={q.points}
                          onChange={(e) => updateQuestionPoints(qIndex, Number(e.target.value))}
                          className="w-12 p-1 bg-brand-sidebar border border-brand-border/60 rounded-lg text-xs font-bold text-center text-brand-text"
                        />
                        <span className="text-[11px] font-bold text-brand-text-muted">pts</span>
                      </div>

                      {/* Delete Question */}
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="p-1 text-brand-text-muted hover:text-red-500 transition"
                          title="Supprimer la question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                      placeholder={`Énoncé de la question n°${qIndex + 1}...`}
                      className="w-full p-2.5 bg-brand-sidebar border border-brand-border/70 rounded-xl text-brand-text text-xs font-semibold focus:ring-2 focus:ring-brand-accent focus:outline-none"
                      required
                    />
                  </div>

                  {/* Question Illustration Image */}
                  <div className="p-3 bg-brand-sidebar/60 rounded-xl border border-brand-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-brand-text-muted flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-brand-accent" />
                        Image d'illustration (Figure, Graphique, Schéma...)
                      </span>
                      {q.imagePreview && (
                        <button
                          type="button"
                          onClick={() => handleQuestionImageUpload(qIndex, null)}
                          className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                          Supprimer l'image
                        </button>
                      )}
                    </div>

                    {q.imagePreview ? (
                      <div className="flex items-center gap-4 bg-brand-card p-2 rounded-lg border border-brand-border/50">
                        <img
                          src={q.imagePreview}
                          alt={`Illustration Q${qIndex + 1}`}
                          className="w-20 h-20 object-contain rounded-md border border-brand-border/60 bg-white"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-brand-text">{q.imageFile?.name}</p>
                          <p className="text-[10px] text-brand-text-muted">
                            {q.imageFile ? (q.imageFile.size / 1024).toFixed(1) + ' KB' : ''}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-brand-border/60 rounded-lg cursor-pointer hover:bg-brand-sidebar transition text-xs text-brand-text-muted hover:text-brand-text font-medium">
                        <Upload className="w-4 h-4 text-brand-accent" />
                        <span>Joindre une image à cette question</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleQuestionImageUpload(qIndex, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>

                  {/* Options (For QCM) */}
                  {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-brand-text-muted block">
                        Options de réponse (Cochez la / les bonne(s) réponse(s)) :
                      </span>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleOptionCorrect(qIndex, optIndex)}
                            className={`p-2 rounded-lg border transition ${
                              opt.isCorrect
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                                : 'bg-brand-sidebar border-brand-border/60 text-brand-text-muted hover:border-brand-text-muted'
                            }`}
                            title={opt.isCorrect ? "Bonne réponse" : "Définir comme bonne réponse"}
                          >
                            {opt.isCorrect ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>

                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}...`}
                            className={`grow p-2 bg-brand-sidebar border rounded-xl text-xs font-medium focus:outline-none ${
                              opt.isCorrect ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-brand-border/60'
                            }`}
                          />

                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIndex, optIndex)}
                              className="text-brand-text-muted hover:text-red-500 p-1"
                              title="Supprimer cette option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addOption(qIndex)}
                        className="text-[11px] font-bold text-brand-accent hover:underline flex items-center gap-1 mt-2"
                      >
                        <Plus className="w-3 h-3" />
                        Ajouter une option
                      </button>
                    </div>
                  )}

                  {/* Fill in blank answer */}
                  {q.type === 'FILL_IN_BLANK' && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-brand-text-muted mb-1">
                        Réponse exacte attendue :
                      </label>
                      <input
                        type="text"
                        value={q.expectedAnswer || ''}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[qIndex].expectedAnswer = e.target.value;
                          setQuestions(updated);
                        }}
                        placeholder="Ex: 42 ou Paris"
                        className="w-full p-2 bg-brand-sidebar border border-brand-border/60 rounded-lg text-xs font-medium"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/60">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {evalType.startsWith('COMPOSITION') ? 'Programmer la Composition' : 'Programmer l\'Évaluation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
