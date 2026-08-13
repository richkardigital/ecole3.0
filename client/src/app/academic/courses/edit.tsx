import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { BookOpen, ArrowLeft, Loader2, Save, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Option {
  id: string;
  name: string;
  nom?: string;
}

const EditCoursePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [niveaux, setNiveaux] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, setValue } = useForm();

  const getRolePrefix = () => {
    if (user?.role === 'SUPER_ADMIN') return '/admin';
    if (user?.role === 'DIRECTEUR') return '/directeur';
    if (user?.role === 'ENSEIGNANT') return '/enseignant';
    if (user?.role === 'EDUCATEUR') return '/educateur';
    return '';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseRes, niveauxRes, subjectsRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get('/niveaux'),
          api.get('/subjects')
        ]);

        const course = courseRes.data;
        setNiveaux(niveauxRes.data);
        setSubjects(subjectsRes.data);

        setValue('niveauId', course.niveauId);
        setValue('subjectId', course.subjectId);
        setValue('coefficient', course.coefficient || 1);
      } catch (error) {
        console.error("Error fetching course for edit", error);
        setSubmitError("Impossible de charger les données du cours.");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, setValue]);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await api.put(`/courses/${id}`, data);
      navigate(`${getRolePrefix()}/courses`);
    } catch (error: any) {
      console.error("Error updating course", error);
      setSubmitError(
        error.response?.data?.message ||
        "Une erreur est survenue lors de la modification du cours."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modifier le Cours Académique"
        subtitle="Modifiez le niveau, la matière ou le coefficient du cours académique."
        icon={<Pencil className="w-6 h-6 text-brand-accent" />}
        action={
          <Button
            variant="secondary"
            onClick={() => navigate(`${getRolePrefix()}/courses`)}
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
                className="w-full bg-brand-surface border border-brand-border/50 rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all text-sm"
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
                className="w-full bg-brand-surface border border-brand-border/50 rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all text-sm"
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
                min="0.5"
                {...register("coefficient", { valueAsNumber: true, required: true })}
                className="w-full bg-brand-surface border border-brand-border/50 rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all text-sm"
              />
            </div>

            <div className="pt-6 border-t border-brand-border/40 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`${getRolePrefix()}/courses`)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white shadow-lg rounded-xl text-sm font-bold"
                leftIcon={isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditCoursePage;
