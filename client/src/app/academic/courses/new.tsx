import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { BookOpen, ArrowLeft, Loader2, Save } from 'lucide-react';

interface Option {
  id: string;
  name: string;
  nom?: string;
}

const NewCoursePage = () => {
  const navigate = useNavigate();
  const [niveaux, setNiveaux] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [niveauxRes, subjectsRes] = await Promise.all([
          api.get('/niveaux'),
          api.get('/subjects')
        ]);
        setNiveaux(niveauxRes.data);
        setSubjects(subjectsRes.data);
      } catch (error) {
        console.error("Error fetching dependencies for new course", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const res = await api.post('/courses', data);
      navigate('/admin/courses/' + res.data.id);
    } catch (error: any) {
      console.error("Error creating course", error);
      setSubmitError(
        error.response?.data?.message ||
        "Une erreur est survenue lors de la création du cours académique."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouveau Cours Académique"
        subtitle="Créer un nouveau cours global pour un niveau et une matière spécifiques."
        icon={<BookOpen className="w-6 h-6 text-brand-accent" />}
        action={
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/courses')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Retour
          </Button>
        }
      />

      <div className="max-w-2xl mx-auto bg-brand-card border border-brand-border/60 rounded-2xl shadow-xl overflow-hidden p-6 md:p-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {submitError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-semibold">
                {submitError}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                Niveau Scolaire <span className="text-red-500">*</span>
              </label>
              <select
                {...register("niveauId", { required: true })}
                className="w-full bg-brand-surface border border-brand-border/50 rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all"
              >
                <option value="">Sélectionnez un niveau...</option>
                {niveaux.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                Matière <span className="text-red-500">*</span>
              </label>
              <select
                {...register("subjectId", { required: true })}
                className="w-full bg-brand-surface border border-brand-border/50 rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all"
              >
                <option value="">Sélectionnez une matière...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                Coefficient <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                defaultValue={1}
                {...register("coefficient", { valueAsNumber: true, required: true })}
                className="w-full bg-brand-surface border border-brand-border/50 rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all"
              />
            </div>


            
            <div className="p-4 bg-brand-surface/50 border border-brand-border/40 rounded-xl mt-6">
              <h4 className="text-sm font-bold text-brand-text flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-brand-accent" />
                Contenu du cours
              </h4>
              <p className="text-xs text-brand-muted">
                Une fois ce cours global créé, vous serez redirigé vers sa page détaillée où vous pourrez ajouter des chapitres, des ressources (PDF, vidéos) et des évaluations.
              </p>
            </div>
            
            <div className="pt-6 border-t border-brand-border/40 flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white shadow-lg rounded-xl text-sm font-bold"
                leftIcon={isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              >
                {isSubmitting ? "Création en cours..." : "Créer et ajouter du contenu"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewCoursePage;
