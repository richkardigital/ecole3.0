'use client';

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewSchoolPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [teachingTypes, setTeachingTypes] = useState<any[]>([]);
  const [schoolTypes, setSchoolTypes] = useState<any[]>([]);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const [teachingRes, schoolRes] = await Promise.all([
          api.get('/teaching-types'),
          api.get('/school-types')
        ]);
        setTeachingTypes(teachingRes.data);
        setSchoolTypes(schoolRes.data);
      } catch (error) {
        console.error('Error fetching types', error);
      }
    };
    fetchTypes();
  }, []);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await api.post('/schools', data);
      navigate('/admin/schools');
    } catch (error: any) {
      console.error('Error creating school:', error);
      alert(error.response?.data?.message || 'Une erreur est survenue lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/schools" className="p-2 hover:bg-brand-sidebar rounded-lg transition-colors text-brand-text-muted hover:text-brand-text">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader 
            title="Ajouter un établissement"
            subtitle="Créez une nouvelle école et son compte directeur en une seule étape"
        />
      </div>

      <div className="bg-brand-card shadow-lg rounded-2xl border border-brand-border overflow-hidden">
        <form onSubmit={handleSubmit(onSubmit)} className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* BLOC ÉCOLE */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-brand-text flex items-center gap-2 mb-1">
                            <span className="w-8 h-8 rounded-lg bg-brand-accent/20 text-brand-accent flex items-center justify-center text-sm">1</span>
                            Informations de l'Établissement
                        </h3>
                        <p className="text-sm text-brand-text-muted mb-6">Renseignez les coordonnées de la nouvelle école.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Nom de l'établissement *</label>
                            <input
                                {...register('name', { required: true })}
                                placeholder="Lycée d'Excellence"
                                className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                            />
                            {errors.name && <span className="text-red-400 text-xs mt-1">Ce champ est requis</span>}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Adresse</label>
                            <input
                                {...register('address')}
                                placeholder="123 Rue de l'Éducation"
                                className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Ville</label>
                                <input
                                    {...register('ville')}
                                    placeholder="Abidjan"
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Téléphone (École)</label>
                                <input
                                    {...register('phone')}
                                    placeholder="+225..."
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Type d'enseignement</label>
                                <select
                                    {...register('teachingTypeId')}
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text appearance-none"
                                >
                                    <option value="">Sélectionner</option>
                                    {teachingTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Type d'établissement</label>
                                <select
                                    {...register('schoolTypeId')}
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text appearance-none"
                                >
                                    <option value="">Sélectionner</option>
                                    {schoolTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOC DIRECTEUR */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-brand-text flex items-center gap-2 mb-1">
                            <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">2</span>
                            Compte Directeur
                        </h3>
                        <p className="text-sm text-brand-text-muted mb-6">Créez l'accès administrateur pour cette école.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Prénom *</label>
                                <input
                                    {...register('directorFirstName', { required: true })}
                                    placeholder="Jean"
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                                />
                                {errors.directorFirstName && <span className="text-red-400 text-xs mt-1">Ce champ est requis</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Nom *</label>
                                <input
                                    {...register('directorLastName', { required: true })}
                                    placeholder="Dupont"
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                                />
                                {errors.directorLastName && <span className="text-red-400 text-xs mt-1">Ce champ est requis</span>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Email de connexion *</label>
                            <input
                                type="email"
                                {...register('directorEmail', { required: true })}
                                placeholder="directeur@ecole.com"
                                className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                            />
                            {errors.directorEmail && <span className="text-red-400 text-xs mt-1">Ce champ est requis</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Mot de passe *</label>
                                <input
                                    type="password"
                                    {...register('directorPassword', { required: true, minLength: 6 })}
                                    placeholder="Min. 6 caractères"
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                                />
                                {errors.directorPassword && <span className="text-red-400 text-xs mt-1">Min. 6 caractères</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Téléphone (Directeur)</label>
                                <input
                                    {...register('directorPhone')}
                                    placeholder="+225..."
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-brand-border flex justify-end gap-4">
                <Link to="/admin/schools">
                    <Button type="button" variant="ghost">Annuler</Button>
                </Link>
                <Button type="submit" variant="primary" isLoading={isLoading} leftIcon={<Save className="w-4 h-4" />}>
                    Créer l'établissement
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
