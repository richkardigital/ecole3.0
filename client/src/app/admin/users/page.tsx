import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit, Trash2, ArrowLeft, Users as UsersIcon, GraduationCap, School, UserCog, Eye, EyeOff, Loader2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  schoolId?: string | null;
  school?: {
    name: string;
  };
  enrollments?: {
    class: {
        name: string;
    }
  }[];
}

interface UserGroup {
  id: string;
  title: string;
  count: number;
  type: 'admin' | 'teacher' | 'student' | 'other';
  users: User[];
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditConfirmModalOpen, setIsEditConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm();
  
  const [schools, setSchools] = useState<any[]>([]);

  const groups = useMemo(() => {
    const superAdmins: User[] = [];
    const directeurs: User[] = [];
    const educateurs: User[] = [];
    const teachers: User[] = [];
    const students: User[] = [];

    users.forEach(u => {
      if (u.role === 'SUPER_ADMIN') superAdmins.push(u);
      else if (u.role === 'DIRECTEUR') directeurs.push(u);
      else if (u.role === 'EDUCATEUR') educateurs.push(u);
      else if (u.role === 'ENSEIGNANT') teachers.push(u);
      else if (u.role === 'APPRENANT') students.push(u);
    });

    const result: UserGroup[] = [
      { id: 'super_admin', title: 'Super Admin', count: superAdmins.length, type: 'admin', users: superAdmins },
      { id: 'directeur', title: 'Directeur', count: directeurs.length, type: 'admin', users: directeurs },
      { id: 'educateur', title: 'Éducateur', count: educateurs.length, type: 'admin', users: educateurs },
      { id: 'enseignant', title: 'Enseignant', count: teachers.length, type: 'teacher', users: teachers },
      { id: 'eleve', title: 'Élève inscrit', count: students.length, type: 'student', users: students },
    ];

    return result;
  }, [users]);

  const formatRole = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'DIRECTEUR': return 'Directeur';
      case 'EDUCATEUR': return 'Éducateur';
      case 'ENSEIGNANT': return 'Enseignant';
      case 'APPRENANT': return 'Apprenant';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
      switch (role) {
          case 'SUPER_ADMIN': return 'bg-red-500/10 text-red-400 border border-red-500/20';
          case 'DIRECTEUR': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
          case 'EDUCATEUR': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
          case 'ENSEIGNANT': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
          case 'APPRENANT': return 'bg-green-500/10 text-green-400 border border-green-500/20';
          default: return 'bg-brand-sidebar text-brand-text-muted border border-brand-border';
      }
  }

  const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && !selectedGroup) {
      setSelectedGroupId(null);
    }
    setCurrentPage(1);
  }, [selectedGroupId, selectedGroup]);

  const paginatedUsers = useMemo(() => {
    if (!selectedGroup) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return selectedGroup.users.slice(startIndex, startIndex + itemsPerPage);
  }, [selectedGroup, currentPage]);

  const totalPages = selectedGroup ? Math.ceil(selectedGroup.users.length / itemsPerPage) : 0;

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users', error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    const groupUsers = selectedGroup ? selectedGroup.users : users;
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Prénom,Nom,Email,Rôle,Téléphone\n" + 
      groupUsers.map(u => `${u.firstName},${u.lastName},${u.email},${u.role},${u.phone || ''}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `utilisateurs_${selectedGroup ? selectedGroup.title : 'tous'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = async () => {
    const groupUsers = selectedGroup ? selectedGroup.users : users;
    try {
      const XLSX = await import('xlsx');
      const data = groupUsers.map(u => ({
        Prénom: u.firstName,
        Nom: u.lastName,
        Email: u.email,
        Rôle: formatRole(u.role),
        Téléphone: u.phone || '',
        Classe: u.enrollments?.[0]?.class?.name || '',
        École: u.school?.name || ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Utilisateurs");
      XLSX.writeFile(workbook, `utilisateurs_${selectedGroup ? selectedGroup.title : 'tous'}.xlsx`);
    } catch (error) {
      console.error("Erreur lors de l'export Excel", error);
      alert("Erreur lors de la génération du fichier Excel.");
    }
  };

  const fetchSchools = async () => {
    if (currentUser?.role === 'SUPER_ADMIN') {
        try {
            const response = await api.get('/schools');
            setSchools(response.data);
        } catch (error) {
            console.error('Error fetching schools', error);
        }
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, [currentUser]);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
        await api.delete(`/users/${userToDelete}`);
        fetchUsers();
    } catch (error) {
        console.error('Error deleting user', error);
    } finally {
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
    }
  };

  const confirmEdit = async () => {
    if (!editingUser || !formData) return;
    try {
        await api.put(`/users/${editingUser.id}`, formData);
        fetchUsers();
        setIsModalOpen(false);
        setEditingUser(null);
        reset();
    } catch (error) {
        console.error('Error updating user', error);
    } finally {
        setIsEditConfirmModalOpen(false);
        setFormData(null);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setSubmitError(null);
    setShowPassword(false);
    reset({
        firstName: '',
        lastName: '',
        email: '',
        role: 'APPRENANT',
        password: '',
        schoolId: ''
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    setSubmitError(null);
    setIsSubmitLoading(true);
    try {
        if (currentUser?.role === 'DIRECTEUR' && currentUser.schoolId) { 
             data.schoolId = currentUser.schoolId;
        }

        if (editingUser) {
            if (!data.password) {
                delete data.password;
            }
            setFormData(data);
            setIsEditConfirmModalOpen(true);
        } else {
            await api.post('/users', data);
            setIsModalOpen(false);
            reset();
            fetchUsers();
        }
    } catch (error: any) {
      console.error('Error saving user', error);
      setSubmitError(error.response?.data?.message || 'Une erreur est survenue lors de la création de l\'utilisateur.');
    } finally {
        setIsSubmitLoading(false);
    }
  };

  const getUserGroupImage = (type: string) => {
    if (type === 'admin') return 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=600';
    if (type === 'teacher') return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=600';
    if (type === 'student') return 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=600';
    return 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600';
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={selectedGroup ? selectedGroup.title : 'Annuaire des Utilisateurs'}
        subtitle={selectedGroup ? `Gérez les ${selectedGroup.count} membres de ce groupe` : "Gérez les accès et rôles de la plateforme"}
        action={
            <div className="flex gap-2">
                {selectedGroupId && (
                    <Button 
                        variant="secondary"
                        onClick={() => setSelectedGroupId(null)}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                        Retour aux groupes
                    </Button>
                )}
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportCSV} className="hidden sm:flex">
                        <FileText className="w-4 h-4 mr-2" />
                        CSV
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                    </Button>
                </div>
                <Button 
                    variant="primary"
                    onClick={openCreateModal}
                    leftIcon={<Plus className="w-4 h-4" />}
                >
                    Ajouter
                </Button>
            </div>
        }
      />

      {isLoading ? (
          <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          </div>
      ) : !selectedGroupId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {groups.map((group) => (
            <div 
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className="bg-brand-card rounded-2xl shadow-lg hover:shadow-brand-accent/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-brand-border group overflow-hidden flex flex-col h-full relative"
            >
              <div className="h-40 w-full relative overflow-hidden">
                <img 
                    src={getUserGroupImage(group.type)} 
                    alt={group.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-brand-card/80 to-transparent"></div>
                <div className="absolute top-4 right-4">
                    <span className="bg-brand-sidebar text-brand-text px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-brand-border">
                        {group.count}
                    </span>
                </div>
                <div className="absolute bottom-4 left-5 text-white">
                    <div className={`p-2.5 rounded-xl inline-flex mb-1 backdrop-blur-md shadow-lg ${
                        group.type === 'admin' ? 'bg-purple-500/80 text-white' :
                        group.type === 'teacher' ? 'bg-yellow-500/80 text-white' :
                        group.type === 'student' ? 'bg-blue-500/80 text-white' :
                        'bg-brand-sidebar text-brand-text border border-brand-border'
                    }`}>
                        {group.type === 'admin' && <UserCog className="w-5 h-5" />}
                        {group.type === 'teacher' && <GraduationCap className="w-5 h-5" />}
                        {group.type === 'student' && <School className="w-5 h-5" />}
                        {group.type === 'other' && <UsersIcon className="w-5 h-5" />}
                    </div>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-brand-text group-hover:text-brand-accent transition-colors">{group.title}</h3>
                <p className="text-sm text-brand-text-muted mt-1">
                  {group.count} {group.count === 1 ? 'membre' : 'membres'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-brand-card shadow-lg rounded-2xl overflow-hidden border border-brand-border">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-brand-border">
              <thead className="bg-brand-sidebar">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Identité</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Rôle</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Classe</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">École</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border bg-brand-card">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-brand-sidebar/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-sidebar border border-brand-border flex items-center justify-center font-bold text-brand-accent text-xs">
                              {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div>
                              <div className="text-sm font-bold text-brand-text">{u.firstName} {u.lastName}</div>
                              <div className="text-xs text-brand-text-muted">{u.email}</div>
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full ${getRoleBadgeStyle(u.role)}`}>
                        {formatRole(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-brand-text-muted">{u.enrollments?.[0]?.class?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-brand-text-muted">{u.school?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2">
                            {(currentUser?.role === 'SUPER_ADMIN' || 
                              (currentUser?.role === 'DIRECTEUR' && u.role !== 'SUPER_ADMIN') ||
                              (currentUser?.role === 'EDUCATEUR' && (u.role === 'ENSEIGNANT' || u.role === 'APPRENANT' || u.id === currentUser?.id))) && (
                              <button 
                                  onClick={() => handleEditClick(u)}
                                  className="p-2 text-brand-text-muted hover:text-white bg-brand-sidebar hover:bg-brand-border rounded-lg transition border border-transparent hover:border-brand-border"
                                  title="Modifier"
                              >
                                  <Edit className="w-4 h-4" />
                              </button>
                            )}
                            
                            {(currentUser?.role === 'SUPER_ADMIN' || 
                              (currentUser?.role === 'DIRECTEUR' && u.role !== 'SUPER_ADMIN') ||
                              (currentUser?.role === 'EDUCATEUR' && (u.role === 'ENSEIGNANT' || u.role === 'APPRENANT'))) && (
                              <button 
                                  onClick={() => handleDeleteClick(u.id)}
                                  className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition"
                                  title="Supprimer"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-brand-border bg-brand-sidebar/30 gap-4">
              <div className="text-sm text-brand-text-muted">
                Affichage de <span className="font-medium text-brand-text">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-medium text-brand-text">{Math.min(currentPage * itemsPerPage, selectedGroup?.users.length || 0)}</span> sur <span className="font-medium text-brand-text">{selectedGroup?.users.length}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-brand-card border border-brand-border rounded-lg hover:bg-brand-sidebar disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition-colors font-medium shadow-sm"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1 hidden sm:flex">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${currentPage === i + 1 ? 'bg-brand-accent text-white shadow-md' : 'bg-brand-card border border-brand-border text-brand-text hover:bg-brand-sidebar'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm bg-brand-card border border-brand-border rounded-lg hover:bg-brand-sidebar disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition-colors font-medium shadow-sm"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-md shadow-2xl border border-brand-border animate-fade-in-up">
            <h2 className="text-xl font-bold mb-6 text-brand-text">{editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}</h2>
            
            {submitError && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4 text-sm border border-red-500/20 flex items-start gap-2">
                <UsersIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Prénom</label>
                  <input {...register('firstName', { required: true })} className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Nom</label>
                  <input {...register('lastName', { required: true })} className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Email</label>
                <input {...register('email', { required: true })} type="email" className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Mot de passe</label>
                <div className="relative">
                    <input 
                        {...register('password', { required: !editingUser, minLength: 6 })} 
                        type={showPassword ? "text" : "password"} 
                        className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50 pr-10" 
                        placeholder={editingUser ? "Laisser vide pour ne pas changer" : "••••••••"} 
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-white p-1 rounded transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Rôle</label>
                <select {...register('role', { required: true })} className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none">
                    <option value="APPRENANT">Élève</option>
                    <option value="ENSEIGNANT">Enseignant</option>
                    {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DIRECTEUR') && (
                        <>
                            <option value="EDUCATEUR">Éducateur</option>
                        </>
                    )}
                    {currentUser?.role === 'SUPER_ADMIN' && (
                        <>
                            <option value="DIRECTEUR">Directeur (Admin)</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                        </>
                    )}
                </select>
              </div>

              {currentUser?.role === 'SUPER_ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-brand-text-muted mb-1.5">École d'affectation</label>
                    <select {...register('schoolId')} className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none">
                        <option value="">Aucune (Global)</option>
                        {schools.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
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
                  {editingUser ? 'Enregistrer' : 'Créer le compte'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Bannir l'utilisateur"
        message="Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur du réseau ? Cette action est irréversible."
        confirmText="Supprimer définitivement"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isEditConfirmModalOpen}
        onClose={() => setIsEditConfirmModalOpen(false)}
        onConfirm={confirmEdit}
        title="Enregistrer les modifications"
        message="Les rôles et accès de cet utilisateur vont être mis à jour. Continuer ?"
        confirmText="Confirmer la mise à jour"
        variant="success"
      />
    </div>
  );
};

export default Users;
