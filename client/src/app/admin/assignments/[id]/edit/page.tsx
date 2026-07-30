import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, ArrowLeft, Plus, Trash2, Paperclip, X, CheckCircle2, FileText, LayoutList, Layers } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface NiveauModel {
  id: string;
  nom: string;
}

interface SubjectModel {
  id: string;
  name: string;
}

interface TermModel {
  id: string;
  name: string;
}

interface AcademicYearModel {
  id: string;
  name: string;
  terms: TermModel[];
}

interface OptionData {
  text: string;
  isCorrect: boolean;
}

interface QuestionData {
  text: string;
  type: string;
  points: number;
  options: OptionData[];
}

type FormData = {
  title: string;
  type: string;
  niveauId: string;
  subjectId: string;
  academicYearId: string;
  termId: string;
  dueDate: string;
  description: string;
  questions: QuestionData[];
};

export default function EditGlobalAssignmentPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const [niveaux, setNiveaux] = useState<NiveauModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [years, setYears] = useState<AcademicYearModel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [evaluationMethod, setEvaluationMethod] = useState<'FILE' | 'QUESTIONS' | 'BOTH'>('BOTH');

  const [files, setFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { 
      type: 'DEVOIR',
      questions: []
    }
  });

  const { fields: questions, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control,
    name: "questions"
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedNiveauId = watch("niveauId");

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchData = async () => {
        try {
          const [niveauxRes, yearsRes, assignmentRes] = await Promise.all([
            api.get('/niveaux'),
            api.get('/academic/years'),
            api.get(`/assignments/${id}`)
          ]);
          setNiveaux(niveauxRes.data);
          setYears(yearsRes.data);
          
          const assignment = assignmentRes.data;
          setExistingAttachments(assignment.attachments || []);
          
          const hasFiles = assignment.attachments && assignment.attachments.length > 0;
          const hasQuestions = assignment.questions && assignment.questions.length > 0;
          
          if (hasFiles && hasQuestions) setEvaluationMethod('BOTH');
          else if (hasQuestions) setEvaluationMethod('QUESTIONS');
          else if (hasFiles) setEvaluationMethod('FILE');
          else setEvaluationMethod('BOTH');

          reset({
            title: assignment.title,
            type: assignment.type,
            niveauId: assignment.niveauId,
            subjectId: assignment.subjectId || '',
            academicYearId: assignment.academicYearId || '',
            termId: assignment.termId || '',
            dueDate: new Date(assignment.dueDate).toISOString().slice(0, 16),
            description: assignment.description || '',
            questions: assignment.questions || []
          });

        } catch (error) {
          toast.error("Impossible de charger les données.");
          navigate('/admin/assignments');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isSuperAdmin, id, reset, navigate, toast]);

  useEffect(() => {
    if (selectedNiveauId) {
      const fetchSubjects = async () => {
        try {
          const res = await api.get(`/subjects?niveauId=${selectedNiveauId}`);
          setSubjects(res.data);
        } catch (error) {
          console.error("Error fetching subjects", error);
        }
      };
      fetchSubjects();
    } else {
      setSubjects([]);
    }
  }, [selectedNiveauId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (url: string) => {
    setExistingAttachments(prev => prev.filter(a => a !== url));
  };

  const onSubmitForm = async (data: FormData) => {
    setSubmitting(true);
    setFormError(null);
    try {
      let attachmentUrls: string[] = [...existingAttachments];
      
      const isFileEnabled = evaluationMethod === 'FILE' || evaluationMethod === 'BOTH';
      const isQuestionEnabled = evaluationMethod === 'QUESTIONS' || evaluationMethod === 'BOTH';

      if (!isFileEnabled) {
        attachmentUrls = [];
      } else if (files.length > 0) {
        for (const file of files) {
          const formData = new window.FormData();
          if (data.academicYearId) formData.append('academicYearId', data.academicYearId);
          if (data.termId) formData.append('termId', data.termId);

          files.forEach(f => {
            formData.append('attachments', f);
          });
          const uploadRes = await api.post('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          attachmentUrls.push(uploadRes.data.url);
        }
      }

      const payload = {
        title: data.title,
        type: data.type,
        niveauId: data.niveauId,
        subjectId: data.subjectId || null,
        academicYearId: data.academicYearId,
        termId: data.termId,
        dueDate: data.dueDate,
        description: data.description,
        attachments: attachmentUrls,
        questions: isQuestionEnabled ? data.questions : []
      };
      
      await api.put(`/assignments/${id}`, payload);
      toast.success("Évaluation mise à jour avec succès !");
      navigate('/admin/assignments');
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-red-500">Accès non autorisé.</div>;
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500 pb-32">
      <Button variant="ghost" onClick={() => navigate('/admin/assignments')} className="mb-4 text-brand-text-muted hover:text-brand-text">
        <ArrowLeft className="w-4 h-4 mr-2" /> Retour
      </Button>

      <PageHeader 
        title="Modifier l'Évaluation" 
        description="Mettez à jour les informations, fichiers et questions de cette évaluation globale."
        icon={<BookOpen className="w-8 h-8 text-brand-primary" />}
      />

      <div className="bg-brand-surface-card rounded-2xl border border-brand-border/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <form onSubmit={handleSubmit(onSubmitForm)} className="divide-y divide-brand-border/50">
            {formError && <div className="m-6 p-4 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium">{formError}</div>}
            
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-bold text-brand-text mb-4">Informations de base</h3>

            {/* Section Année Scolaire et Trimestre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-brand-surface border border-brand-border rounded-xl p-4 md:p-6 mb-6">
              {/* Année Scolaire */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">Année Scolaire <span className="text-red-500">*</span></label>
                <select
                  {...register("academicYearId", { required: "Ce champ est requis" })}
                  className={`w-full px-4 py-3 bg-brand-surface-card border ${errors.academicYearId ? 'border-red-500' : 'border-brand-border'} rounded-xl focus:ring-2 focus:ring-brand-primary/50 text-brand-text transition-colors`}
                >
                  <option value="">Sélectionner l'année scolaire</option>
                  {years.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
                {errors.academicYearId && <p className="mt-1 text-sm text-red-500">{errors.academicYearId.message}</p>}
              </div>

              {/* Trimestre / Semestre */}
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">Trimestre / Semestre <span className="text-red-500">*</span></label>
                <select
                  {...register("termId", { required: "Ce champ est requis" })}
                  disabled={!watch("academicYearId")}
                  className={`w-full px-4 py-3 bg-brand-surface-card border ${errors.termId ? 'border-red-500' : 'border-brand-border'} rounded-xl focus:ring-2 focus:ring-brand-primary/50 text-brand-text transition-colors disabled:opacity-50`}
                >
                  <option value="">Sélectionner la période</option>
                  {years.find(y => y.id === watch("academicYearId"))?.terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {errors.termId && <p className="mt-1 text-sm text-red-500">{errors.termId.message}</p>}
              </div>
            </div>
              
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1">Titre *</label>
                <input 
                  {...register('title', { required: true })} 
                  className="w-full p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all" 
                  placeholder="Ex: Examen Blanc de Mathématiques" 
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1">Type *</label>
                  <select {...register('type', { required: true })} className="w-full p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all">
                    <option value="DEVOIR">Devoir</option>
                    <option value="PROJET">Projet</option>
                    <option value="EXAMEN">Examen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1">Niveau Cible *</label>
                  <select {...register('niveauId', { required: true })} className="w-full p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all">
                    <option value="">Sélectionnez un niveau</option>
                    {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1">Matière *</label>
                  <select {...register('subjectId')} className="w-full p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all">
                    <option value="">Sélectionnez la matière</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {selectedNiveauId && subjects.length === 0 && (
                    <p className="text-xs text-brand-text-muted mt-1">Aucune matière affectée à ce niveau.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1">Date d'échéance / Date de l'examen *</label>
                  <input type="datetime-local" {...register('dueDate', { required: true })} className="w-full p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1">Consignes et Description détaillée</label>
                <textarea 
                  {...register('description')} 
                  rows={4} 
                  className="w-full p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  placeholder="Décrivez les consignes ici..."
                ></textarea>
              </div>
            </div>

            {/* Section: Méthode d'évaluation */}
            <div className="p-6 bg-slate-50/50">
              <label className="block text-sm font-bold text-brand-text mb-2">Méthode d'évaluation *</label>
              <select 
                value={evaluationMethod}
                onChange={(e) => setEvaluationMethod(e.target.value as any)}
                className="w-full p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
              >
                <option value="FILE">Fichier Joint Uniquement (L'élève télécharge un document)</option>
                <option value="QUESTIONS">Questionnaire Uniquement (L'élève répond sur la plateforme)</option>
                <option value="BOTH">Les Deux (Fichier + QCM / Questions ouvertes)</option>
              </select>
            </div>

            {(evaluationMethod === 'FILE' || evaluationMethod === 'BOTH') && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-brand-text">Fichiers Joints</h3>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} leftIcon={<Paperclip className="w-4 h-4" />}>
                  Ajouter des fichiers
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {existingAttachments.map((url, index) => (
                  <div key={`existing-${index}`} className="flex items-center gap-2 bg-brand-surface px-3 py-2 rounded-lg border border-brand-border">
                    <span className="text-sm font-medium text-brand-text max-w-[200px] truncate">{url.split('/').pop()}</span>
                    <button type="button" onClick={() => removeExistingAttachment(url)} className="text-brand-text-muted hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {files.map((file, index) => (
                  <div key={`new-${index}`} className="flex items-center gap-2 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/30">
                    <span className="text-sm font-medium text-green-700 max-w-[200px] truncate">{file.name} (nouveau)</span>
                    <button type="button" onClick={() => removeFile(index)} className="text-green-700 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {existingAttachments.length === 0 && files.length === 0 && (
                  <p className="text-sm text-brand-text-muted italic w-full">Aucun fichier joint pour le moment.</p>
                )}
              </div>
            </div>
          )}

            {(evaluationMethod === 'QUESTIONS' || evaluationMethod === 'BOTH') && (
              <div className="p-6 bg-slate-50/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-brand-text">Questionnaire intégré (Optionnel)</h3>
                    <p className="text-sm text-brand-text-muted">Ajoutez des questions QCM ou ouvertes à votre devoir.</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="glow" 
                    size="sm" 
                    onClick={() => appendQuestion({ text: '', type: 'MULTIPLE_CHOICE', points: 1, options: [{text: '', isCorrect: false}] })}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Ajouter une question
                  </Button>
                </div>

                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div key={question.id} className="bg-white p-5 rounded-xl border border-brand-border shadow-sm relative group">
                      <button type="button" onClick={() => removeQuestion(index)} className="absolute top-4 right-4 p-2 text-brand-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="grid md:grid-cols-[1fr_200px_100px] gap-4 mb-4 pr-12">
                        <div>
                          <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Question {index + 1}</label>
                          <div className="bg-white [&_.ql-container]:min-h-[100px] [&_.ql-container]:text-base [&_.ql-editor]:text-brand-text">
                            <Controller
                              name={`questions.${index}.text` as const}
                              control={control}
                              rules={{ required: true }}
                              render={({ field }) => (
                                <ReactQuill 
                                  theme="snow" 
                                  value={field.value} 
                                  onChange={field.onChange}
                                  placeholder="Rédigez votre question ici..."
                                  modules={{
                                    toolbar: [
                                      ['bold', 'italic', 'underline'],
                                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                      ['clean']
                                    ]
                                  }}
                                />
                              )}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Type</label>
                          <select {...register(`questions.${index}.type` as const)} className="w-full p-2.5 bg-brand-surface border border-brand-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary">
                            <option value="MULTIPLE_CHOICE">QCM (Choix Multiple)</option>
                            <option value="OPEN">Question Ouverte</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Points</label>
                          <input 
                            type="number"
                            {...register(`questions.${index}.points` as const, { required: true, valueAsNumber: true })}
                            className="w-full p-2.5 bg-brand-surface border border-brand-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          />
                        </div>
                      </div>

                      <QuestionOptions control={control} register={register} questionIndex={index} questionType={watch(`questions.${index}.type`)} />
                    </div>
                  ))}
                  
                  {questions.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-brand-border rounded-xl">
                      <p className="text-sm font-medium text-brand-text-muted">Aucune question n'a été ajoutée.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-6 bg-brand-surface flex justify-end gap-4 border-t border-brand-border">
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/assignments')} disabled={submitting}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" isLoading={submitting} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Enregistrer les modifications
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function QuestionOptions({ control, register, questionIndex, questionType }: { control: any, register: any, questionIndex: number, questionType: string }) {
  const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`
  });

  if (questionType === 'OPEN') {
    return (
      <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-brand-text-muted italic">Les questions ouvertes n'ont pas d'options prédéfinies. L'élève répondra par texte.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 pl-4 border-l-2 border-brand-primary/20 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Options de réponse</h4>
        <button type="button" onClick={() => appendOption({ text: '', isCorrect: false })} className="text-xs text-brand-primary font-bold hover:underline">
          + Ajouter une option
        </button>
      </div>
      
      {options.map((option, optIndex) => (
        <div key={option.id} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              {...register(`questions.${questionIndex}.options.${optIndex}.isCorrect` as const)}
              className="w-4 h-4 text-brand-primary bg-brand-surface border-brand-border rounded focus:ring-brand-primary focus:ring-2"
              title="Cocher si c'est une bonne réponse"
            />
          </div>
          <input 
            {...register(`questions.${questionIndex}.options.${optIndex}.text` as const, { required: true })}
            placeholder={`Option ${optIndex + 1}`}
            className="flex-1 p-2 text-sm bg-brand-surface border border-brand-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button type="button" onClick={() => removeOption(optIndex)} className="p-2 text-brand-text-muted hover:text-red-500 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
