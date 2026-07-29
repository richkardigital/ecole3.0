'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function EditClassPage() {
  const navigate = useNavigate();
  const params = useParams();
  const classId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  
  const { register, handleSubmit, setValue, formState: { errors }, watch } = useForm();
  const isActive = watch('isActive');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const classRes = await api.get(`/classes`);
        const cls = classRes.data.find((c: any) => c.id === classId);
        
        if (!cls) {
            alert('Classe introuvable');
            navigate('/admin/classes');
            return;
        }
        
        setValue('name', cls.name);
        setValue('level', cls.level || '');
        setValue('isActive', cls.isActive);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Erreur lors du chargement des données');
        navigate('/admin/classes');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (classId) fetchData();
  }, [classId, navigate, setValue]);

  const onSubmit = async (data: any) => {
    setIsSubmitLoading(true);
    try {
      await api.put(`/classes/${classId}`, data);
      navigate('/admin/classes');
    } catch (error: any) {
      console.error('Error updating class:', error);
      alert(error.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  if (isLoading) {
      return (
          <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Link to="/admin/classes" className="p-2 hover:bg-brand-sidebar rounded-lg transition-colors text-brand-text-muted hover:text-brand-text">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader 
            title="Modifier la classe"
            subtitle="Mettre à jour les informations de la classe"
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
                        <p className="text-sm text-brand-text-muted mb-6">Détails de la classe.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Nom de la classe *</label>
                            <input
                                {...register('name', { required: true })}
                                className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                            />
                            {errors.name && <span className="text-red-400 text-xs mt-1">Ce champ est requis</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Niveau</label>
                            <select 
                                {...register('level')}
                                className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text appearance-none"
                             >
                                <option value="">Sélectionner un niveau</option>
                                <option value="6eme">6ème</option>
                                <option value="5eme">5ème</option>
                                <option value="4eme">4ème</option>
                                <option value="3eme">3ème</option>
                                <option value="2nde">2nde</option>
                                <option value="1ere">1ère</option>
                                <option value="Terminale">Terminale</option>
                             </select>
                        </div>
                    </div>
                </div>

                {/* STATUT */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-brand-text flex items-center gap-2 mb-1">
                            <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm">2</span>
                            Statut de la classe
                        </h3>
                        <p className="text-sm text-brand-text-muted mb-6">Activer ou désactiver cette classe.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" {...register('isActive')} />
                            <div className="w-11 h-6 bg-brand-sidebar peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 border border-brand-border"></div>
                            <span className="ml-3 text-sm font-medium text-brand-text">
                                {isActive ? 'Classe active' : 'Classe inactive'}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-brand-border flex justify-end gap-4">
                <Link to="/admin/classes">
                    <Button type="button" variant="ghost">Annuler</Button>
                </Link>
                <Button type="submit" variant="primary" isLoading={isSubmitLoading} leftIcon={<Save className="w-4 h-4" />}>
                    Mettre à jour
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
