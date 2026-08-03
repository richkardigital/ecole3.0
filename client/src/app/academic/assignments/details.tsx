import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { getFileUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { Upload, CheckCircle, Clock, User, Award, FileText } from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface AssignmentModel {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  course?: {
    id?: string;
    subject?: { name: string };
    class?: { name: string };
  };
  subject?: { name: string };
  niveau?: { name: string };
  submissions?: {
    id: string;
    content?: string;
    fileUrl?: string;
    createdAt: string;
    grade?: {
        value: number;
        comment?: string;
    }
  }[];
}

interface SubmissionModel {
    id: string;
    content?: string;
    fileUrl?: string;
    createdAt: string;
    student: {
        firstName: string;
        lastName: string;
        email: string;
    };
    grade?: {
        value: number;
        comment?: string;
    };
}

const AssignmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentModel | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionModel[]>([]);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<File | null>(null);
  const { toast, success, error: toastError } = useToast();

  const { register: registerSubmit, handleSubmit: handleSubmitSubmit, reset: resetSubmit } = useForm();
  const { register: registerGrade, handleSubmit: handleSubmitGrade, reset: resetGrade } = useForm();

  const isTeacher = user?.role === 'ENSEIGNANT' || user?.role === 'DIRECTEUR';

  // Helper to extract file link from description
  const getAssignmentFile = (desc?: string) => {
    if (!desc) return null;
    const match = desc.match(/\[Télécharger le fichier joint\]\((.*?)\)/);
    return match ? match[1] : null;
  };

  const cleanDescription = (desc?: string) => {
      if (!desc) return "Aucune description.";
      return desc.replace(/\[Télécharger le fichier joint\]\(.*?\)/, '').trim() || "Aucune description.";
  };

  const fetchAssignment = async () => {
    try {
      const response = await api.get(`/assignments/${id}`);
      setAssignment(response.data);
      
      if (isTeacher) {
          const subsResponse = await api.get(`/assignments/${id}/submissions`);
          setSubmissions(subsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching assignment', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAssignment();
    }
  }, [id]);

  const onSubmitWork = async (data: any) => {
    try {
      const formData = new FormData();
      formData.append('content', data.content || '');
      
      if (voiceNote) {
          formData.append('file', voiceNote);
      } else if (data.file && data.file[0]) {
          formData.append('file', data.file[0]);
      } else if (data.fileUrl) {
          formData.append('fileUrl', data.fileUrl);
      }

      await api.post(`/assignments/${id}/submit`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsSubmitModalOpen(false);
      resetSubmit();
      setVoiceNote(null);
      fetchAssignment();
      success("Devoir rendu avec succès");
    } catch (error) {
      console.error('Error submitting work', error);
      toastError("Erreur lors de la soumission du devoir");
    }
  };

  const onGradeWork = async (data: any) => {
      if (!selectedSubmissionId) return;
      try {
          await api.post(`/assignments/submissions/${selectedSubmissionId}/grade`, {
              value: parseFloat(data.value),
              comment: data.comment
          });
          setIsGradeModalOpen(false);
          resetGrade();
          fetchAssignment(); // Refresh to show updated grades
          success("Note attribuée avec succès");
      } catch (error) {
          console.error("Error grading work", error);
          toastError("Erreur lors de l'attribution de la note");
      }
  }

  const openGradeModal = (submissionId: string) => {
      setSelectedSubmissionId(submissionId);
      setIsGradeModalOpen(true);
  }

  if (!assignment) return <div className="p-6">Chargement...</div>;

  const mySubmission = assignment.submissions?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={assignment.title}
        subtitle={
          <div className="flex items-center gap-4 mt-2">
            <span className="bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2 py-1 rounded text-xs font-bold uppercase">
              {assignment.course?.subject?.name || assignment.subject?.name || assignment.niveau?.name || "Devoir"}
            </span>
            <span className="flex items-center gap-1 text-sm text-brand-text-muted">
              <Clock className="w-4 h-4" />
              Pour le {new Date(assignment.dueDate).toLocaleDateString()}
            </span>
          </div>
        }
        icon={<FileText className="w-6 h-6 text-brand-accent" />}
      />

      <div className="bg-brand-card p-6 rounded-xl shadow-sm border border-brand-border/50 mb-6">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
                <p className="text-brand-text leading-relaxed whitespace-pre-wrap mb-4">
                    {cleanDescription(assignment.description)}
                </p>
                {getAssignmentFile(assignment.description) && (
                    <a 
                        href={getFileUrl(getAssignmentFile(assignment.description)!)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-brand-sidebar border border-brand-border/50 text-brand-accent px-4 py-2 rounded-lg hover:bg-brand-accent/10 transition"
                    >
                        <FileText className="w-5 h-5" />
                        Télécharger le sujet du devoir
                    </a>
                )}
            </div>
            
            {!isTeacher && (
                <div className="min-w-[200px]">
                    {mySubmission ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-emerald-500 font-bold mb-2">
                                <CheckCircle className="w-5 h-5" />
                                Devoir rendu
                            </div>
                            <p className="text-sm text-emerald-500/80 mb-2">
                                Le {new Date(mySubmission.createdAt).toLocaleDateString()}
                            </p>
                            {mySubmission.grade ? (
                                <div className="mt-4 p-4 bg-brand-sidebar rounded-xl border border-emerald-500/30 shadow-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Award className="w-6 h-6 text-yellow-500" />
                                        <span className="text-lg font-bold text-brand-text">Note obtenue</span>
                                    </div>
                                    <p className="text-3xl font-bold text-brand-accent mb-1">{mySubmission.grade.value}<span className="text-base text-brand-text-muted">/20</span></p>
                                    {mySubmission.grade.comment && (
                                        <div className="mt-2 pt-2 border-t border-brand-border/50">
                                            <p className="text-sm text-brand-text-muted italic">"{mySubmission.grade.comment}"</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-emerald-500/70 italic mt-2">En attente de correction</p>
                            )}
                        </div>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={() => setIsSubmitModalOpen(true)}
                            className="w-full flex justify-center py-3"
                            leftIcon={<Upload className="w-5 h-5" />}
                        >
                            Rendre le devoir
                        </Button>
                    )}
                </div>
            )}
        </div>
      </div>

      {isTeacher && (
          <div className="bg-brand-card rounded-xl shadow-sm border border-brand-border/50 overflow-hidden">
              <div className="p-6 border-b border-brand-border/50">
                  <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
                      <User className="w-5 h-5 text-brand-text-muted" />
                      Travaux des élèves ({submissions.length})
                  </h2>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-brand-sidebar text-brand-text-muted text-xs uppercase tracking-wider">
                          <tr>
                              <th className="p-4 font-semibold">Élève</th>
                              <th className="p-4 font-semibold">Date de remise</th>
                              <th className="p-4 font-semibold">Contenu</th>
                              <th className="p-4 font-semibold">Note</th>
                              <th className="p-4 font-semibold">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/50">
                          {submissions.length === 0 ? (
                              <tr>
                                  <td colSpan={5} className="p-8 text-center text-brand-text-muted italic">Aucun travail rendu pour le moment.</td>
                              </tr>
                          ) : (
                              submissions.map(sub => (
                                  <tr key={sub.id} className="hover:bg-brand-sidebar transition-colors">
                                      <td className="p-4 font-medium text-brand-text">
                                          {sub.student.firstName} {sub.student.lastName}
                                      </td>
                                      <td className="p-4 text-sm text-brand-text-muted">
                                          {new Date(sub.createdAt).toLocaleDateString()} à {new Date(sub.createdAt).toLocaleTimeString().slice(0,5)}
                                      </td>
                                      <td className="p-4">
                                          {sub.content && <p className="text-sm text-brand-text-muted line-clamp-2">{sub.content}</p>}
                                          {sub.fileUrl && (
                                              <div className="mt-1">
                                                  {(sub.fileUrl.endsWith('.mp3') || sub.fileUrl.endsWith('.wav') || sub.fileUrl.endsWith('.ogg') || sub.fileUrl.endsWith('.webm')) ? (
                                                      <audio controls src={getFileUrl(sub.fileUrl)} className="h-8 w-48 mt-1" />
                                                  ) : (
                                                      <a href={getFileUrl(sub.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-brand-accent text-sm hover:underline block">
                                                          Voir le fichier
                                                      </a>
                                                  )}
                                              </div>
                                        )}
                                      </td>
                                      <td className="p-4">
                                          {sub.grade ? (
                                              <div>
                                                  <span className="font-bold text-brand-text">{sub.grade.value}/20</span>
                                              </div>
                                          ) : (
                                              <span className="text-brand-text-muted text-sm">-</span>
                                          )}
                                      </td>
                                      <td className="p-4">
                                          <button 
                                            onClick={() => openGradeModal(sub.id)}
                                            className="text-brand-accent hover:bg-brand-accent/10 p-2 rounded-lg transition"
                                            title="Noter"
                                          >
                                              <Award className="w-5 h-5" />
                                          </button>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Submit Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Rendre votre devoir"
      >
        <form onSubmit={handleSubmitSubmit(onSubmitWork)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Contenu (Texte)</label>
            <textarea
              {...registerSubmit('content')}
              className="w-full p-2.5 bg-brand-sidebar border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none text-brand-text"
              rows={4}
              placeholder="Écrivez votre réponse ici..."
            />
          </div>

          <div className="bg-brand-sidebar/50 p-4 rounded-xl border border-brand-border/50 space-y-4">
              <div className="block text-sm font-medium text-brand-text-muted mb-2">Joindre un fichier</div>
              
              {/* Voice Recorder */}
              <VoiceRecorder onAudioReady={setVoiceNote} />
              
              {!voiceNote && (
                <>
                    <div className="relative flex py-2 items-center">
                        <div className="grow border-t border-brand-border/50"></div>
                        <span className="shrink-0 mx-4 text-brand-text-muted text-xs uppercase">OU</span>
                        <div className="grow border-t border-brand-border/50"></div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text-muted mb-1">Fichier (PDF, Word, Image...)</label>
                        <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.wav,.ogg,.webm"
                        {...registerSubmit('file')}
                        className="w-full p-2.5 bg-brand-card border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none text-brand-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 transition-all cursor-pointer"
                        />
                        <p className="text-xs text-brand-text-muted mt-2">Formats acceptés : PDF, Word, Images, MP3 (max 20MB)</p>
                    </div>

                    <div className="relative flex py-2 items-center">
                        <div className="grow border-t border-brand-border/50"></div>
                        <span className="shrink-0 mx-4 text-brand-text-muted text-xs uppercase">OU</span>
                        <div className="grow border-t border-brand-border/50"></div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-brand-text-muted mb-1">Lien URL</label>
                        <input
                        {...registerSubmit('fileUrl')}
                        className="w-full p-2.5 bg-brand-card border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none text-brand-text"
                        placeholder="https://..."
                        />
                    </div>
                </>
              )}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-brand-border/30">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Envoyer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Grade Modal */}
      <Modal
        isOpen={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        title="Noter le devoir"
      >
        <form onSubmit={handleSubmitGrade(onGradeWork)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Note (/20)</label>
            <input
              type="number"
              step="0.5"
              max="20"
              min="0"
              {...registerGrade('value', { required: true, min: 0, max: 20 })}
              className="w-full p-2.5 bg-brand-sidebar border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none text-brand-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1">Commentaire</label>
            <textarea
              {...registerGrade('comment')}
              className="w-full p-2.5 bg-brand-sidebar border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none text-brand-text"
              rows={3}
              placeholder="Feedback pour l'élève..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-brand-border/30">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsGradeModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssignmentDetails;
