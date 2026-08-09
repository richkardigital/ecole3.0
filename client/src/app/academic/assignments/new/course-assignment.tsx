import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, BookOpen, CheckCircle2, Paperclip } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

type FormData = {
  title: string;
  description: string;
  type: string;
  dueDate: string;
  coefficient: number;
  file?: FileList;
  voiceNote?: FileList;
  correction?: FileList;
};

export default function NewCourseAssignmentPage() {
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      type: 'DEVOIR_MAISON',
      coefficient: 1,
    }
  });

  const isTeacher = user?.role === 'ENSEIGNANT' || user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR';

  const onSubmitForm = async (data: FormData) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('type', data.type);
      formData.append('dueDate', data.dueDate);
      formData.append('courseId', courseId as string);
      formData.append('coefficient', String(data.coefficient || 1));
      
      if (data.file && data.file[0]) {
          formData.append('file', data.file[0]);
      }
      if (data.voiceNote && data.voiceNote[0]) {
          formData.append('voiceNote', data.voiceNote[0]);
      }
      if (data.correction && data.correction[0]) {
          formData.append('correction', data.correction[0]);
      }

      await api.post('/assignments', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Navigate back to the course details on the assignments tab
      const backPath = user?.role === 'SUPER_ADMIN' ? '/admin/courses' : user?.role === 'DIRECTEUR' ? '/directeur/courses' : '/enseignant/courses';
      navigate(`${backPath}/${courseId}?tab=ASSIGNMENTS`);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Erreur lors de la création du devoir.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isTeacher) {
    return <div className="p-8 text-center text-red-500">Accès non autorisé.</div>;
  }

  const backPath = user?.role === 'SUPER_ADMIN' ? `/admin/courses/${courseId}` : user?.role === 'DIRECTEUR' ? `/directeur/courses/${courseId}` : `/enseignant/courses/${courseId}`;

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center gap-4 mb-4">
        <Link to={backPath} className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-sm font-medium text-brand-text-muted">Retour au cours</span>
      </div>

      <PageHeader 
        title="Créer un nouveau devoir" 
        description="Publiez un devoir spécifique pour ce cours. Les apprenants pourront le voir et soumettre leur travail."
        icon={<BookOpen className="w-8 h-8 text-brand-accent" />}
      />

      <div className="bg-brand-card rounded-2xl border border-brand-border/50 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit(onSubmitForm)} className="divide-y divide-brand-border/50">
          {formError && <div className="m-6 p-4 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium">{formError}</div>}
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brand-text mb-2">Titre du devoir <span className="text-red-500">*</span></label>
                <input 
                  {...register('title', { required: "Le titre est requis" })} 
                  className={`w-full p-3 bg-brand-sidebar border ${errors.title ? 'border-red-500' : 'border-brand-border/50'} rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all`} 
                  placeholder="Ex: Exercices Chapitre 1" 
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">Type <span className="text-red-500">*</span></label>
                <select 
                  {...register('type', { required: true })} 
                  className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all"
                >
                  <option value="DEVOIR_MAISON">Devoir Maison (Noté)</option>
                  <option value="EXERCICE_MAISON">Exercice de Maison (Non noté)</option>
                  <option value="DEVOIR_CLASSE">Devoir de Classe</option>
                  {user?.role === 'SUPER_ADMIN' && <option value="DEVOIR_NIVEAU">Devoir de Niveau</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">Coefficient</label>
                <input 
                  type="number"
                  min="1"
                  {...register('coefficient', { required: true, valueAsNumber: true })} 
                  className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brand-text mb-2">Date limite de rendu <span className="text-red-500">*</span></label>
                <input 
                  type="date"
                  {...register('dueDate', { required: "La date limite est requise" })} 
                  className={`w-full p-3 bg-brand-sidebar border ${errors.dueDate ? 'border-red-500' : 'border-brand-border/50'} rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all`} 
                />
                {errors.dueDate && <p className="mt-1 text-sm text-red-500">{errors.dueDate.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-brand-text mb-2">Consignes et Description (Optionnel)</label>
                <textarea 
                  {...register('description')} 
                  rows={4} 
                  className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all"
                  placeholder="Décrivez les consignes ici..."
                ></textarea>
              </div>
            </div>
          </div>

          <div className="p-6 bg-brand-sidebar/50 space-y-6">
            <h3 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-brand-text-muted" />
              Fichiers joints
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Sujet / Fichier principal (PDF/Word)</label>
                  <input
                    type="file"
                    {...register('file')}
                    className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                    accept=".pdf,.doc,.docx"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-brand-text mb-2">Corrigé (Facultatif)</label>
                  <input
                    type="file"
                    {...register('correction')}
                    className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                </div>
            </div>
          </div>

          <div className="p-6 flex justify-end gap-4 border-t border-brand-border/50">
            <Button type="button" variant="secondary" onClick={() => navigate(`${backPath}?tab=ASSIGNMENTS`)} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
              Publier le devoir
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
