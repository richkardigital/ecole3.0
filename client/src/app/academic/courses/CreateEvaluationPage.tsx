import React, { useState, useEffect } from 'react';
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
  FileCheck,
  ArrowLeft,
  Eye,
  BookOpen,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EvaluationPreviewModal } from '@/components/EvaluationPreviewModal';
import api, { getFileUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

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

interface CreateEvaluationPageProps {
  courseId: string;
  courseSubject?: string;
  courseNiveau?: string;
  defaultCoefficient?: number;
  availableTerms: { id: string; name: string }[];
  evaluationId?: string | null;
  onBack: () => void;
  onSuccess: () => void;
}

export const CreateEvaluationPage: React.FC<CreateEvaluationPageProps> = ({
  courseId,
  courseSubject,
  courseNiveau,
  defaultCoefficient = 1,
  availableTerms,
  evaluationId,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Mode: Document (File) vs Interactive Questionnaire
  const [evaluationFormat, setEvaluationFormat] = useState<'DOCUMENT' | 'QUESTIONNAIRE'>('DOCUMENT');

  // Form Basic Info
  const [evalType, setEvalType] = useState<string>(isSuperAdmin ? 'COMPOSITION_NIVEAU' : 'DEVOIR_CLASSE');
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
  const [existingSubjectUrl, setExistingSubjectUrl] = useState<string | null>(null);
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [existingCorrectionUrl, setExistingCorrectionUrl] = useState<string | null>(null);
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
  const [previewEvaluation, setPreviewEvaluation] = useState<any | null>(null);

  useEffect(() => {
    if (evaluationId) {
      const fetchAssignment = async () => {
        try {
          setLoading(true);
          const res = await api.get(`/assignments/${evaluationId}`);
          const data = res.data;
          setTitle(data.title || '');
          setEvalType(data.type || 'COMPOSITION_NIVEAU');
          if (data.termId) setTermId(data.termId);
          if (data.coefficient) setCoefficient(data.coefficient);
          if (data.points) setPoints(data.points);
          if (data.startDate) {
            const d = new Date(data.startDate);
            setStartDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
          if (data.dueDate) {
            const d = new Date(data.dueDate);
            setDueDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          }
          if (data.timeLimit) setTimeLimit(data.timeLimit);
          if (data.description) setDescription(data.description);

          if (data.questions && data.questions.length > 0) {
            setEvaluationFormat('QUESTIONNAIRE');
            setQuestions(data.questions.map((q: any, idx: number) => ({
              id: q.id || `q-${idx}`,
              text: q.text || '',
              type: q.type || 'SINGLE_CHOICE',
              points: q.points || 2,
              imagePreview: q.imageUrl ? getFileUrl(q.imageUrl) : null,
              options: q.options && q.options.length > 0
                ? q.options.map((o: any) => ({ text: o.text || '', isCorrect: Boolean(o.isCorrect) }))
                : [{ text: '', isCorrect: true }, { text: '', isCorrect: false }]
            })));
          } else {
            setEvaluationFormat('DOCUMENT');
            if (data.attachments && data.attachments.length > 0) {
              setExistingSubjectUrl(data.attachments[0]);
            } else if (data.fileUrl) {
              setExistingSubjectUrl(data.fileUrl);
            }
            if (data.correctionUrl) {
              setExistingCorrectionUrl(data.correctionUrl);
            }
          }
        } catch (err) {
          console.error("Error loading evaluation:", err);
          setFormError("Impossible de charger l'évaluation.");
        } finally {
          setLoading(false);
        }
      };
      fetchAssignment();
    }
  }, [evaluationId]);

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

  const handleOpenPreview = () => {
    setPreviewEvaluation({
      title: title || "Aperçu de l'Évaluation",
      description: description || "Consignes pour les apprenants...",
      dueDate: dueDate || new Date().toISOString(),
      startDate: startDate || new Date().toISOString(),
      timeLimit: timeLimit ? Number(timeLimit) : null,
      points: evaluationFormat === 'QUESTIONNAIRE' ? totalCalculatedPoints : points,
      coefficient: coefficient || 1,
      type: evalType,
      fileUrl: subjectFile ? URL.createObjectURL(subjectFile) : undefined,
      correctionUrl: correctionFile ? URL.createObjectURL(correctionFile) : undefined,
      questions: evaluationFormat === 'QUESTIONNAIRE' ? questions.map(q => ({
        text: q.text || "Question sans titre",
        type: q.type,
        points: q.points,
        imageUrl: q.imagePreview || undefined,
        options: q.options.map(o => ({
          text: o.text || "Option",
          isCorrect: o.isCorrect
        }))
      })) : undefined
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Veuillez saisir un titre pour l'évaluation.");
      return;
    }

    if (!dueDate) {
      setFormError("Veuillez définir une date limite de rendu.");
      return;
    }

    if (evaluationFormat === 'DOCUMENT' && !subjectFile && !existingSubjectUrl) {
      setFormError("Veuillez joindre le fichier du sujet de l'évaluation (PDF, Word ou Image).");
      return;
    }

    if (evaluationFormat === 'QUESTIONNAIRE') {
      if (questions.length === 0) {
        setFormError("Veuillez ajouter au moins une question au questionnaire.");
        return;
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text.trim()) {
          setFormError(`La question #${i + 1} n'a pas de texte.`);
          return;
        }

        if (q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') {
          if (q.options.some(opt => !opt.text.trim())) {
            setFormError(`Toutes les options de la question #${i + 1} doivent être renseignées.`);
            return;
          }
          if (!q.options.some(opt => opt.isCorrect)) {
            setFormError(`La question #${i + 1} doit comporter au moins une bonne réponse.`);
            return;
          }
        }
      }
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('courseId', courseId);
      formData.append('title', title.trim());
      formData.append('type', evalType);
      formData.append('termId', termId);
      formData.append('coefficient', coefficient.toString());
      formData.append('points', (evaluationFormat === 'QUESTIONNAIRE' ? totalCalculatedPoints : points).toString());
      if (startDate) formData.append('startDate', new Date(startDate).toISOString());
      formData.append('dueDate', new Date(dueDate).toISOString());
      if (timeLimit) formData.append('timeLimit', timeLimit.toString());
      formData.append('syncCalendar', affecterAgenda ? 'true' : 'false');
      formData.append('description', description.trim());
      formData.append('isNiveauWide', 'true');
      formData.append('scope', 'NIVEAU');

      // Mode Document Attachments
      if (evaluationFormat === 'DOCUMENT') {
        if (subjectFile) formData.append('file', subjectFile);
        if (correctionFile) formData.append('correction', correctionFile);
        if (voiceNoteFile) formData.append('voiceNote', voiceNoteFile);
      }

      // Mode Questionnaire Payload & Image Attachments
      if (evaluationFormat === 'QUESTIONNAIRE') {
        const questionsPayload = questions.map((q, index) => ({
          text: q.text,
          type: q.type,
          points: q.points,
          position: index,
          options: q.options.map(opt => ({
            text: opt.text,
            isCorrect: opt.isCorrect
          }))
        }));

        formData.append('questions', JSON.stringify(questionsPayload));

        // Attach question images if any
        questions.forEach((q, index) => {
          if (q.imageFile) {
            formData.append(`questionImage_${index}`, q.imageFile);
          }
        });
      }

      if (evaluationId) {
        await api.put(`/assignments/${evaluationId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/assignments', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error saving evaluation:", err);
      setFormError(err.response?.data?.message || "Erreur lors de l'enregistrement de l'évaluation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-brand-sidebar hover:bg-slate-800 text-brand-text-muted hover:text-brand-text border border-brand-border/60 transition cursor-pointer"
            title="Retour au cours"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <span>{courseSubject || 'Cours'}</span>
              <span>•</span>
              <span>{courseNiveau || 'Niveau Global'}</span>
            </div>
            <h1 className="text-2xl font-black text-[#4D3E90] tracking-tight mt-0.5 flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-emerald-500" />
              {evaluationId ? "Modifier l'Évaluation" : "Créer une Nouvelle Évaluation"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenPreview}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4" /> Prévisualiser
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="cursor-pointer"
          >
            Annuler
          </Button>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode Selector */}
        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border/80 shadow-sm">
          <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-3">
            Format de l'évaluation
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setEvaluationFormat('DOCUMENT')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                evaluationFormat === 'DOCUMENT'
                  ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/40'
                  : 'bg-brand-sidebar hover:bg-slate-900/40 border-brand-border/60 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2.5 rounded-xl ${evaluationFormat === 'DOCUMENT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-card text-brand-text-muted'}`}>
                  <FileText className="w-6 h-6" />
                </div>
                {evaluationFormat === 'DOCUMENT' && (
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                    Sélectionné
                  </span>
                )}
              </div>
              <h4 className="font-bold text-base text-brand-text group-hover:text-emerald-400 transition-colors">
                1. Dépôt de Document (Sujet & Corrigé)
              </h4>
              <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                Joignez un fichier épreuve (PDF, Word, Image) et facultativement son corrigé ou une consigne vocale.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setEvaluationFormat('QUESTIONNAIRE')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                evaluationFormat === 'QUESTIONNAIRE'
                  ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/40'
                  : 'bg-brand-sidebar hover:bg-slate-900/40 border-brand-border/60 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2.5 rounded-xl ${evaluationFormat === 'QUESTIONNAIRE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-card text-brand-text-muted'}`}>
                  <Sparkles className="w-6 h-6" />
                </div>
                {evaluationFormat === 'QUESTIONNAIRE' && (
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                    Sélectionné
                  </span>
                )}
              </div>
              <h4 className="font-bold text-base text-brand-text group-hover:text-emerald-400 transition-colors">
                2. Questionnaire Interactif (QCM & Questions)
              </h4>
              <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                Créez une épreuve interactive pas à pas avec barème, QCM, illustrations et correction automatisée.
              </p>
            </button>
          </div>
        </div>

        {/* Section 1 : Informations Générales */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-brand-border/60">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="font-black text-lg text-brand-text">Paramètres & Calendrier de l'Épreuve</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
                Titre de l'évaluation *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Composition du 1er Trimestre - Mathématiques"
                className="w-full px-4 py-3 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-semibold text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
                Type d'évaluation *
              </label>
              <select
                value={evalType}
                onChange={(e) => setEvalType(e.target.value)}
                className="w-full px-4 py-3 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-semibold text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition cursor-pointer"
              >
                {isSuperAdmin && (
                  <>
                    <option value="COMPOSITION_NIVEAU">Composition de Niveau (Harmonisée Super Admin)</option>
                    <option value="DEVOIR_NIVEAU">Devoir de Niveau (Super Admin)</option>
                    <option value="EXAMEN">Examen Blanc / National (Super Admin)</option>
                  </>
                )}
                <option value="DEVOIR_CLASSE">Devoir de Classe (Noté)</option>
                <option value="DEVOIR_MAISON">Devoir Maison (Noté)</option>
                <option value="EXERCICE_MAISON">Exercice de Maison (Non Noté / Entraînement)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
                Trimestre *
              </label>
              <select
                value={termId}
                onChange={(e) => setTermId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-semibold text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition cursor-pointer"
              >
                {availableTerms.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
                Coefficient
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={coefficient}
                onChange={(e) => setCoefficient(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-semibold text-sm focus:border-emerald-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
                Total Barème (Points)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={evaluationFormat === 'QUESTIONNAIRE' ? totalCalculatedPoints : points}
                disabled={evaluationFormat === 'QUESTIONNAIRE'}
                onChange={(e) => setPoints(parseInt(e.target.value) || 20)}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-semibold text-sm focus:border-emerald-500 outline-none transition disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Durée (Minutes)
              </label>
              <input
                type="number"
                placeholder="Ex: 60 (vide = illimité)"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-semibold text-sm focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Date d'ouverture (Disponible dès)
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-semibold text-sm focus:border-emerald-500 outline-none transition cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2 flex items-center gap-1.5 text-amber-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Date limite de rendu (Échéance) *
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-semibold text-sm focus:border-emerald-500 outline-none transition cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
              Consignes & Description générale
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions pour les élèves : calculatrice autorisée, temps conseillé, etc."
              className="w-full px-4 py-3 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text text-sm focus:border-emerald-500 outline-none transition resize-none"
            />
          </div>

          <label className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-sidebar border border-brand-border/80 hover:border-emerald-500/50 transition cursor-pointer">
            <input
              type="checkbox"
              checked={affecterAgenda}
              onChange={(e) => setAffecterAgenda(e.target.checked)}
              className="w-4 h-4 text-emerald-500 rounded border-brand-border focus:ring-emerald-500 cursor-pointer"
            />
            <div>
              <div className="text-sm font-bold text-brand-text">Synchroniser avec l'agenda des apprenants</div>
              <div className="text-xs text-brand-text-muted">L'évaluation apparaîtra automatiquement dans leur calendrier et leurs rappels.</div>
            </div>
          </label>
        </div>

        {/* Section 2 : Contenu (Mode Document) */}
        {evaluationFormat === 'DOCUMENT' && (
          <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-brand-border/60">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-lg text-brand-text">Fichiers de l'Évaluation</h3>
            </div>

            {/* Fichier Sujet */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider">
                1. Sujet de l'évaluation (Obligatoire) *
              </label>
              <div className="border-2 border-dashed border-brand-border/80 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition bg-brand-sidebar relative">
                <input
                  type="file"
                  required={!subjectFile && !existingSubjectUrl}
                  onChange={(e) => setSubjectFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  {subjectFile ? (
                    <div className="text-emerald-400 font-bold text-sm">
                      Nouveau fichier sélectionné : {subjectFile.name} ({(subjectFile.size / (1024 * 1024)).toFixed(2)} Mo)
                    </div>
                  ) : existingSubjectUrl ? (
                    <div className="space-y-1">
                      <div className="text-emerald-400 font-bold text-sm">
                        Fichier actuel : {existingSubjectUrl.split('/').pop()}
                      </div>
                      <div className="text-xs text-brand-text-muted">
                        Cliquez ou glissez-déposez un nouveau fichier pour le remplacer (Optionnel)
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-brand-text font-bold text-sm">Cliquez ou glissez-déposez le sujet ici</div>
                      <div className="text-xs text-brand-text-muted mt-1">Formats acceptés : PDF, Word, Excel, Images (Max 20 Mo)</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Fichier Corrigé */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider">
                2. Corrigé officiel (Optionnel)
              </label>
              <div className="border border-brand-border/80 hover:border-emerald-500/60 rounded-xl p-4 transition bg-brand-sidebar flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-brand-text-muted" />
                  <div>
                    <div className="text-sm font-bold text-brand-text">
                      {correctionFile ? correctionFile.name : "Joindre le corrigé pour consultation ultérieure"}
                    </div>
                    <div className="text-xs text-brand-text-muted">Sera accessible uniquement après la date limite ou aux correcteurs.</div>
                  </div>
                </div>
                <label className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer transition">
                  Parcourir
                  <input
                    type="file"
                    onChange={(e) => setCorrectionFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Consignes Audio */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider">
                3. Consigne Vocale / Note Audio (Optionnel)
              </label>
              <div className="border border-brand-border/80 hover:border-emerald-500/60 rounded-xl p-4 transition bg-brand-sidebar flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-sm font-bold text-brand-text">
                      {voiceNoteFile ? voiceNoteFile.name : "Ajouter des explications vocales (MP3, WAV, M4A)"}
                    </div>
                    <div className="text-xs text-brand-text-muted">Permet aux élèves d'écouter les consignes prononcées par le professeur.</div>
                  </div>
                </div>
                <label className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer transition">
                  Parcourir Audio
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setVoiceNoteFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Section 2 : Contenu (Mode Questionnaire Interactif) */}
        {evaluationFormat === 'QUESTIONNAIRE' && (
          <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-lg text-brand-text">Questions de l'Épreuve</h3>
              </div>
              <div className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Total Barème : {totalCalculatedPoints} pts
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div key={q.id} className="p-5 rounded-2xl bg-brand-sidebar border border-brand-border/80 space-y-4 relative group">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-xs">
                        {qIndex + 1}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestionType(qIndex, e.target.value as any)}
                        className="px-3 py-1.5 bg-brand-card border border-brand-border/80 rounded-lg text-xs font-bold text-brand-text outline-none cursor-pointer"
                      >
                        <option value="SINGLE_CHOICE">QCM (Une seule bonne réponse)</option>
                        <option value="MULTIPLE_CHOICE">Choix Multiples (Plusieurs réponses)</option>
                        <option value="OPEN">Question Rédactionnelle / Ouverte</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-brand-text-muted">Points :</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={q.points}
                          onChange={(e) => updateQuestionPoints(qIndex, parseInt(e.target.value) || 1)}
                          className="w-14 px-2 py-1 bg-brand-card border border-brand-border/80 rounded-lg text-xs font-black text-brand-text text-center outline-none"
                        />
                      </div>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="p-1.5 text-brand-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                          title="Supprimer cette question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Intitulé de la question */}
                  <div>
                    <textarea
                      rows={2}
                      value={q.text}
                      onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                      placeholder={`Énoncé de la question #${qIndex + 1}...`}
                      className="w-full px-3.5 py-2.5 bg-brand-card border border-brand-border/80 rounded-xl text-brand-text text-sm focus:border-emerald-500 outline-none transition resize-none font-medium"
                    />
                  </div>

                  {/* Image d'illustration de la question */}
                  <div className="flex items-center gap-3">
                    <label className="px-3 py-1.5 rounded-lg bg-brand-card hover:bg-slate-800 text-brand-text-muted hover:text-brand-text border border-brand-border/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      {q.imageFile ? "Changer l'image" : "Ajouter une image d'illustration"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleQuestionImageUpload(qIndex, e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    {q.imagePreview && (
                      <div className="flex items-center gap-2">
                        <img src={q.imagePreview} alt="Aperçu" className="w-10 h-10 object-cover rounded-lg border border-brand-border/80" />
                        <button
                          type="button"
                          onClick={() => handleQuestionImageUpload(qIndex, null)}
                          className="text-xs text-red-400 hover:underline cursor-pointer"
                        >
                          Supprimer l'image
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Options de réponse si QCM */}
                  {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && (
                    <div className="space-y-2 pt-2 border-t border-brand-border/50">
                      <div className="text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">
                        Options de réponse (Cochez la ou les bonnes réponses)
                      </div>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleOptionCorrect(qIndex, optIdx)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              opt.isCorrect
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-brand-card text-brand-text-muted border-brand-border/60 hover:border-emerald-500/40'
                            }`}
                            title={opt.isCorrect ? "Bonne réponse" : "Cliquer pour marquer comme bonne réponse"}
                          >
                            {opt.isCorrect ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOptionText(qIndex, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            className={`flex-1 px-3 py-2 bg-brand-card border rounded-xl text-xs font-semibold outline-none transition ${
                              opt.isCorrect ? 'border-emerald-500/50 text-emerald-300' : 'border-brand-border/80 text-brand-text'
                            }`}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIndex, optIdx)}
                              className="p-1.5 text-brand-text-muted hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(qIndex)}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter une option
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                className="w-full py-3 border-dashed border-brand-border hover:border-emerald-500 text-emerald-400 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Ajouter une question suivante
              </Button>
            </div>
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 p-4 bg-slate-900/95 backdrop-blur border border-brand-border/90 rounded-2xl shadow-2xl">
          <div className="text-xs text-slate-300 font-semibold hidden sm:block">
            {evaluationFormat === 'DOCUMENT' ? 'Mode Document actif' : `${questions.length} questions • ${totalCalculatedPoints} points`}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenPreview}
              className="cursor-pointer"
            >
              <Eye className="w-4 h-4 mr-1.5" /> Aperçu élève
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={loading}
              className="cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              {loading ? (evaluationId ? "Mise à jour en cours..." : "Création en cours...") : (evaluationId ? "Mettre à jour l'Évaluation" : "Enregistrer & Publier l'Évaluation")}
            </Button>
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      {previewEvaluation && (
        <EvaluationPreviewModal
          isOpen={true}
          onClose={() => setPreviewEvaluation(null)}
          evaluation={previewEvaluation}
        />
      )}
    </div>
  );
};
