import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, ArrowLeft, Paperclip, CheckCircle2, Clock, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Download } from 'lucide-react';

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
  niveau?: { id: string, nom: string };
  subjectId?: string;
  subject?: { id: string, name: string };
  academicYear?: { id: string; name: string };
  term?: { id: string; name: string };
  dueDate: string;
  description: string;
  published: boolean;
  attachments: string[];
  questions: {
    id: string;
    text: string;
    type: string;
    points: number;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
    }[];
  }[];
}

export default function GlobalAssignmentDetailsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [participants, setParticipants] = useState<ParticipantModel[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const [gradingParticipant, setGradingParticipant] = useState<ParticipantModel | null>(null);
  const [gradeValue, setGradeValue] = useState<string>('');
  const [gradeComment, setGradeComment] = useState<string>('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchData = async () => {
        try {
          const res = await api.get(`/assignments/${id}`);
          setAssignment(res.data);
          
          // Load classes for filtering
          const classRes = await api.get('/classes');
          setClasses(classRes.data);
        } catch (error) {
          toast.error("Impossible de charger les données de l'évaluation.");
          navigate('/admin/assignments');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isSuperAdmin, id, navigate, toast]);

  const fetchParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const url = selectedClass ? `/assignments/${id}/participants?classId=${selectedClass}` : `/assignments/${id}/participants`;
      const res = await api.get(url);
      setParticipants(res.data);
    } catch (error) {
      toast.error("Erreur lors de la récupération des participants");
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    if (assignment && assignment.published && new Date(assignment.dueDate) < new Date()) {
      fetchParticipants();
    }
  }, [assignment?.published, assignment?.dueDate, selectedClass]);

  const handleGradeSubmit = async () => {
    if (!gradingParticipant || !gradeValue) return;
    try {
      setIsSubmittingGrade(true);
      await api.post(`/assignments/${id}/grade`, {
        studentId: gradingParticipant.id,
        value: Number(gradeValue),
        comment: gradeComment
      });
      toast.success("Note enregistrée avec succès");
      setGradingParticipant(null);
      fetchParticipants(); // Refresh the list
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la note");
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const openGradeModal = (participant: ParticipantModel) => {
    setGradingParticipant(participant);
    const existingSubmission = participant.submissions[0];
    if (existingSubmission?.grade) {
      setGradeValue(existingSubmission.grade.value.toString());
      setGradeComment(existingSubmission.grade.comment || '');
    } else {
      setGradeValue('');
      setGradeComment('');
    }
  };

  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-red-500">Accès non autorisé.</div>;
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500 pb-32">
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
      </div>
    );
  }

  if (!assignment) return null;

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500 pb-32">
      <Button variant="ghost" onClick={() => navigate('/admin/assignments')} className="mb-4 text-brand-text-muted hover:text-brand-text">
        <ArrowLeft className="w-4 h-4 mr-2" /> Retour
      </Button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Détails de l'Évaluation" 
          description="Consultez les informations, fichiers et questions de cette évaluation globale."
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

      <div className="bg-brand-surface-card rounded-2xl border border-brand-border/50 shadow-sm overflow-hidden">
        
        <div className="p-6 space-y-6">
          <h3 className="text-lg font-bold text-brand-text mb-4">Informations de base</h3>
          
          <div className="grid md:grid-cols-2 gap-y-6 gap-x-12">
            <div>
              <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Titre</p>
              <p className="text-brand-text font-medium text-lg">{assignment.title}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Type</p>
              <p className="text-brand-text font-medium">{assignment.type}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Niveau Scolaire</p>
              <p className="text-brand-text font-medium">{assignment.niveau?.nom || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Matière</p>
              <p className="text-brand-text font-medium">{assignment.subject?.name || '-'}</p>
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
              <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-2">Consignes et Description</p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-brand-text whitespace-pre-wrap">
                {assignment.description}
              </div>
            </div>
          )}
        </div>

        {(!assignment.questions || assignment.questions.length === 0 || (assignment.attachments && assignment.attachments.length > 0)) && (
          <div className="p-6 border-t border-brand-border/50">
            <h3 className="text-lg font-bold text-brand-text mb-4">Fichiers Joints</h3>
            
            <div className="flex flex-wrap gap-3">
              {assignment.attachments && assignment.attachments.length > 0 ? (
                assignment.attachments.map((url, index) => (
                  <a 
                    key={index}
                    href={`${import.meta.env.VITE_API_URL}${url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-brand-surface px-4 py-3 rounded-lg border border-brand-border hover:border-brand-primary transition-colors group cursor-pointer"
                  >
                    <Paperclip className="w-5 h-5 text-brand-text-muted group-hover:text-brand-primary transition-colors" />
                    <span className="text-sm font-medium text-brand-text max-w-[250px] truncate group-hover:text-brand-primary transition-colors">
                      {url.split('/').pop()}
                    </span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-brand-text-muted italic w-full">Aucun fichier joint pour cette évaluation.</p>
              )}
            </div>
          </div>
        )}

        {/* Action Button: Ajouter la correction */}
        <div className="p-6 border-t border-brand-border/50 bg-brand-surface/30">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/admin/assignments/${assignment.id}/edit`)} 
            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
          >
            <Paperclip className="w-4 h-4 mr-2" />
            Ajouter une correction
          </Button>
        </div>

        {(!assignment.attachments || assignment.attachments.length === 0 || (assignment.questions && assignment.questions.length > 0)) && (
          <div className="p-6 border-t border-brand-border/50 bg-slate-50/50">
            <h3 className="text-lg font-bold text-brand-text mb-6">Questionnaire intégré</h3>

            <div className="space-y-6">
              {assignment.questions && assignment.questions.length > 0 ? (
                assignment.questions.map((question, index) => (
                  <div key={question.id} className="bg-white p-6 rounded-xl border border-brand-border shadow-sm">
                    
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase tracking-wider mb-2">
                          Question {index + 1}
                        </span>
                        <div 
                          className="text-lg font-medium text-brand-text prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: question.text }}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold uppercase">
                          {question.type === 'MULTIPLE_CHOICE' ? 'QCM' : 'Ouverte'}
                        </span>
                        <span className="text-sm font-bold text-brand-text-muted">
                          {question.points} point{question.points > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {question.type === 'MULTIPLE_CHOICE' && question.options && question.options.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {question.options.map((opt, optIndex) => (
                          <div 
                            key={opt.id} 
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              opt.isCorrect 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-brand-surface border-brand-border'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                              opt.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                            }`}>
                              {opt.isCorrect && <Check className="w-3 h-3" />}
                            </div>
                            <span className={`text-sm ${opt.isCorrect ? 'font-medium text-green-900' : 'text-brand-text'}`}>
                              {opt.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === 'OPEN' && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                        <p className="text-sm text-brand-text-muted italic">Espace de réponse libre pour l'élève.</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-brand-border rounded-xl bg-white">
                  <p className="text-sm font-medium text-brand-text-muted">Aucune question n'a été ajoutée à ce questionnaire.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Participants & Correction Section */}
      {assignment.published && new Date(assignment.dueDate) < new Date() && (
        <div className="bg-brand-surface-card rounded-2xl border border-brand-border/50 p-6 shadow-sm mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-brand-text flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2 text-blue-500" />
              Liste des participants & Correction
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
            <p className="text-brand-text-muted text-center italic py-8">Aucun participant trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border/50 text-brand-text-muted text-sm">
                    <th className="py-3 px-4 font-semibold">Élève</th>
                    <th className="py-3 px-4 font-semibold">Classe</th>
                    <th className="py-3 px-4 font-semibold">Statut Rendu</th>
                    <th className="py-3 px-4 font-semibold">Note</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map(p => {
                    const submission = p.submissions[0];
                    const hasSubmitted = submission && submission.content !== 'NON_RENDU';
                    const grade = submission?.grade;
                    
                    return (
                      <tr key={p.id} className="border-b border-brand-border/30 hover:bg-brand-surface/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm">
                                {p.firstName[0]}
                              </div>
                            )}
                            <div className="font-medium text-brand-text">{p.firstName} {p.lastName}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-brand-text-muted text-sm">
                          {p.enrollments[0]?.class?.name || '-'}
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 font-medium text-brand-text">
                          {grade ? (
                            <span className="text-blue-500">{grade.value} pts</span>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => openGradeModal(p)}>
                            {grade ? 'Modifier note' : 'Corriger'}
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

      {/* Grading Modal */}
      {gradingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-brand-text mb-2">
              Correction : {gradingParticipant.firstName} {gradingParticipant.lastName}
            </h3>
            
            {gradingParticipant.submissions[0] && gradingParticipant.submissions[0].content !== 'NON_RENDU' ? (
              <div className="mb-6 bg-brand-surface-card p-4 rounded-xl border border-brand-border">
                <p className="text-sm font-medium text-brand-text-muted mb-2">Contenu du rendu :</p>
                {gradingParticipant.submissions[0].fileUrl ? (
                  <a href={gradingParticipant.submissions[0].fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-primary hover:underline font-medium">
                    <Download className="w-4 h-4" />
                    Télécharger la pièce jointe
                  </a>
                ) : (
                  <div className="text-brand-text text-sm whitespace-pre-wrap">
                    {gradingParticipant.submissions[0].content}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-sm">
                Cet élève n'a pas rendu son devoir. Vous pouvez lui attribuer une note (ex: 0).
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1">Note (Points)</label>
                <input
                  type="number"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-brand-surface-card border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-primary/50 text-brand-text"
                  placeholder="Ex: 15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1">Commentaire de correction (Optionnel)</label>
                <textarea
                  value={gradeComment}
                  onChange={(e) => setGradeComment(e.target.value)}
                  className="w-full px-4 py-2.5 bg-brand-surface-card border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-primary/50 text-brand-text min-h-[100px]"
                  placeholder="Appréciation, conseils..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setGradingParticipant(null)} disabled={isSubmittingGrade}>
                Annuler
              </Button>
              <Button onClick={handleGradeSubmit} disabled={isSubmittingGrade || !gradeValue}>
                {isSubmittingGrade ? 'Enregistrement...' : 'Enregistrer la note'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
