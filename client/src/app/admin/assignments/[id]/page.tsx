import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, ArrowLeft, Paperclip, CheckCircle2, Clock, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface AssignmentData {
  id: string;
  title: string;
  type: string;
  niveauId: string;
  niveau?: { id: string, nom: string };
  subjectId?: string;
  subject?: { id: string, name: string };
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchData = async () => {
        try {
          const res = await api.get(`/assignments/${id}`);
          setAssignment(res.data);
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
              <p className="text-sm font-bold text-brand-text-muted uppercase tracking-wider mb-1">Niveau Cible</p>
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

      </div>
    </div>
  );
}
