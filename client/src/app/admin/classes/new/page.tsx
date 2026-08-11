'use client';

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewClassPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'SUPER_ADMIN' ? '/admin' : '/directeur';
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [niveaux, setNiveaux] = useState<any[]>([]);
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const niveauxRes = await api.get('/niveaux');
        setNiveaux(niveauxRes.data);

        if (user?.role === 'SUPER_ADMIN') {
          const schoolsRes = await api.get('/schools');
          setSchools(schoolsRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await api.post('/classes', data);
      navigate(`${basePath}/classes`);
    } catch (error: any) {
      console.error('Error creating class:', error);
      alert(error.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Link to={`${basePath}/classes`} className="p-2 hover:bg-brand-sidebar rounded-lg transition-colors text-brand-text-muted hover:text-brand-text">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader 
            title="Ajouter une classe"
            subtitle="Créer une nouvelle classe et l'affecter à une école"
        />
      </div>

      <div className="bg-brand-card shadow-lg rounded-2xl border border-brand-border overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-8">
            <div className="max-w-3xl space-y-8">
                
                {/* INFORMATIONS PRINCIPALES */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-brand-text flex items-center gap-2 mb-1">
                            <span className="w-8 h-8 rounded-lg bg-brand-accent/20 text-brand-accent flex items-center justify-center text-sm">1</span>
                            Informations principales
                        </h3>
                        <p className="text-sm text-brand-text-muted mb-6">Détails de la classe à créer.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Nom de la classe *</label>
                            <input
                                {...register('name', { required: true })}
                                placeholder="Ex: 6ème A"
                                className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                            />
                            {errors.name && <span className="text-red-400 text-xs mt-1">Ce champ est requis</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Niveau</label>
                                <select 
                                    {...register('niveauId')}
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text appearance-none"
                                 >
                                    <option value="">Sélectionner un niveau</option>
                                    {niveaux.map(n => (
                                        <option key={n.id} value={n.id}>{n.nom || n.name}</option>
                                    ))}
                                 </select>
                            </div>
                            
                            {user?.role === 'SUPER_ADMIN' && (
                                <div>
                                    <label className="block text-sm font-medium text-brand-text-muted mb-1.5">École rattachée *</label>
                                    <select
                                        {...register('schoolId', { required: user?.role === 'SUPER_ADMIN' })}
                                        className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text appearance-none"
                                    >
                                        <option value="">Sélectionner une école</option>
                                        {schools.map(school => (
                                            <option key={school.id} value={school.id}>{school.name}</option>
                                        ))}
                                    </select>
                                    {errors.schoolId && <span className="text-red-400 text-xs mt-1">Veuillez sélectionner une école</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-brand-border flex justify-end gap-4">
                <Link to={`${basePath}/classes`}>
                    <Button type="button" variant="ghost">Annuler</Button>
                </Link>
                <Button type="submit" variant="primary" isLoading={isLoading} leftIcon={<Save className="w-4 h-4" />}>
                    Créer la classe
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
