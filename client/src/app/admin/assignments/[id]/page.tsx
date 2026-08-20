import { useState, useEffect, useRef } from 'react';
import api, { getFileUrl } from '@/lib/api';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, ArrowLeft, Paperclip, CheckCircle2, Clock, Check, XCircle, Download, Save, Users, FileText, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface ParticipantModel {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  enrollments: { class: { id: string, name: string } }[];
  submissions: {
    id: string;
    submittedAt: string;
    content: string;
    fileUrl?: string;
    grade?: { id: string, value: number, comment?: string };
  }[];
}

interface ClassModel {
  id: string;
  name: string;
}

interface AssignmentData {
  id: string;
  title: string;
  type: string;
  niveauId: string;
  niveau?: { id: string; nom: string; name?: string };
  subjectId?: string;
  subject?: { id: string, name: string };
  academicYear?: { id: string; name: string };
  term?: { id: string; name: string };
  courseId?: string;
  course?: { id: string; subject?: { name: string }; niveau?: { nom: string } };
  dueDate: string;
  description: string;
  published: boolean;
  attachments: string[];
  correctionUrl?: string;
  questions: {
    id: string;
    text: string;
    type: string;
    points: number;
    expectedAnswer?: string;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
    }[];
  }[];
}

export default function GlobalAssignmentDetailsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canAccess = user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR' || user?.role === 'ENSEIGNANT' || user?.role === 'EDUCATEUR';
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [participants, setParticipants] = useState<ParticipantModel[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'INFO' | 'PARTICIPANTS'>('INFO');

  // Inline grading
  const [inlineGrades, setInlineGrades] = useState<Record<string, { value: string, comment: string }>>({});
  const [savingGradeId, setSavingGradeId] = useState<string | null>(null);

  // Correction
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCorrection, setUploadingCorrection] = useState(false);
  
  // Quiz correction state: array of updated questions
  const [quizCorrection, setQuizCorrection] = useState<any[]>([]);
  const [savingQuiz, setSavingQuiz] = useState(false);

  const getListPath = () => {
    if (user?.role === 'SUPER_ADMIN') return '/admin/assignments';
    if (user?.role === 'DIRECTEUR') return '/directeur/assignments';
    if (user?.role === 'ENSEIGNANT') return '/enseignant/assignments';
    if (user?.role === 'EDUCATEUR') return '/educateur/evaluations';
    return '/assignments';
  };

  const handleBack = () => {
    if (location.state?.from && (location.state.from.includes('courses') || location.state.from.includes('tab=ASSIGNMENTS'))) {
      navigate(location.state.from);
      return;
    }

    const targetCourseId = (assignment as any)?.courseId || (assignment as any)?.course?.id;
    if (targetCourseId) {
      const courseBase = user?.role === 'SUPER_ADMIN' ? '/admin/courses' : user?.role === 'DIRECTEUR' ? '/directeur/courses' : user?.role === 'ENSEIGNANT' ? '/enseignant/courses' : user?.role === 'EDUCATEUR' ? '/educateur/courses' : '/courses';
      navigate(`${courseBase}/${targetCourseId}?tab=ASSIGNMENTS`);
      return;
    }

    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }

    navigate(getListPath());
  };

  useEffect(() => {
    if (canAccess) {
      const fetchData = async () => {
        try {
          const res = await api.get(`/assignments/${id}`);
          setAssignment(res.data);
          
          if (res.data.published) {
            setActiveTab('PARTICIPANTS');
          }
          
          if (res.data.questions) {
            // Initialize quiz correction state
            const initialQuizState = res.data.questions.map((q: any) => ({
              id: q.id,
              type: q.type,
              expectedAnswer: q.expectedAnswer || '',
              options: q.options?.map((o: any) => ({ id: o.id, isCorrect: o.isCorrect })) || []
            }));
            setQuizCorrection(initialQuizState);
          }

          // Load classes for filtering
          const classRes = await api.get('/classes');
          setClasses(classRes.data);
        } catch (error) {
          toast.error("Impossible de charger les données de l'évaluation.");
          navigate(getListPath());
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [canAccess, id, navigate, toast]);

  const fetchParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const url = selectedClass ? `/assignments/${id}/participants?classId=${selectedClass}` : `/assignments/${id}/participants`;
      const res = await api.get(url);
      setParticipants(res.data);
      
      // Initialize inline grades state
      const initialGrades: Record<string, { value: string, comment: string }> = {};
      res.data.forEach((p: ParticipantModel) => {
        if (p.submissions[0]?.grade) {
          initialGrades[p.id] = {
            value: p.submissions[0].grade.value.toString(),
            comment: p.submissions[0].grade.comment || ''
          };
        } else {
          initialGrades[p.id] = { value: '', comment: '' };
        }
      });
      setInlineGrades(initialGrades);
    } catch (error) {
      toast.error("Erreur lors de la récupération des participants");
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    if (assignment && assignment.published && activeTab === 'PARTICIPANTS') {
      fetchParticipants();
    }
  }, [assignment?.published, selectedClass, activeTab]);

  const handleInlineGradeChange = (studentId: string, field: 'value' | 'comment', val: string) => {
    setInlineGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: val }
    }));
  };

  const saveInlineGrade = async (participantId: string) => {
    const gradeData = inlineGrades[participantId];
    if (!gradeData || !gradeData.value) return;
    
    try {
      setSavingGradeId(participantId);
      await api.post(`/assignments/${id}/grade`, {
        studentId: participantId,
        value: Number(gradeData.value),
        comment: gradeData.comment
      });
      toast.success("Note enregistrée");
      // Optionally re-fetch participants, but local state is already ok.
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la note");
    } finally {
      setSavingGradeId(null);
    }
  };

  const handleCorrectionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingCorrection(true);
      const res = await api.post(`/assignments/${id}/correction-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Fichier de correction ajouté avec succès");
      setAssignment(prev => prev ? { ...prev, correctionUrl: res.data.correctionUrl } : null);
    } catch (error) {
      toast.error("Erreur lors de l'ajout de la correction");
    } finally {
      setUploadingCorrection(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQuizOptionChange = (questionId: string, optionId: string) => {
    setQuizCorrection(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map((o: any) => ({ ...o, isCorrect: o.id === optionId }))
        };
      }
      return q;
    }));
  };

  const handleQuizExpectedAnswerChange = (questionId: string, value: string) => {
    setQuizCorrection(prev => prev.map(q => q.id === questionId ? { ...q, expectedAnswer: value } : q));
  };

  const saveQuizCorrection = async () => {
    try {
      setSavingQuiz(true);
      await api.put(`/assignments/${id}/correction-quiz`, { questions: quizCorrection });
      toast.success("Correction du questionnaire enregistrée");
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la correction");
    } finally {
      setSavingQuiz(false);
    }
  };

  if (!canAccess) {
    return <div className="p-8 text-center text-red-500">Accès non autorisé.</div>;
  }

  if (loading || !assignment) {
    return (
      <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500 pb-32">
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500 pb-32">
      <Button variant="ghost" onClick={handleBack} className="mb-4 text-brand-text-muted hover:text-brand-text cursor-pointer">
        <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux évaluations du cours
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title={assignment.title}
          description={`${assignment.type} - ${assignment.niveau?.nom || ''}`}
          icon={<BookOpen className="w-8 h-8 text-brand-primary" />}
        />
        
        <div>
          {assignment.published ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-500 border border-green-500/20">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Publié
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              <Clock className="w-4 h-4 mr-2" /> Brouillon
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-brand-surface p-1 rounded-xl border border-brand-border/50">
        <button
          onClick={() => setActiveTab('INFO')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'INFO'
              ? 'bg-white text-brand-primary shadow-sm'
              : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-card/50'
          }`}
        >
          <FileText className="w-4 h-4" /> Informations & Sujet
        </button>
        <button
          onClick={() => setActiveTab('PARTICIPANTS')}
          disabled={!assignment.published}
          className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            !assignment.published ? 'opacity-50 cursor-not-allowed' :
            activeTab === 'PARTICIPANTS'
              ? 'bg-white text-brand-primary shadow-sm'
              : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-card/50'
          }`}
        >
          <Users className="w-4 h-4" /> Participants & Notes {!assignment.published && '(Non publié)'}
        </button>
      </div>

      {activeTab === 'INFO' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-brand-surface-card rounded-2xl border border-brand-border/50 shadow-sm overflow-hidden">
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-bold text-brand-text mb-4">Informations de base</h3>
              
              <div className="grid md:grid-cols-2 gap-y-6 gap-x-12">
                <div>
                  <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Matière</p>
                  <p className="text-brand-text font-medium">{assignment.subject?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Niveau</p>
                  <p className="text-brand-text font-medium">{assignment.niveau?.nom || assignment.niveau?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Date d'échéance</p>
                  <p className="text-brand-text font-medium">
                    {new Date(assignment.dueDate).toLocaleString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Année Scolaire</p>
                  <p className="text-brand-text font-medium">{assignment.academicYear?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Trimestre / Semestre</p>
                  <p className="text-brand-text font-medium">{assignment.term?.name || '-'}</p>
                </div>
              </div>

              {assignment.description && (
                <div className="mt-6">
                  <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-2">Consignes</p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-brand-text whitespace-pre-wrap">
                    {assignment.description}
                  </div>
                </div>
              )}
            </div>

            {(!assignment.questions || assignment.questions.length === 0 || (assignment.attachments && assignment.attachments.length > 0)) && (
              <div className="p-6 border-t border-brand-border/50">
                <h3 className="text-lg font-bold text-brand-text mb-4">Fichiers Joints & Corrigé</h3>
                
                <div className="space-y-4">
                  {assignment.attachments && assignment.attachments.length > 0 ? (
                    assignment.attachments.map((url, index) => (
                      <a 
                        key={index}
                        href={getFileUrl(url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 bg-brand-surface px-4 py-3 rounded-lg border border-brand-border hover:border-brand-primary transition-colors inline-flex"
                      >
                        <Paperclip className="w-5 h-5 text-brand-text-muted" />
                        <span className="text-sm font-medium text-brand-text">{url.split('/').pop()}</span>
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-brand-text-muted italic">Aucun fichier joint.</p>
                  )}
                </div>

                <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                  <h4 className="text-sm font-bold text-blue-900 mb-3">Fichier de correction</h4>
                  {assignment.correctionUrl ? (
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                      <a href={getFileUrl(assignment.correctionUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium">
                        <Download className="w-4 h-4" /> Télécharger le corrigé actuel
                      </a>
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={uploadingCorrection}>
                        Remplacer
                      </Button>
                    </div>
                  ) : (
                    <Button variant="primary" onClick={() => fileInputRef.current?.click()} isLoading={uploadingCorrection}>
                      <Upload className="w-4 h-4 mr-2" /> Ajouter la correction (Fichier)
                    </Button>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleCorrectionUpload} />
                </div>
              </div>
            )}

            {(!assignment.attachments || assignment.attachments.length === 0 || (assignment.questions && assignment.questions.length > 0)) && (
              <div className="p-6 border-t border-brand-border/50 bg-slate-50/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-brand-text">Questionnaire & Éléments de Correction</h3>
                  {(isSuperAdmin || (!assignment.type.startsWith('COMPOSITION') && !assignment.type.startsWith('COMPO') && assignment.type !== 'DEVOIR_NIVEAU')) && (
                    <Button variant="primary" onClick={saveQuizCorrection} isLoading={savingQuiz}>
                      <Save className="w-4 h-4 mr-2" /> Enregistrer la correction
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                  {assignment.questions && assignment.questions.length > 0 ? (
                    assignment.questions.map((question, index) => {
                      const qState = quizCorrection.find(q => q.id === question.id);
                      return (
                        <div key={question.id} className="bg-white p-6 rounded-xl border border-brand-border shadow-sm">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase tracking-wider mb-2">
                                Question {index + 1}
                              </span>
                              <div className="text-base font-medium text-brand-text prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: question.text }} />
                            </div>
                            <span className="text-sm font-bold text-brand-text-muted whitespace-nowrap">{question.points} pt{question.points > 1 ? 's' : ''}</span>
                          </div>

                          <div className="mt-4 p-4 bg-brand-surface rounded-lg border border-brand-border/50">
                            <h4 className="text-xs font-bold text-brand-text-muted uppercase mb-3">Définir la bonne réponse</h4>
                            
                            {question.type === 'MULTIPLE_CHOICE' && question.options && (
                              <div className="space-y-2">
                                {question.options.map(opt => {
                                  const isChecked = qState?.options.find((o: any) => o.id === opt.id)?.isCorrect;
                                  return (
                                    <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-green-50 border-green-200' : 'bg-white border-brand-border hover:bg-slate-50'}`}>
                                      <input 
                                        type="radio" 
                                        name={`q-${question.id}`} 
                                        checked={isChecked || false}
                                        onChange={() => handleQuizOptionChange(question.id, opt.id)}
                                        className="w-4 h-4 text-green-600 focus:ring-green-500" 
                                      />
                                      <span className={`text-sm ${isChecked ? 'font-medium text-green-900' : 'text-brand-text'}`}>{opt.text}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {question.type === 'OPEN' && (
                              <div className="space-y-2">
                                <textarea
                                  value={qState?.expectedAnswer || ''}
                                  onChange={(e) => handleQuizExpectedAnswerChange(question.id, e.target.value)}
                                  placeholder="Saisissez la réponse attendue ou les éléments de correction pour cette question..."
                                  className="w-full p-3 bg-white border border-brand-border rounded-lg text-sm text-brand-text focus:ring-2 focus:ring-brand-primary min-h-[100px]"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-sm text-brand-text-muted">Aucune question.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'PARTICIPANTS' && (
        <div className="bg-brand-surface-card rounded-2xl border border-brand-border/50 p-6 shadow-sm animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-brand-text flex items-center">
              Participants & Saisie des Notes
            </h2>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-sm"
            >
              <option value="">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {loadingParticipants ? (
            <div className="flex justify-center p-8"><div className="w-6 h-6 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : participants.length === 0 ? (
            <p className="text-brand-text-muted text-center italic py-8">Aucun participant trouvé pour cette évaluation.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border/50 text-brand-text-muted text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Élève</th>
                    <th className="py-3 px-4 font-bold">Classe</th>
                    <th className="py-3 px-4 font-bold">Statut</th>
                    <th className="py-3 px-4 font-bold">Note / Commentaire</th>
                    <th className="py-3 px-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map(p => {
                    const submission = p.submissions[0];
                    const hasSubmitted = submission && submission.content !== 'NON_RENDU';
                    const gradeState = inlineGrades[p.id] || { value: '', comment: '' };
                    const isSaving = savingGradeId === p.id;
                    
                    return (
                      <tr key={p.id} className="border-b border-brand-border/30 hover:bg-brand-surface/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm">
                                {p.firstName[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-brand-text text-sm">{p.firstName} {p.lastName}</div>
                              {hasSubmitted && submission.fileUrl && (
                                <a href={getFileUrl(submission.fileUrl)} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center mt-1">
                                  <Download className="w-3 h-3 mr-1" /> Voir la copie
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-brand-text-muted text-sm">
                          {p.enrollments[0]?.class?.name || '-'}
                        </td>
                        <td className="py-4 px-4">
                          {hasSubmitted ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                              <Check className="w-3 h-3 mr-1" /> Rendu
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                              <XCircle className="w-3 h-3 mr-1" /> Non rendu
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={gradeState.value}
                              onChange={(e) => handleInlineGradeChange(p.id, 'value', e.target.value)}
                              placeholder="Note"
                              className="w-20 px-2 py-1.5 text-sm bg-white border border-brand-border rounded-md focus:ring-2 focus:ring-brand-primary"
                            />
                            <span className="text-sm font-medium text-brand-text-muted">/ {assignment.questions?.reduce((acc, q) => acc + q.points, 0) || 20}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={() => saveInlineGrade(p.id)}
                            isLoading={isSaving}
                            disabled={!gradeState.value}
                          >
                            <Save className="w-4 h-4 mr-1" /> Enregistrer
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
