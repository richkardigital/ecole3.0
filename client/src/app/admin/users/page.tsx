import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Plus, Edit, Trash2, ArrowLeft, Users as UsersIcon, GraduationCap, 
  School, UserCog, Eye, EyeOff, Loader2, Download, FileSpreadsheet, 
  MessageCircle, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, 
  LayoutGrid, List, RotateCcw, Building2, CheckCircle2, X
} from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  matricule?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  role: string;
  phone?: string;
  schoolId?: string | null;
  school?: {
    id?: string;
    name: string;
    schoolType?: { name: string };
    teachingType?: { name: string };
  };
  enrollments?: {
    class: {
        name: string;
        niveau?: { nom: string };
    }
  }[];
  courses?: {
      class: { name: string }
  }[];
  teacherClasses?: {
    class: {
      name: string;
      niveau?: { nom: string };
    };
    subject?: {
      name: string;
    };
  }[];
}

interface UserGroup {
  id: string;
  title: string;
  count: number;
  type: 'all' | 'admin' | 'teacher' | 'student' | 'other';
  users: User[];
}

type SortField = 'name' | 'email' | 'role' | 'school' | 'class' | 'matricule';
type SortOrder = 'asc' | 'desc';

const Users = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [users, setUsers] = useState<User[]>([]);
  // selectedGroupId: 'all' | 'super_admin' | 'directeur' | 'educateur' | 'enseignant' | 'eleve' | null (null = cards grid)
  const initialGroup = searchParams.get('group') || (searchParams.get('role') === 'APPRENANT' ? 'eleve' : searchParams.get('role') === 'ENSEIGNANT' ? 'enseignant' : searchParams.get('role') === 'EDUCATEUR' ? 'educateur' : searchParams.get('role') === 'DIRECTEUR' ? 'directeur' : 'all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroup);

  // Sync selectedGroupId when URL search parameters change
  useEffect(() => {
    const roleParam = searchParams.get('role');
    const groupParam = searchParams.get('group');
    if (groupParam) {
      setSelectedGroupId(groupParam);
    } else if (roleParam) {
      if (roleParam === 'APPRENANT' || roleParam === 'ELEVE') setSelectedGroupId('eleve');
      else if (roleParam === 'ENSEIGNANT') setSelectedGroupId('enseignant');
      else if (roleParam === 'EDUCATEUR') setSelectedGroupId('educateur');
      else if (roleParam === 'DIRECTEUR') setSelectedGroupId('directeur');
      else if (roleParam === 'SUPER_ADMIN') setSelectedGroupId('super_admin');
    }
  }, [searchParams]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [schoolFilter, setSchoolFilter] = useState(searchParams.get('schoolId') || 'ALL');
  const [teachingTypeFilter, setTeachingTypeFilter] = useState('ALL');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState('ALL');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Modals & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditConfirmModalOpen, setIsEditConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, reset } = useForm();
  
  const [schools, setSchools] = useState<any[]>([]);

  // Calculate groups
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
      { id: 'all', title: 'Tous les utilisateurs', count: users.length, type: 'all', users }
    ];

    if (currentUser?.role === 'SUPER_ADMIN') {
        result.push({ id: 'super_admin', title: 'Super Admin', count: superAdmins.length, type: 'admin', users: superAdmins });
        result.push({ id: 'directeur', title: 'Directeurs', count: directeurs.length, type: 'admin', users: directeurs });
    }
    result.push(
      { id: 'educateur', title: 'Éducateurs', count: educateurs.length, type: 'admin', users: educateurs },
      { id: 'enseignant', title: 'Enseignants', count: teachers.length, type: 'teacher', users: teachers },
      { id: 'eleve', title: 'Élèves inscrits', count: students.length, type: 'student', users: students },
    );

    return result;
  }, [users, currentUser]);

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
  };

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find(g => g.id === selectedGroupId) || groups[0];
  }, [groups, selectedGroupId]);

  const handleGroupSelect = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setCurrentPage(1);
    if (groupId) {
      setSearchParams({ group: groupId });
    } else {
      setSearchParams({});
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setLevelFilter('ALL');
    setSchoolFilter('ALL');
    setTeachingTypeFilter('ALL');
    setSchoolTypeFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery !== '' || levelFilter !== 'ALL' || schoolFilter !== 'ALL' || teachingTypeFilter !== 'ALL' || schoolTypeFilter !== 'ALL';

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    if (!selectedGroup) return [];
    let list = [...selectedGroup.users];

    // Search query filter
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter(u => 
            u.firstName.toLowerCase().includes(q) || 
            u.lastName.toLowerCase().includes(q) || 
            u.email.toLowerCase().includes(q) ||
            (u.matricule && u.matricule.toLowerCase().includes(q)) ||
            (u.school?.name && u.school.name.toLowerCase().includes(q)) ||
            (u.enrollments && u.enrollments.some(e => e.class.name.toLowerCase().includes(q))) ||
            (u.teacherClasses && u.teacherClasses.some(tc => tc.class.name.toLowerCase().includes(q) || tc.subject?.name.toLowerCase().includes(q)))
        );
    }

    // School filter (Super Admin)
    if (schoolFilter !== 'ALL') {
        list = list.filter(u => u.schoolId === schoolFilter || u.school?.name === schoolFilter);
    }

    // Level filter (Eleve or Enseignant)
    if (levelFilter !== 'ALL') {
        list = list.filter(u => {
            if (u.role === 'APPRENANT') {
                return u.enrollments?.some(e => e.class.niveau?.nom === levelFilter || e.class.name.includes(levelFilter));
            } else if (u.role === 'ENSEIGNANT') {
                return u.teacherClasses?.some(tc => tc.class.niveau?.nom === levelFilter || tc.class.name.includes(levelFilter));
            }
            return true;
        });
    }

    // Teaching type filter
    if (teachingTypeFilter !== 'ALL') {
        list = list.filter(u => u.school?.teachingType?.name === teachingTypeFilter);
    }

    // School type filter
    if (schoolTypeFilter !== 'ALL') {
        list = list.filter(u => u.school?.schoolType?.name === schoolTypeFilter);
    }

    // Sorting logic
    list.sort((a, b) => {
        let valA = '';
        let valB = '';

        switch (sortField) {
            case 'name':
                valA = `${a.lastName} ${a.firstName}`.toLowerCase();
                valB = `${b.lastName} ${b.firstName}`.toLowerCase();
                break;
            case 'email':
                valA = a.email.toLowerCase();
                valB = b.email.toLowerCase();
                break;
            case 'role':
                valA = a.role;
                valB = b.role;
                break;
            case 'matricule':
                valA = (a.matricule || '').toLowerCase();
                valB = (b.matricule || '').toLowerCase();
                break;
            case 'school':
                valA = (a.school?.name || '').toLowerCase();
                valB = (b.school?.name || '').toLowerCase();
                break;
            case 'class':
                valA = (a.enrollments?.[0]?.class?.name || a.teacherClasses?.[0]?.class?.name || '').toLowerCase();
                valB = (b.enrollments?.[0]?.class?.name || b.teacherClasses?.[0]?.class?.name || '').toLowerCase();
                break;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return list;
  }, [selectedGroup, searchQuery, levelFilter, schoolFilter, teachingTypeFilter, schoolTypeFilter, sortField, sortOrder]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedUsers, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users', error);
    } finally {
      setIsLoading(false);
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
  };

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, [currentUser]);

  const handleExportCSV = () => {
    const groupUsers = filteredAndSortedUsers;
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Matricule,Prénom,Nom,Email,Rôle,Téléphone,École,Classe\n" + 
      groupUsers.map(u => {
        const classe = u.role === 'APPRENANT' ? (u.enrollments?.[0]?.class?.name || '') : (u.teacherClasses?.map(tc => tc.class.name).join(';') || '');
        return `"${u.matricule || ''}","${u.firstName}","${u.lastName}","${u.email}","${formatRole(u.role)}","${u.phone || ''}","${u.school?.name || ''}","${classe}"`;
      }).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `utilisateurs_${selectedGroup ? selectedGroup.id : 'tous'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = async () => {
    const groupUsers = filteredAndSortedUsers;
    try {
      const XLSX = await import('xlsx');
      const data = groupUsers.map(u => ({
        'Matricule': u.matricule || '',
        'Prénom': u.firstName,
        'Nom': u.lastName,
        'Email': u.email,
        'Rôle': formatRole(u.role),
        'Téléphone': u.phone || '',
        'Classe': u.role === 'APPRENANT' 
            ? (u.enrollments?.[0]?.class?.name || '') 
            : (u.teacherClasses?.map(tc => tc.class.name).join(', ') || ''),
        'École': u.school?.name || ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Utilisateurs");
      XLSX.writeFile(workbook, `utilisateurs_${selectedGroup ? selectedGroup.id : 'tous'}.xlsx`);
    } catch (error) {
      console.error("Erreur lors de l'export Excel", error);
      alert("Erreur lors de la génération du fichier Excel.");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const sampleData = [
        {
          'Matricule': 'ENS-2026-001',
          'Prénom': 'Jean',
          'Nom': 'Dupont',
          'Email': 'jean.dupont@example.com',
          'Sexe': 'M',
          'Date de naissance': '1985-05-12',
          'Rôle': 'Enseignant',
          'Téléphone': '+2250700000000'
        },
        {
          'Matricule': 'EDU-2026-001',
          'Prénom': 'Marie',
          'Nom': 'Kouassi',
          'Email': 'marie.kouassi@example.com',
          'Sexe': 'F',
          'Date de naissance': '1990-08-25',
          'Rôle': 'Éducateur',
          'Téléphone': '+2250700000001'
        },
        {
          'Matricule': 'MAT-2026-001',
          'Prénom': 'Alexandre',
          'Nom': 'Traoré',
          'Email': 'alexandre.traore@example.com',
          'Sexe': 'M',
          'Date de naissance': '2010-02-14',
          'Rôle': 'Apprenant',
          'Téléphone': '+2250700000002'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Modèle Utilisateurs");
      XLSX.writeFile(workbook, "modele_importation_utilisateurs.xlsx");
    } catch (error) {
      console.error("Erreur lors de la génération du modèle", error);
      alert("Erreur lors de la génération du modèle Excel.");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (json.length === 0) {
             alert("Le fichier est vide.");
             return;
          }

          setIsSubmitLoading(true);
          let successCount = 0;
          let errorCount = 0;
          let errorDetails: string[] = [];

          for (const row of json) {
             try {
                let roleToAssign = 'APPRENANT';
                const rowRole = row['Rôle'] || row['role'] || row['Role'];
                if (rowRole) {
                    if (rowRole.toUpperCase().includes('SUPER ADMIN')) roleToAssign = 'SUPER_ADMIN';
                    else if (rowRole.toUpperCase().includes('DIRECTEUR')) roleToAssign = 'DIRECTEUR';
                    else if (rowRole.toUpperCase().includes('EDUCATEUR') || rowRole.toUpperCase().includes('ÉDUCATEUR')) roleToAssign = 'EDUCATEUR';
                    else if (rowRole.toUpperCase().includes('ENSEIGNANT')) roleToAssign = 'ENSEIGNANT';
                }

                if (currentUser?.role === 'DIRECTEUR' && roleToAssign === 'SUPER_ADMIN') {
                   throw new Error("Directeur ne peut pas créer de super admin");
                }
                if (currentUser?.role === 'EDUCATEUR' && (roleToAssign === 'SUPER_ADMIN' || roleToAssign === 'DIRECTEUR' || roleToAssign === 'EDUCATEUR')) {
                   throw new Error("Educateur ne peut créer que des enseignants et apprenants");
                }

                const payload = {
                    matricule: row['Matricule'] || row['matricule'] || '',
                    firstName: row['Prénom'] || row['Prenom'] || row['firstName'] || 'Inconnu',
                    lastName: row['Nom'] || row['lastName'] || 'Inconnu',
                    email: row['Email'] || row['email'] || `user${Date.now()}${Math.floor(Math.random()*1000)}@ecole.com`,
                    gender: row['Sexe'] || row['Genre'] || row['sexe'] || '',
                    birthDate: row['Date de naissance'] || row['DateNaissance'] || row['birthDate'] || '',
                    role: roleToAssign,
                    phone: row['Téléphone'] || row['Telephone'] || row['phone'] || '',
                    password: 'Ecole2026!',
                };

                const formDataPayload = new FormData();
                Object.keys(payload).forEach(key => {
                    formDataPayload.append(key, (payload as any)[key]);
                });

                if (currentUser?.role === 'DIRECTEUR' && currentUser.schoolId) { 
                    formDataPayload.append('schoolId', currentUser.schoolId);
                }

                await api.post('/users', formDataPayload, { headers: { 'Content-Type': 'multipart/form-data' } });
                successCount++;
             } catch (err: any) {
                 console.error("Erreur ajout utilisateur:", err);
                 errorCount++;
                 errorDetails.push(`Ligne ${json.indexOf(row) + 2}: ${err.response?.data?.message || err.message}`);
             }
          }

          if (errorCount > 0) {
             alert(`Import terminé.\nSuccès: ${successCount}\nErreurs: ${errorCount}\n\nDétails des erreurs:\n${errorDetails.slice(0, 10).join('\n')}${errorDetails.length > 10 ? '\n...' : ''}`);
          } else {
             alert(`Import terminé avec succès. ${successCount} utilisateurs ajoutés.`);
          }
          
          fetchUsers();
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }
        } catch (error) {
          console.error("Erreur lors de la lecture du fichier Excel", error);
          alert("Erreur lors de la lecture du fichier Excel.");
        } finally {
            setIsSubmitLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
       console.error("Erreur d'import", error);
       alert("Erreur lors du chargement de l'importeur Excel.");
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setSelectedAvatar(null);
    reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        matricule: user.matricule || '',
        role: user.role,
        schoolId: user.schoolId || '',
        phone: user.phone || '',
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
        await api.put(`/users/${editingUser.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
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
    setSelectedAvatar(null);
    
    let defaultRole = 'APPRENANT';
    if (selectedGroupId === 'super_admin') defaultRole = 'SUPER_ADMIN';
    else if (selectedGroupId === 'directeur') defaultRole = 'DIRECTEUR';
    else if (selectedGroupId === 'educateur') defaultRole = 'EDUCATEUR';
    else if (selectedGroupId === 'enseignant') defaultRole = 'ENSEIGNANT';
    
    reset({
        firstName: '',
        lastName: '',
        email: '',
        matricule: '',
        phone: '',
        role: defaultRole,
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

        const formDataPayload = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
               formDataPayload.append(key, data[key]);
            }
        });
        if (selectedAvatar) {
            formDataPayload.append('avatar', selectedAvatar);
        }

        if (editingUser) {
            if (!data.password) {
                formDataPayload.delete('password');
            }
            setFormData(formDataPayload);
            setIsEditConfirmModalOpen(true);
        } else {
            await api.post('/users', formDataPayload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
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

  if (isModalOpen) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <PageHeader 
          title={editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
          subtitle="Remplissez les informations de l'utilisateur ci-dessous"
          action={
            <Button 
              variant="secondary" 
              onClick={() => setIsModalOpen(false)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Retour à la liste
            </Button>
          }
        />
        <div className="bg-brand-card p-6 md:p-10 rounded-2xl shadow-xl border border-brand-border">
          {submitError && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 text-sm border border-red-500/20 flex items-start gap-3">
              <UsersIcon className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Prénom</label>
                <input {...register('firstName', { required: true })} className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Nom</label>
                <input {...register('lastName', { required: true })} className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Matricule {editingUser ? '' : '(Optionnel)'}</label>
                <input 
                  {...register('matricule')} 
                  disabled={!!editingUser}
                  className={`w-full px-4 py-3 border border-brand-border rounded-xl focus:outline-none transition-all text-brand-text placeholder-brand-text-muted/50 ${editingUser ? 'bg-brand-sidebar cursor-not-allowed text-brand-text-muted opacity-70' : 'bg-brand-bg focus:ring-2 focus:ring-brand-accent focus:border-transparent'}`} 
                  placeholder={editingUser ? "Le matricule ne peut pas être modifié" : "Ex: MAT-2026-001"} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Email</label>
                <input {...register('email', { required: true })} type="email" className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Téléphone</label>
                <input {...register('phone')} placeholder="+225 07 00 00 00 00" className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50" />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Photo de Profil (Optionnel)</label>
                <input type="file" accept="image/*" onChange={(e) => setSelectedAvatar(e.target.files?.[0] || null)} className="w-full text-sm text-brand-text-muted file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-sidebar file:text-brand-accent hover:file:bg-brand-border transition-all cursor-pointer" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Mot de passe</label>
                <div className="relative">
                    <input 
                        {...register('password', { required: !editingUser, minLength: 6 })} 
                        type={showPassword ? "text" : "password"} 
                        className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50 pr-12" 
                        placeholder={editingUser ? "Laisser vide pour ne pas changer" : "••••••••"} 
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-white p-1 rounded transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-2">Rôle</label>
                <select {...register('role', { required: true })} className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text cursor-pointer">
                    <option value="APPRENANT">Élève (Apprenant)</option>
                    <option value="ENSEIGNANT">Enseignant</option>
                    {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'DIRECTEUR') && (
                        <option value="EDUCATEUR">Éducateur</option>
                    )}
                    {currentUser?.role === 'SUPER_ADMIN' && (
                        <>
                            <option value="DIRECTEUR">Directeur (Admin)</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                        </>
                    )}
                </select>
              </div>
            </div>

            {currentUser?.role === 'SUPER_ADMIN' && (
                <div>
                  <label className="block text-sm font-medium text-brand-text-muted mb-2">École d'affectation</label>
                  <select {...register('schoolId')} className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text cursor-pointer">
                      <option value="">Aucune (Global / Réseau)</option>
                      {schools.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
            )}

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-brand-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitLoading}
                className="px-6 py-2.5"
              >
                {editingUser ? 'Enregistrer les modifications' : 'Créer le compte'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title={selectedGroup ? selectedGroup.title : 'Annuaire des Utilisateurs'}
        subtitle={selectedGroup ? `Affichage de ${filteredAndSortedUsers.length} sur ${selectedGroup.count} membres` : "Gérez les accès et rôles de la plateforme"}
        action={
            <div className="flex flex-wrap items-center gap-2">
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImportExcel}
                />
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} title="Télécharger le modèle Excel">
                    <Download className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Modèle Excel</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={isSubmitLoading}>
                    <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Importer</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button 
                    variant="primary"
                    size="sm"
                    onClick={openCreateModal}
                    leftIcon={<Plus className="w-4 h-4" />}
                >
                    Ajouter
                </Button>
            </div>
        }
      />

      {/* ── TOP ROLE SELECTOR TABS & VIEW TOGGLE ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-card p-2 rounded-2xl border border-brand-border shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {groups.map((grp) => {
            const isSelected = selectedGroupId === grp.id;
            return (
              <button
                key={grp.id}
                onClick={() => handleGroupSelect(grp.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20'
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar'
                }`}
              >
                {grp.id === 'all' && <UsersIcon className="w-3.5 h-3.5" />}
                {grp.id === 'super_admin' && <UserCog className="w-3.5 h-3.5" />}
                {grp.id === 'directeur' && <Building2 className="w-3.5 h-3.5" />}
                {grp.id === 'educateur' && <UserCog className="w-3.5 h-3.5" />}
                {grp.id === 'enseignant' && <GraduationCap className="w-3.5 h-3.5" />}
                {grp.id === 'eleve' && <School className="w-3.5 h-3.5" />}
                <span>{grp.title}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-brand-sidebar text-brand-text-muted border border-brand-border'
                }`}>
                  {grp.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={() => handleGroupSelect(null)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedGroupId === null 
                ? 'bg-brand-accent text-white border-brand-accent' 
                : 'bg-brand-sidebar border-brand-border text-brand-text-muted hover:text-brand-text hover:border-brand-accent/50'
            }`}
            title="Vue Grille par Groupe"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Cartes</span>
          </button>
          <button
            onClick={() => handleGroupSelect(selectedGroupId || 'all')}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedGroupId !== null 
                ? 'bg-brand-accent text-white border-brand-accent' 
                : 'bg-brand-sidebar border-brand-border text-brand-text-muted hover:text-brand-text hover:border-brand-accent/50'
            }`}
            title="Vue Tableau Détaillé"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Tableau</span>
          </button>
        </div>
      </div>

      {isLoading ? (
          <div className="flex justify-center py-24 bg-brand-card rounded-2xl border border-brand-border">
              <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          </div>
      ) : selectedGroupId === null ? (
        /* ── GRID CARDS VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {groups.filter(g => g.id !== 'all').map((group) => (
            <div 
              key={group.id}
              onClick={() => handleGroupSelect(group.id)}
              className="bg-brand-card rounded-2xl shadow-lg hover:shadow-brand-accent/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-brand-border group overflow-hidden flex flex-col h-full relative"
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
                        {group.count} {group.count === 1 ? 'membre' : 'membres'}
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
                  Accéder à la liste des {group.count} {group.title.toLowerCase()}s
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── TABLE VIEW WITH COMPLETE FILTERS & SORTING ── */
        <div className="bg-brand-card shadow-lg rounded-2xl overflow-hidden border border-brand-border">
          {/* Advanced Filter Toolbar */}
          <div className="p-4 border-b border-brand-border/50 bg-brand-sidebar/30 flex flex-col gap-3">
             <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-brand-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text"
                        placeholder="Rechercher par nom, matricule, email, école..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-9 py-2.5 text-sm bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Super Admin School Filter */}
                    {currentUser?.role === 'SUPER_ADMIN' && schools.length > 0 && (
                      <select 
                          value={schoolFilter}
                          onChange={e => { setSchoolFilter(e.target.value); setCurrentPage(1); }}
                          className="px-3 py-2.5 text-xs font-semibold bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent transition-all cursor-pointer max-w-[200px]"
                      >
                          <option value="ALL">Toutes les écoles</option>
                          {schools.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                      </select>
                    )}

                    {/* Level Filter for Students and Teachers */}
                    {(selectedGroupId === 'eleve' || selectedGroupId === 'enseignant' || selectedGroupId === 'all') && (
                        <select 
                            value={levelFilter}
                            onChange={e => { setLevelFilter(e.target.value); setCurrentPage(1); }}
                            className="px-3 py-2.5 text-xs font-semibold bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent transition-all cursor-pointer"
                        >
                            <option value="ALL">Tous les niveaux</option>
                            {Array.from(new Set(users.flatMap(u => [
                                ...(u.enrollments || []).map(e => e.class.niveau?.nom),
                                ...(u.teacherClasses || []).map(tc => tc.class.niveau?.nom)
                            ]).filter(Boolean))).map(lvl => (
                                <option key={lvl} value={lvl}>{lvl}</option>
                            ))}
                        </select>
                    )}

                    {/* Teaching Type Filter */}
                    <select 
                        value={teachingTypeFilter}
                        onChange={e => { setTeachingTypeFilter(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2.5 text-xs font-semibold bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent transition-all cursor-pointer hidden sm:block"
                    >
                        <option value="ALL">Tous types d'enseignement</option>
                        {Array.from(new Set(users.map(u => u.school?.teachingType?.name).filter(Boolean))).map(tt => (
                            <option key={tt} value={tt}>{tt}</option>
                        ))}
                    </select>

                    {/* Reset Filters */}
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="px-3 py-2.5 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Réinitialiser les filtres"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Effacer</span>
                      </button>
                    )}
                </div>
             </div>

             {/* Results Count & Active Info */}
             <div className="flex items-center justify-between text-xs text-brand-text-muted px-1">
                <span>
                  <strong>{filteredAndSortedUsers.length}</strong> {filteredAndSortedUsers.length === 1 ? 'utilisateur trouvé' : 'utilisateurs trouvés'}
                  {hasActiveFilters && ' (filtré)'}
                </span>
                <div className="flex items-center gap-2">
                   <span>Tri : <strong className="text-brand-text">{sortField === 'name' ? 'Nom' : sortField === 'role' ? 'Rôle' : sortField === 'school' ? 'École' : sortField === 'class' ? 'Classe' : sortField} ({sortOrder === 'asc' ? 'A→Z' : 'Z→A'})</strong></span>
                </div>
             </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-brand-border">
              <thead className="bg-brand-sidebar">
                <tr>
                  <th 
                    onClick={() => handleSort('name')}
                    className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider cursor-pointer hover:text-brand-accent transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Identité</span>
                      {sortField === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-brand-accent" /> : <ArrowDown className="w-3.5 h-3.5 text-brand-accent" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('role')}
                    className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider cursor-pointer hover:text-brand-accent transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Rôle</span>
                      {sortField === 'role' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-brand-accent" /> : <ArrowDown className="w-3.5 h-3.5 text-brand-accent" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('class')}
                    className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider cursor-pointer hover:text-brand-accent transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Classe / Matière</span>
                      {sortField === 'class' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-brand-accent" /> : <ArrowDown className="w-3.5 h-3.5 text-brand-accent" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('school')}
                    className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider cursor-pointer hover:text-brand-accent transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Établissement</span>
                      {sortField === 'school' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-brand-accent" /> : <ArrowDown className="w-3.5 h-3.5 text-brand-accent" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-brand-text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border bg-brand-card">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-brand-text-muted">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UsersIcon className="w-8 h-8 text-brand-text-muted/50" />
                        <p className="font-semibold text-sm">Aucun utilisateur ne correspond à vos critères</p>
                        {hasActiveFilters && (
                          <button onClick={resetFilters} className="text-xs text-brand-accent hover:underline mt-1 cursor-pointer">
                            Réinitialiser les filtres
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-brand-sidebar/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full border border-brand-border object-cover" />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-brand-sidebar border border-brand-border flex items-center justify-center font-bold text-brand-accent text-xs shrink-0">
                                    {u.firstName?.[0] || 'U'}{u.lastName?.[0] || ''}
                                </div>
                            )}
                            <div>
                                <div className="text-sm font-bold text-brand-text">{u.firstName} {u.lastName}</div>
                                <div className="text-xs text-brand-text-muted">{u.email}</div>
                                {u.matricule && <div className="text-[10px] text-brand-accent font-mono mt-0.5">Matricule: {u.matricule}</div>}
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-full ${getRoleBadgeStyle(u.role)}`}>
                          {formatRole(u.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-brand-text-muted">
                            {u.role === 'APPRENANT' ? (
                                u.enrollments?.[0]?.class?.name ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                      {u.enrollments[0].class.name}
                                    </span>
                                    {u.enrollments[0]?.class?.niveau?.nom && (
                                      <span className="text-[11px] text-brand-text-muted font-medium">
                                        ({u.enrollments[0].class.niveau.nom})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="italic text-xs text-brand-text-muted">Non inscrit</span>
                                )
                            ) : u.role === 'ENSEIGNANT' ? (
                                u.teacherClasses && u.teacherClasses.length > 0 ? (
                                  <div className="space-y-1.5 max-w-xs md:max-w-sm">
                                    {/* Classes */}
                                    <div className="flex flex-wrap items-center gap-1">
                                      {Array.from(new Set(u.teacherClasses.map(tc => tc.class?.name).filter(Boolean))).map((cName, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                          {cName}
                                        </span>
                                      ))}
                                    </div>
                                    {/* All Subjects */}
                                    <div className="flex flex-wrap items-center gap-1">
                                      {Array.from(new Set(u.teacherClasses.map(tc => tc.subject?.name).filter(Boolean))).map((sName, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-sidebar text-brand-accent border border-brand-border shadow-xs" title={sName}>
                                          📚 {sName}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="italic text-xs text-brand-text-muted">Aucune affectation</span>
                                )
                            ) : u.role === 'EDUCATEUR' ? (
                                <span className="text-xs font-semibold text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                                  <span>Vie Scolaire</span>
                                </span>
                            ) : (
                              <span className="text-xs text-brand-text-muted">-</span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-brand-text-muted">
                          {u.school?.name ? (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-brand-accent/70 shrink-0" />
                              <span className="truncate max-w-[200px]" title={u.school.name}>{u.school.name}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-brand-text-muted/60 italic">Administration Centrale</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end gap-2">
                              {(currentUser?.role !== 'SUPER_ADMIN' || u.id !== currentUser?.id) && (
                                <button 
                                    onClick={() => {
                                        const prefix = currentUser?.role === 'SUPER_ADMIN' ? '/admin' : currentUser?.role === 'DIRECTEUR' ? '/directeur' : currentUser?.role === 'EDUCATEUR' ? '/educateur' : '';
                                        navigate(`${prefix}/chat?userId=${u.id}`);
                                    }}
                                    className="p-2 text-brand-accent hover:text-white bg-brand-sidebar hover:bg-brand-accent rounded-lg transition border border-transparent hover:border-brand-accent cursor-pointer"
                                    title="Envoyer un message"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                              )}
                              {(currentUser?.role === 'SUPER_ADMIN' || 
                                (currentUser?.role === 'DIRECTEUR' && u.role !== 'SUPER_ADMIN') ||
                                (currentUser?.role === 'EDUCATEUR' && (u.role === 'ENSEIGNANT' || u.role === 'APPRENANT' || u.id === currentUser?.id))) && (
                                <button 
                                    onClick={() => handleEditClick(u)}
                                    className="p-2 text-brand-text-muted hover:text-white bg-brand-sidebar hover:bg-brand-border rounded-lg transition border border-transparent hover:border-brand-border cursor-pointer"
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
                                    className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition cursor-pointer"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-brand-border bg-brand-sidebar/30 gap-4">
              <div className="text-sm text-brand-text-muted">
                Affichage de <span className="font-medium text-brand-text">{filteredAndSortedUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> à <span className="font-medium text-brand-text">{Math.min(currentPage * itemsPerPage, filteredAndSortedUsers.length)}</span> sur <span className="font-medium text-brand-text">{filteredAndSortedUsers.length}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-brand-card border border-brand-border rounded-lg hover:bg-brand-sidebar disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition-colors font-medium shadow-sm cursor-pointer"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1 hidden sm:flex">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-colors cursor-pointer ${currentPage === i + 1 ? 'bg-brand-accent text-white shadow-md' : 'bg-brand-card border border-brand-border text-brand-text hover:bg-brand-sidebar'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm bg-brand-card border border-brand-border rounded-lg hover:bg-brand-sidebar disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition-colors font-medium shadow-sm cursor-pointer"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
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
