import React, { useState } from 'react';
import { 
  FileText, 
  HelpCircle, 
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
  Check,
  GraduationCap,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';

interface ExerciseOption {
  text: string;
  isCorrect: boolean;
}

interface ExerciseQuestionDraft {
  id: string;
  text: string;
  type: 'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE';
  points: number;
  correctAnswer?: string;
  imageUrl?: string;
  imageFile?: File | null;
  imagePreview?: string | null;
  options: ExerciseOption[];
}

interface ChapterOption {
  id: string;
  title: string;
  termId?: string;
  term?: { id: string; name: string };
}

interface CreateExercisePageProps {
  courseId: string;
  courseSubject?: string;
  courseNiveau?: string;
  chapters: ChapterOption[];
  initialChapterId?: string;
  exerciseId?: string;
  availableTerms: { id: string; name: string }[];
  onBack: () => void;
  onSuccess: () => void;
}

export const CreateExercisePage: React.FC<CreateExercisePageProps> = ({
  courseId,
  courseSubject,
  courseNiveau,
  chapters,
  initialChapterId,
  exerciseId,
  availableTerms,
  onBack,
  onSuccess,
}) => {
  const { success, error: toastError } = useToast();

  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialChapterId || (chapters[0]?.id ?? '')
  );
  const [selectedTermId, setSelectedTermId] = useState<string>(availableTerms[0]?.id || 'TRIMESTRE_1');

  // Format: Interactive Questionnaire vs Document File
  const [exerciseFormat, setExerciseFormat] = useState<'QUESTIONNAIRE' | 'DOCUMENT'>('QUESTIONNAIRE');

  // General fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exerciseType, setExerciseType] = useState<'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE'>('QCM');
  const [isGraded, setIsGraded] = useState(false); // Non noté par défaut (entraînement libre)
  const [coefficient, setCoefficient] = useState(1);
  const [timeLimit, setTimeLimit] = useState<number | ''>('');

  // Mode Document Files
  const [subjectFile, setSubjectFile] = useState<File | null>(null);

  // Mode Questionnaire Questions
  const [questions, setQuestions] = useState<ExerciseQuestionDraft[]>([
    {
      id: 'eq-1',
      text: '',
      type: 'QCM',
      points: 1,
      imageUrl: '',
      imageFile: null,
      imagePreview: null,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ]
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [fetchingExercise, setFetchingExercise] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load existing exercise if exerciseId is provided (Edit Mode)
  React.useEffect(() => {
    if (!exerciseId) return;

    const fetchExisting = async () => {
      try {
        setFetchingExercise(true);
        const res = await api.get(`/exercises/${exerciseId}`);
        const data = res.data;
        if (data) {
          setTitle(data.title || '');
          setDescription(data.description || '');
          setExerciseType(data.type || 'QCM');
          setIsGraded(!!data.isGraded);
          setCoefficient(data.coefficient || 1);
          setTimeLimit(data.timeLimit || '');
          if (data.chapterId) setSelectedChapterId(data.chapterId);

          if (data.questions && data.questions.length > 0) {
            setQuestions(
              data.questions.map((q: any, i: number) => ({
                id: q.id || `eq-${i}`,
                text: q.text || '',
                type: q.type || data.type || 'QCM',
                points: q.points || 1,
                correctAnswer: q.correctAnswer || '',
                imageUrl: q.imageUrl || '',
                imagePreview: q.imageUrl || null,
                imageFile: null,
                options: q.options && q.options.length > 0
                  ? q.options.map((o: any) => ({
                      text: o.text || '',
                      isCorrect: !!o.isCorrect
                    }))
                  : [
                      { text: '', isCorrect: true },
                      { text: '', isCorrect: false }
                    ]
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error loading exercise details:", err);
        setFormError("Impossible de charger les détails de l'exercice à modifier.");
      } finally {
        setFetchingExercise(false);
      }
    };

    fetchExisting();
  }, [exerciseId]);

  // Helper question handlers
  const addQuestion = () => {
    const newQ: ExerciseQuestionDraft = {
      id: `eq-${Date.now()}`,
      text: '',
      type: exerciseType,
      points: 1,
      imageUrl: '',
      imageFile: null,
      imagePreview: null,
      options: exerciseType === 'VRAI_FAUX' 
        ? [{ text: 'Vrai', isCorrect: true }, { text: 'Faux', isCorrect: false }]
        : exerciseType === 'QCM'
        ? [{ text: '', isCorrect: true }, { text: '', isCorrect: false }]
        : []
    };
    setQuestions([...questions, newQ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestionText = (idx: number, text: string) => {
    const updated = [...questions];
    updated[idx].text = text;
    setQuestions(updated);
  };

  const updateQuestionPoints = (idx: number, pts: number) => {
    const updated = [...questions];
    updated[idx].points = Math.max(1, pts);
    setQuestions(updated);
  };

  const updateQuestionType = (idx: number, type: 'QCM' | 'VRAI_FAUX' | 'TEXTE_LIBRE') => {
    const updated = [...questions];
    updated[idx].type = type;
    if (type === 'VRAI_FAUX') {
      updated[idx].options = [{ text: 'Vrai', isCorrect: true }, { text: 'Faux', isCorrect: false }];
    } else if (type === 'QCM') {
      updated[idx].options = [{ text: '', isCorrect: true }, { text: '', isCorrect: false }];
    } else {
      updated[idx].options = [];
    }
    setQuestions(updated);
  };

  const handleQuestionImageChange = (qIdx: number, file: File | null) => {
    const updated = [...questions];
    if (file) {
      const preview = URL.createObjectURL(file);
      updated[qIdx].imageFile = file;
      updated[qIdx].imagePreview = preview;
    } else {
      updated[qIdx].imageFile = null;
      updated[qIdx].imagePreview = null;
      updated[qIdx].imageUrl = '';
    }
    setQuestions(updated);
  };

  const removeQuestionImage = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx].imageFile = null;
    updated[qIdx].imagePreview = null;
    updated[qIdx].imageUrl = '';
    setQuestions(updated);
  };

  const addOption = (qIdx: number) => {
    const updated = [...questions];
    updated[qIdx].options.push({ text: '', isCorrect: false });
    setQuestions(updated);
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    if (updated[qIdx].options.length <= 2) return;
    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== optIdx);
    setQuestions(updated);
  };

  const updateOptionText = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx].text = text;
    setQuestions(updated);
  };

  const toggleOptionCorrect = (qIdx: number, optIdx: number) => {
    const updated = [...questions];
    const q = updated[qIdx];
    if (q.type === 'VRAI_FAUX') {
      q.options.forEach((opt, i) => {
        opt.isCorrect = i === optIdx;
      });
    } else {
      q.options[optIdx].isCorrect = !q.options[optIdx].isCorrect;
    }
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedChapterId) {
      setFormError("Veuillez sélectionner un chapitre pour cet exercice.");
      return;
    }

    if (!title.trim()) {
      setFormError("Veuillez saisir un titre pour l'exercice.");
      return;
    }

    if (exerciseFormat === 'DOCUMENT' && !subjectFile) {
      setFormError("Veuillez sélectionner le fichier du sujet de l'exercice.");
      return;
    }

    if (exerciseFormat === 'QUESTIONNAIRE') {
      if (questions.length === 0) {
        setFormError("Ajoutez au moins une question à l'exercice.");
        return;
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text.trim()) {
          setFormError(`La question #${i + 1} doit comporter un énoncé.`);
          return;
        }
        if (q.type === 'QCM' || q.type === 'VRAI_FAUX') {
          if (q.options.some(o => !o.text.trim())) {
            setFormError(`Toutes les options de la question #${i + 1} doivent être remplies.`);
            return;
          }
          if (!q.options.some(o => o.isCorrect)) {
            setFormError(`La question #${i + 1} doit avoir au moins une bonne réponse cochée.`);
            return;
          }
        }
      }
    }

    try {
      setLoading(true);

      if (exerciseFormat === 'DOCUMENT') {
        // Create document resource linked to chapter
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('type', 'PDF');
        formData.append('chapterId', selectedChapterId);
        if (subjectFile) formData.append('file', subjectFile);

        await api.post(`/courses/${courseId}/materials`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Multipart form-data payload to support question image uploads
        const formData = new FormData();
        formData.append('title', title.trim());
        if (description.trim()) formData.append('description', description.trim());
        formData.append('type', exerciseType);
        formData.append('isGraded', String(isGraded));
        formData.append('coefficient', String(isGraded ? coefficient : 0));
        if (timeLimit) formData.append('timeLimit', String(timeLimit));
        formData.append('chapterId', selectedChapterId);

        const questionsJson = questions.map((q, idx) => ({
          text: q.text,
          type: q.type,
          points: q.points,
          position: idx,
          correctAnswer: q.correctAnswer || null,
          imageUrl: q.imageUrl || null,
          options: q.options.map(o => ({
            text: o.text,
            isCorrect: o.isCorrect
          }))
        }));

        formData.append('questions', JSON.stringify(questionsJson));

        // Attach image files for each question
        questions.forEach((q, idx) => {
          if (q.imageFile) {
            formData.append(`questionImage_${idx}`, q.imageFile);
          }
        });

        if (exerciseId) {
          // Update existing exercise
          await api.put(`/exercises/${exerciseId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          success("Exercice modifié avec succès !");
        } else {
          // Create new interactive questionnaire exercise
          await api.post(`/chapters/${selectedChapterId}/exercises`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          success("Exercice créé avec succès !");
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error saving exercise:", err);
      setFormError(err.response?.data?.message || "Erreur lors de l'enregistrement de l'exercice.");
    } finally {
      setLoading(false);
    }
  };

  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Navigation */}
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
            <div className="flex items-center gap-2 text-xs font-bold text-brand-accent">
              <span>{courseSubject || 'Cours'}</span>
              <span>•</span>
              <span>{courseNiveau || 'Niveau Global'}</span>
            </div>
            <h1 className="text-2xl font-black text-[#4D3E90] tracking-tight mt-0.5 flex items-center gap-2.5">
              <GraduationCap className="w-6 h-6 text-brand-accent" />
              {exerciseId ? "Modifier l'Exercice" : "Créer un Nouvel Exercice"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            Format de l'Exercice
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setExerciseFormat('QUESTIONNAIRE')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                exerciseFormat === 'QUESTIONNAIRE'
                  ? 'bg-slate-900 border-brand-accent ring-2 ring-brand-accent/30 shadow-lg shadow-brand-accent/10'
                  : 'bg-brand-sidebar hover:bg-slate-900/40 border-brand-border/60 hover:border-brand-accent/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2.5 rounded-xl ${exerciseFormat === 'QUESTIONNAIRE' ? 'bg-brand-accent/20 text-brand-accent' : 'bg-brand-card text-brand-text-muted'}`}>
                  <Sparkles className="w-6 h-6" />
                </div>
                {exerciseFormat === 'QUESTIONNAIRE' && (
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/40 uppercase">
                    Sélectionné
                  </span>
                )}
              </div>
              <h4 className="font-bold text-base text-brand-text group-hover:text-brand-accent transition-colors">
                1. Questionnaire Interactif (QCM & Entraînement)
              </h4>
              <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                Créez une série de questions interactives avec images d'illustration pour l'auto-évaluation immédiate des apprenants.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExerciseFormat('DOCUMENT')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                exerciseFormat === 'DOCUMENT'
                  ? 'bg-slate-900 border-brand-accent ring-2 ring-brand-accent/30 shadow-lg shadow-brand-accent/10'
                  : 'bg-brand-sidebar hover:bg-slate-900/40 border-brand-border/60 hover:border-brand-accent/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2.5 rounded-xl ${exerciseFormat === 'DOCUMENT' ? 'bg-brand-accent/20 text-brand-accent' : 'bg-brand-card text-brand-text-muted'}`}>
                  <FileText className="w-6 h-6" />
                </div>
                {exerciseFormat === 'DOCUMENT' && (
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/40 uppercase">
                    Sélectionné
                  </span>
                )}
              </div>
              <h4 className="font-bold text-base text-brand-text group-hover:text-brand-accent transition-colors">
                2. Fiche d'Exercices en Document (PDF / Word)
              </h4>
              <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                Importez une fiche de TD, d'exercices d'application ou de révision au format PDF ou Word téléchargeable.
              </p>
            </button>
          </div>
        </div>

        {/* Paramètres de l'exercice */}
        <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-brand-border/60">
            <BookOpen className="w-5 h-5 text-brand-accent" />
            <h3 className="font-black text-lg text-brand-text">Paramètres Pédagogiques</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Chapitre parent */}
            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
                Chapitre Associé *
              </label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-bold text-sm focus:border-brand-accent outline-none cursor-pointer transition"
              >
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.term ? `(${c.term.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Titre */}
            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
                Titre de l'exercice *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Exercice d'application n°1 : Les forces mécaniques"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-bold text-sm focus:border-brand-accent outline-none transition"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
              Instructions & Consignes Pédagogiques (Optionnel)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Lisez attentivement l'énoncé et répondez aux questions ci-dessous..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text text-sm focus:border-brand-accent outline-none transition resize-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-brand-border/60">
            <div>
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2">
                Type de Question par défaut
              </label>
              <select
                value={exerciseType}
                onChange={(e) => setExerciseType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-bold text-sm focus:border-brand-accent outline-none cursor-pointer transition"
              >
                <option value="QCM">QCM (Choix Multiple)</option>
                <option value="VRAI_FAUX">Vrai ou Faux</option>
                <option value="TEXTE_LIBRE">Réponse Courte / Texte</option>
              </select>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-text uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-accent" /> Durée indicative (Minutes)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 15 (vide = sans chrono)"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border/80 rounded-xl text-brand-text font-semibold text-sm focus:border-brand-accent outline-none transition"
                />
              </div>

              {/* Mode noté ou non noté */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-brand-sidebar border border-brand-border/80 hover:border-brand-accent/50 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGraded}
                  onChange={(e) => setIsGraded(e.target.checked)}
                  className="w-4 h-4 text-brand-accent rounded border-brand-border focus:ring-brand-accent cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-brand-text">
                    {isGraded ? "Exercice noté (avec coefficient)" : "Exercice d'entraînement libre (Non noté)"}
                  </div>
                  <div className="text-[11px] text-brand-text-muted">
                    {isGraded ? "Les résultats compteront dans le carnet de notes de l'élève" : "Idéal pour réviser et s'entraîner sans pression de note"}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section Document Mode */}
        {exerciseFormat === 'DOCUMENT' && (
          <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-brand-border/60">
              <FileCheck className="w-5 h-5 text-brand-accent" />
              <h3 className="font-black text-lg text-brand-text">Document de l'Exercice</h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-brand-text uppercase tracking-wider">
                Fichier de l'exercice (PDF ou Word) *
              </label>
              <div className="border-2 border-dashed border-brand-border/80 hover:border-brand-accent/60 rounded-2xl p-6 text-center transition bg-brand-sidebar relative">
                <input
                  type="file"
                  required={!subjectFile}
                  onChange={(e) => setSubjectFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-brand-accent/10 text-brand-accent rounded-xl mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  {subjectFile ? (
                    <div className="text-brand-accent font-bold text-sm">
                      Fichier sélectionné : {subjectFile.name} ({(subjectFile.size / (1024 * 1024)).toFixed(2)} Mo)
                    </div>
                  ) : (
                    <>
                      <div className="text-brand-text font-bold text-sm">Cliquez ou glissez-déposez le fichier d'exercices</div>
                      <div className="text-xs text-brand-text-muted mt-1">Formats acceptés : PDF, Word, Documents (Max 20 Mo)</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Questionnaire Mode */}
        {exerciseFormat === 'QUESTIONNAIRE' && (
          <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-accent" />
                <h3 className="font-black text-lg text-brand-text">Questions d'Entraînement</h3>
              </div>
              <div className="text-xs font-bold px-3 py-1 rounded-lg bg-brand-accent/15 text-brand-accent border border-brand-accent/30">
                {questions.length} Question{questions.length > 1 ? 's' : ''}
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div key={q.id} className="p-5 rounded-2xl bg-brand-sidebar border border-brand-border/80 space-y-4 relative group">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-brand-accent/20 text-brand-accent border border-brand-accent/40 flex items-center justify-center font-black text-xs">
                        {qIndex + 1}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestionType(qIndex, e.target.value as any)}
                        className="px-3 py-1.5 bg-brand-card border border-brand-border/80 rounded-lg text-xs font-bold text-brand-text outline-none cursor-pointer"
                      >
                        <option value="QCM">QCM</option>
                        <option value="VRAI_FAUX">Vrai ou Faux</option>
                        <option value="TEXTE_LIBRE">Réponse libre</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-brand-card px-2.5 py-1 rounded-lg border border-brand-border/60">
                        <span className="text-[11px] font-bold text-brand-text-muted">Points :</span>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={q.points}
                          onChange={(e) => updateQuestionPoints(qIndex, parseFloat(e.target.value) || 1)}
                          className="w-12 bg-transparent text-xs font-black text-brand-accent text-center outline-none"
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

                  {/* Question Text */}
                  <div>
                    <textarea
                      rows={2}
                      value={q.text}
                      onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                      placeholder={`Énoncé de la question #${qIndex + 1}...`}
                      className="w-full px-3.5 py-2.5 bg-brand-card border border-brand-border/80 rounded-xl text-brand-text text-sm focus:border-brand-accent outline-none transition resize-none font-medium"
                    />
                  </div>

                  {/* Question Image Attachment Section */}
                  <div className="pt-2">
                    {q.imagePreview || q.imageUrl ? (
                      <div className="relative inline-block border border-brand-border/80 rounded-xl p-2 bg-brand-card group/img">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              q.imagePreview ||
                              (q.imageUrl?.startsWith('http') || q.imageUrl?.startsWith('/uploads')
                                ? q.imageUrl
                                : `/uploads/${q.imageUrl}`)
                            }
                            alt={`Schéma Question ${qIndex + 1}`}
                            className="w-24 h-20 object-cover rounded-lg border border-brand-border/60 bg-black/20"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('localhost:5000') && !target.src.startsWith('http')) {
                                target.src = `http://localhost:5000${q.imageUrl}`;
                              }
                            }}
                          />
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                              <ImageIcon className="w-4 h-4" />
                              <span>Image d'illustration attachée</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-bold text-brand-accent hover:underline cursor-pointer">
                                <span>Remplacer l'image</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleQuestionImageChange(qIndex, e.target.files?.[0] || null)}
                                />
                              </label>
                              <span className="text-brand-border">•</span>
                              <button
                                type="button"
                                onClick={() => removeQuestionImage(qIndex)}
                                className="text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-card hover:bg-brand-surface border border-dashed border-brand-border/90 hover:border-brand-accent/70 text-xs font-bold text-brand-text-muted hover:text-brand-accent transition cursor-pointer">
                        <ImageIcon className="w-4 h-4 text-brand-accent" />
                        <span>Ajouter une image / schéma d'illustration</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleQuestionImageChange(qIndex, e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>

                  {/* Options */}
                  {(q.type === 'QCM' || q.type === 'VRAI_FAUX') && (
                    <div className="space-y-2 pt-3 border-t border-brand-border/50">
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
                                ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/40'
                                : 'bg-brand-card text-brand-text-muted border-brand-border/60 hover:border-brand-accent/40'
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
                            disabled={q.type === 'VRAI_FAUX'}
                            className={`flex-1 px-3 py-2 bg-brand-card border rounded-xl text-xs font-semibold outline-none transition ${
                              opt.isCorrect ? 'border-brand-accent/50 text-brand-accent' : 'border-brand-border/80 text-brand-text'
                            }`}
                          />
                          {q.type === 'QCM' && q.options.length > 2 && (
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
                      {q.type === 'QCM' && (
                        <button
                          type="button"
                          onClick={() => addOption(qIndex)}
                          className="text-xs font-bold text-brand-accent hover:text-emerald-300 flex items-center gap-1 mt-2 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Ajouter une option
                        </button>
                      )}
                    </div>
                  )}

                  {/* Réponse attendue (TEXTE_LIBRE) */}
                  {q.type === 'TEXTE_LIBRE' && (
                    <div className="pt-3 border-t border-brand-border/50 space-y-1.5">
                      <label className="block text-xs font-bold text-brand-text-muted">
                        Réponse attendue ou éléments clés de correction (Optionnel)
                      </label>
                      <input
                        type="text"
                        value={q.correctAnswer || ''}
                        onChange={(e) => {
                          const updated = [...questions];
                          updated[qIndex].correctAnswer = e.target.value;
                          setQuestions(updated);
                        }}
                        placeholder="Ex: Formule mathématique ou mots-clés attendus..."
                        className="w-full px-3 py-2 bg-brand-card border border-brand-border/80 rounded-xl text-xs font-semibold text-brand-text outline-none focus:border-brand-accent"
                      />
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                className="w-full py-3 border-dashed border-brand-border hover:border-brand-accent text-brand-accent flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Ajouter une question suivante
              </Button>
            </div>
          </div>
        )}

        {/* Sticky Action Bar */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 p-4 bg-slate-900/95 backdrop-blur border border-brand-border/90 rounded-2xl shadow-2xl">
          <div className="text-xs text-slate-300 font-semibold hidden sm:block">
            {selectedChapter ? `Chapitre : ${selectedChapter.title}` : 'Sélectionnez un chapitre'}
          </div>

          <div className="flex items-center gap-3 ml-auto">
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
              disabled={loading || fetchingExercise}
              className="shadow-lg shadow-brand-accent/20 cursor-pointer"
            >
              {loading ? (exerciseId ? "Modification..." : "Création en cours...") : (exerciseId ? "Enregistrer les modifications" : "Enregistrer l'Exercice")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateExercisePage;
