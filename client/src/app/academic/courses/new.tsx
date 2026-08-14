import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { BookOpen, ArrowLeft, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Option {
  id: string;
  name?: string;
  nom?: string;
  isCurrent?: boolean;
}

const NewCoursePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [academicYears, setAcademicYears] = useState<Option[]>([]);
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
        const [yearsRes, niveauxRes, subjectsRes] = await Promise.all([
          api.get('/academic/years').catch(() => ({ data: [] })),
          api.get('/niveaux'),
          api.get('/subjects')
        ]);
        const yearsData = yearsRes.data || [];
        setAcademicYears(yearsData);
        setNiveaux(niveauxRes.data || []);
        setSubjects(subjectsRes.data || []);

        const activeYear = yearsData.find((y: Option) => y.isCurrent);
        if (activeYear) {
          setValue('academicYearId', activeYear.id);
        } else if (yearsData.length > 0) {
          setValue('academicYearId', yearsData[0].id);
        }
      } catch (error) {
        console.error("Error fetching dependencies for new course", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [setValue]);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const res = await api.post('/courses', data);
      navigate(`${getRolePrefix()}/courses/${res.data.id}`);
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

            {/* 1. Année Académique */}
            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                1. Année Académique / Scolaire <span className="text-red-500">*</span>
              </label>
              <select
                {...register("academicYearId")}
                className="w-full bg-brand-surface border border-brand-border/50 rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all"
              >
                <option value="">Sélectionnez l'année académique...</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name || year.nom} {year.isCurrent ? '(En cours)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Niveau Scolaire */}
            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                2. Niveau Scolaire <span className="text-red-500">*</span>
              </label>
              <select
                {...register("niveauId", { required: true })}
                className="w-full bg-brand-surface border border-brand-border/50 rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all"
              >
                <option value="">Sélectionnez un niveau...</option>
                {niveaux.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nom || n.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Matière */}
            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                3. Matière <span className="text-red-500">*</span>
              </label>
              <select
                {...register("subjectId", { required: true })}
                className="w-full bg-brand-surface border border-brand-border/50 rounded-xl px-4 py-3 text-brand-text focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 transition-all"
              >
                <option value="">Sélectionnez une matière...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Coefficient */}
            <div>
              <label className="block text-sm font-bold text-brand-text mb-2">
                4. Coefficient <span className="text-red-500">*</span>
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
                Chapitres et contenus du cours
              </h4>
              <p className="text-xs text-brand-muted">
                Une fois ce cours créé pour ce niveau, vous serez automatiquement redirigé pour ajouter ses chapitres, modules et supports de cours.
              </p>
            </div>
            
            <div className="pt-6 border-t border-brand-border/40 flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white shadow-lg rounded-xl text-sm font-bold"
                leftIcon={isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              >
                {isSubmitting ? "Création en cours..." : "Créer et ajouter les chapitres"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewCoursePage;
