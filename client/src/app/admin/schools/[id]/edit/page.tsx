'use client';

import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function EditSchoolPage() {
  const navigate = useNavigate();
  const params = useParams();
  const schoolId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);
  const [teachingTypes, setTeachingTypes] = useState<any[]>([]);
  const [schoolTypes, setSchoolTypes] = useState<any[]>([]);
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch school data and types
        const [schoolRes, teachingRes, schoolTypesRes, usersRes] = await Promise.all([
          api.get(`/schools/${schoolId}`),
          api.get('/teaching-types'),
          api.get('/school-types'),
          api.get('/users?role=DIRECTEUR')
        ]);

        const school = schoolRes.data;
        setTeachingTypes(teachingRes.data);
        setSchoolTypes(schoolTypesRes.data);
        
        setValue('name', school.name);
        setValue('address', school.address || '');
        setValue('ville', school.ville || '');
        setValue('phone', school.phone || '');
        setValue('email', school.email || '');
        setValue('managerId', school.managerId || '');
        setValue('teachingTypeId', school.teachingTypeId || '');
        setValue('schoolTypeId', school.schoolTypeId || '');
        
        // Filter available managers
        const allAdmins = usersRes.data;
        const validManagers = allAdmins.filter((u: any) => 
            !u.school || (school.managerId && u.id === school.managerId)
        );
        setAvailableManagers(validManagers);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Erreur lors du chargement des données');
        navigate('/admin/schools');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (schoolId) fetchData();
  }, [schoolId, navigate, setValue]);

  const onSubmit = async (data: any) => {
    setIsSubmitLoading(true);
    try {
      await api.put(`/schools/${schoolId}`, data);
      navigate('/admin/schools');
    } catch (error: any) {
      console.error('Error updating school:', error);
      alert(error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour');
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/schools" className="p-2 hover:bg-brand-sidebar rounded-lg transition-colors text-brand-text-muted hover:text-brand-text">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader 
            title="Modifier l'établissement"
            subtitle="Mettez à jour les informations de l'école"
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
                            Informations
                        </h3>
                        <p className="text-sm text-brand-text-muted mb-6">Coordonnées de l'école.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Nom de l'établissement *</label>
                            <input
                                {...register('name', { required: true })}
                                className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                            />
                            {errors.name && <span className="text-red-400 text-xs mt-1">Ce champ est requis</span>}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Adresse</label>
                            <input
                                {...register('address')}
                                className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Ville</label>
                                <input
                                    {...register('ville')}
                                    className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Téléphone</label>
                                <input
                                    {...register('phone')}
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

                {/* BLOC DIRECTION */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-brand-text flex items-center gap-2 mb-1">
                            <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">2</span>
                            Direction
                        </h3>
                        <p className="text-sm text-brand-text-muted mb-6">Administrateur assigné à cet établissement.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Directeur actuel</label>
                            <select
                                {...register('managerId')}
                                className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent outline-none text-brand-text appearance-none"
                            >
                                <option value="">Aucun directeur assigné</option>
                                {availableManagers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 pt-6 border-t border-brand-border flex justify-end gap-4">
                <Link to="/admin/schools">
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
