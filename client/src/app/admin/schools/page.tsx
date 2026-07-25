import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, User, Edit2, Lock, Unlock, School as SchoolIcon, Loader2, BookOpen, Download } from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface School {
  id: string;
  name: string;
  code?: string;
  address?: string;
  ville?: string;
  phone?: string;
  email?: string;
  description?: string;
  isActive: boolean;
  managerId?: string;
  teachingTypeId?: string;
  teachingType?: { id: string; name: string };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    users: number;
    classes: number;
  };
}

const Schools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Code,Nom,Ville,Adresse,Type,Directeur\n" + 
      schools.map(s => `${s.code || ''},${s.name},${s.ville || ''},${s.address || ''},${s.teachingType?.name || ''},${s.manager ? s.manager.firstName + ' ' + s.manager.lastName : ''}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ecoles.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools', error);
    } finally {
        setIsLoading(false);
    }
  };

  const fetchAvailableManagers = async () => {
      try {
          const response = await api.get('/users?role=DIRECTEUR'); // Updated role
          const allAdmins = response.data;
          const freeAdmins = allAdmins.filter((u: any) => !u.school);
          setAvailableManagers(freeAdmins);
      } catch (error) {
          console.error('Error fetching users', error);
      }
  }

  useEffect(() => {
    fetchSchools();
    fetchAvailableManagers();
  }, []);

  const openCreateModal = async () => {
      await fetchAvailableManagers();
      setEditingSchool(null);
      reset({ name: '', address: '', managerId: '' });
      setIsModalOpen(true);
  }

  const openEditModal = async (school: School) => {
      try {
        const response = await api.get('/users?role=DIRECTEUR'); // Updated role
        const allAdmins = response.data;
        const validManagers = allAdmins.filter((u: any) => 
            !u.school || (school.managerId && u.id === school.managerId)
        );
        
        setAvailableManagers(validManagers);
        setEditingSchool(school);
        setValue('name', school.name);
        setValue('address', school.address);
        setValue('managerId', school.managerId || '');
        setIsModalOpen(true);
      } catch (error) {
        console.error('Error preparing edit modal', error);
      }
  }

  const onSubmit = async (data: any) => {
    setIsSubmitLoading(true);
    try {
      if (editingSchool) {
          await api.put(`/schools/${editingSchool.id}`, data);
      } else {
          await api.post('/schools', data);
      }
      setIsModalOpen(false);
      reset();
      fetchSchools();
      fetchAvailableManagers();
    } catch (error: any) {
      console.error('Error saving school', error);
      alert(error.response?.data?.message || 'Une erreur est survenue lors de l\'enregistrement');
    } finally {
        setIsSubmitLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
      setSchoolToDelete(id);
      setIsDeleteModalOpen(true);
  }

  const handleDelete = async () => {
    if (schoolToDelete) {
      try {
        await api.delete(`/schools/${schoolToDelete}`);
        fetchSchools();
        fetchAvailableManagers();
      } catch (error) {
        console.error('Error deleting school', error);
        alert('Impossible de supprimer cette école');
      }
    }
  };

  const toggleStatus = async (school: School) => {
      try {
          await api.put(`/schools/${school.id}`, {
              isActive: !school.isActive
          });
          fetchSchools();
      } catch (error) {
          console.error('Error updating status', error);
      }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Réseau d'Écoles"
        subtitle="Gérez l'ensemble des établissements du réseau"
        action={
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exporter (CSV)
              </Button>
              <div className="relative group">
                <Button 
                    onClick={openCreateModal}
                    disabled={availableManagers.length === 0}
                    variant={availableManagers.length > 0 ? 'primary' : 'secondary'}
                    leftIcon={<Plus className="w-4 h-4" />}
                >
                    Ajouter une école
                </Button>
                {availableManagers.length === 0 && (
                    <div className="absolute top-full mt-2 right-0 w-64 bg-brand-sidebar text-brand-text-muted text-xs rounded-lg p-3 text-center shadow-xl border border-brand-border z-10 hidden group-hover:block animate-fade-in-up">
                        Créez d'abord un Directeur libre dans l'annuaire avant de créer une école.
                    </div>
                )}
            </div>
          </div>
        }
      />

      {isLoading ? (
          <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          </div>
      ) : (
          <div className="bg-brand-card shadow-lg rounded-2xl overflow-hidden border border-brand-border">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-brand-border">
                <thead className="bg-brand-sidebar">
                    <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Établissement</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Localisation</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Direction</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Métriques</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-border bg-brand-card">
                    {schools.map((school) => (
                    <tr key={school.id} className={`hover:bg-brand-sidebar/50 transition-colors ${!school.isActive ? 'opacity-75' : ''}`}>
                        <td className="px-6 py-5 whitespace-nowrap">
                            <button 
                                onClick={() => toggleStatus(school)}
                                className={`p-2 rounded-xl transition-colors ${school.isActive ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'}`}
                                title={school.isActive ? "Désactiver l'école" : "Activer l'école"}
                            >
                                {school.isActive ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-sidebar rounded-lg border border-brand-border">
                                    <SchoolIcon className="w-5 h-5 text-brand-accent" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-brand-text">{school.name}</div>
                                    {!school.isActive && <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">Suspendue</span>}
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-text-muted">{school.address || '-'}</td>
                        <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-9 w-9 bg-brand-accent/20 rounded-full flex items-center justify-center border border-brand-accent/30">
                                <User className="w-4 h-4 text-brand-accent" />
                            </div>
                            <div className="ml-3">
                            <div className="text-sm font-semibold text-brand-text">
                                {school.manager ? `${school.manager.firstName} ${school.manager.lastName}` : 'Non assigné'}
                            </div>
                            <div className="text-xs text-brand-text-muted">{school.manager?.email || '-'}</div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
                                    <User className="w-3 h-3" /> {school._count?.users || 0} membres
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
                                    <BookOpen className="w-3 h-3" /> {school._count?.classes || 0} classes
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => openEditModal(school)} className="text-brand-text-muted hover:text-white bg-brand-sidebar hover:bg-brand-border p-2 rounded-lg transition-colors border border-transparent hover:border-brand-border" title="Modifier">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => confirmDelete(school.id)} className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg transition-colors" title="Supprimer">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                    {schools.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-16 text-center">
                                <SchoolIcon className="w-12 h-12 text-brand-border mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-brand-text">Aucune école</h3>
                                <p className="text-brand-text-muted mt-1">Commencez par ajouter votre premier établissement.</p>
                            </td>
                        </tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative bg-brand-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-brand-border">
            <div className="px-6 py-4 border-b border-brand-border bg-brand-sidebar">
                <h2 className="text-lg font-bold text-brand-text">
                    {editingSchool ? 'Modifier l\'école' : 'Ajouter un établissement'}
                </h2>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Nom de l'établissement</label>
                <input
                  {...register('name', { required: true })}
                  placeholder="Lycée d'Excellence"
                  className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Adresse</label>
                <input
                  {...register('address')}
                  placeholder="123 Rue de l'Éducation"
                  className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Direction (Admin)</label>
                <select
                  {...register('managerId', { required: true })}
                  className="w-full px-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none"
                >
                  <option value="">Sélectionner un directeur</option>
                  {availableManagers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
                {availableManagers.length === 0 && (
                    <p className="text-xs font-medium text-red-400 mt-2 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Aucun directeur libre trouvé.
                    </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitLoading}
                >
                  {editingSchool ? 'Mettre à jour' : 'Créer l\'école'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'établissement"
        message="Attention : la suppression d'une école entraîne la suppression définitive de tous les utilisateurs, classes et données qui y sont liés."
        confirmText="Supprimer définitivement"
        variant="danger"
      />
    </div>
  );
};

export default Schools;
