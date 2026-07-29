import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Send, Users, School, Globe, Zap, Search, Eye, Edit2, Trash2, 
  Power, Plus, Filter, AlertTriangle, Info, Bell, CheckCircle2, XCircle, ArrowLeft, RefreshCw
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  priority: 'INFO' | 'NORMAL' | 'URGENT' | 'FLASH';
  isActive: boolean;
  targetRoles: string[];
  targetSchoolIds: string[];
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  school?: {
    id: string;
    name: string;
  };
}

interface BroadcastForm {
  title: string;
  content: string;
  priority: 'INFO' | 'NORMAL' | 'URGENT' | 'FLASH';
  imageUrl?: string;
  sendNotification: boolean;
}

interface SchoolData {
  id: string;
  name: string;
}

const ROLE_OPTIONS = [
  { key: 'ALL', label: 'Tous les utilisateurs' },
  { key: 'DIRECTEUR', label: 'Directeurs' },
  { key: 'EDUCATEUR', label: 'Éducateurs' },
  { key: 'ENSEIGNANT', label: 'Enseignants' },
  { key: 'APPRENANT', label: 'Apprenants' },
];

const Broadcast = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  
  // Tabs: 'LIST' | 'CREATE'
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');

  // State for News List
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Creation Form & Targeting
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BroadcastForm>({
    defaultValues: {
      priority: 'NORMAL',
      sendNotification: true
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetType, setTargetType] = useState<'GLOBAL' | 'SPECIFIC_SCHOOLS'>('GLOBAL');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['ALL']);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);

  // Modals state
  const [viewModalItem, setViewModalItem] = useState<NewsItem | null>(null);
  const [editModalItem, setEditModalItem] = useState<NewsItem | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<NewsItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit form states
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<'INFO' | 'NORMAL' | 'URGENT' | 'FLASH'>('NORMAL');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editTargetRoles, setEditTargetRoles] = useState<string[]>(['ALL']);
  const [editIsActive, setEditIsActive] = useState(true);

  // Load News List
  const fetchNews = async () => {
    setIsLoadingNews(true);
    try {
      const res = await api.get('/news');
      setNewsList(res.data);
    } catch (err: any) {
      console.error("Error fetching news", err);
      toastError("Erreur lors du chargement des annonces");
    } finally {
      setIsLoadingNews(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Fetch Schools for Super Admin targeting
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      const fetchSchools = async () => {
        try {
          const res = await api.get('/schools');
          setSchools(res.data);
        } catch (err) {
          console.error("Error fetching schools", err);
        }
      };
      fetchSchools();
    }
  }, [user]);

  // Handle Role Selection (Create)
  const toggleRoleSelection = (roleKey: string) => {
    if (roleKey === 'ALL') {
      setSelectedRoles(['ALL']);
      return;
    }

    setSelectedRoles(prev => {
      const filtered = prev.filter(r => r !== 'ALL');
      if (filtered.includes(roleKey)) {
        const next = filtered.filter(r => r !== roleKey);
        return next.length === 0 ? ['ALL'] : next;
      } else {
        return [...filtered, roleKey];
      }
    });
  };

  // Handle School Selection (Create)
  const toggleSchoolSelection = (id: string) => {
    setSelectedSchoolIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Handle Create Submit
  const onSubmitCreate = async (data: BroadcastForm) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: data.title,
        content: data.content,
        priority: data.priority,
        imageUrl: data.imageUrl || null,
        targetRoles: selectedRoles,
        targetSchoolIds: targetType === 'SPECIFIC_SCHOOLS' ? selectedSchoolIds : [],
        sendNotification: data.sendNotification
      };

      await api.post('/news', payload);
      success("Annonce / Flash News publiée avec succès !");
      
      reset();
      setSelectedRoles(['ALL']);
      setSelectedSchoolIds([]);
      setTargetType('GLOBAL');
      setActiveTab('LIST');
      fetchNews();
    } catch (err: any) {
      console.error("Error creating news", err);
      toastError(err.response?.data?.message || "Erreur lors de la publication");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active Status directly in Table
  const handleToggleActive = async (item: NewsItem) => {
    try {
      const res = await api.patch(`/news/${item.id}/toggle-active`);
      success(res.data.message || "Statut mis à jour");
      setNewsList(prev => prev.map(n => n.id === item.id ? { ...n, isActive: !n.isActive } : n));
    } catch (err: any) {
      toastError("Erreur lors du changement de statut");
    }
  };

  // Open Edit Modal
  const openEditModal = (item: NewsItem) => {
    setEditModalItem(item);
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditPriority(item.priority);
    setEditImageUrl(item.imageUrl || '');
    setEditTargetRoles(item.targetRoles && item.targetRoles.length > 0 ? item.targetRoles : ['ALL']);
    setEditIsActive(item.isActive);
  };

  // Submit Edit
  const handleUpdate = async () => {
    if (!editModalItem) return;
    setIsUpdating(true);
    try {
      const payload = {
        title: editTitle,
        content: editContent,
        priority: editPriority,
        imageUrl: editImageUrl || null,
        targetRoles: editTargetRoles,
        isActive: editIsActive
      };

      const res = await api.put(`/news/${editModalItem.id}`, payload);
      success("Annonce mise à jour avec succès !");
      setNewsList(prev => prev.map(n => n.id === editModalItem.id ? res.data : n));
      setEditModalItem(null);
    } catch (err: any) {
      toastError(err.response?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteModalItem) return;
    try {
      await api.delete(`/news/${deleteModalItem.id}`);
      success("Annonce supprimée");
      setNewsList(prev => prev.filter(n => n.id !== deleteModalItem.id));
      setDeleteModalItem(null);
    } catch (err: any) {
      toastError("Erreur lors de la suppression");
    }
  };

  // Filtered News List
  const filteredNews = newsList.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' ? true : 
                          statusFilter === 'ACTIVE' ? item.isActive : !item.isActive;
    const matchesPriority = priorityFilter === 'ALL' ? true : item.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Priority Badge Renderer
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'FLASH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse">
            <Zap className="w-3.5 h-3.5 fill-red-500" />
            FLASH NEWS
          </span>
        );
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            URGENT
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Info className="w-3.5 h-3.5" />
            INFO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Flash News & Annonces" 
        subtitle="Gérez, publiez et diffusez toutes les annonces flash et notifications de la plateforme."
        icon={<Zap className="w-6 h-6 text-brand-accent fill-brand-accent/20" />}
        action={
          activeTab === 'LIST' ? (
            <Button onClick={() => setActiveTab('CREATE')} className="flex items-center gap-2 shadow-lg shadow-brand-accent/20">
              <Plus className="w-4 h-4" />
              Diffuser une Annonce
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setActiveTab('LIST')} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voir la Liste des Annonces
            </Button>
          )
        }
      />

      {/* Tabs Switcher */}
      <div className="flex items-center gap-4 border-b border-brand-border/50 pb-3">
        <button
          onClick={() => setActiveTab('LIST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'LIST'
              ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/30'
              : 'text-brand-muted hover:text-brand-text hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4" />
          Toutes les Annonces ({newsList.length})
        </button>

        <button
          onClick={() => setActiveTab('CREATE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'CREATE'
              ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/30'
              : 'text-brand-muted hover:text-brand-text hover:bg-white/5'
          }`}
        >
          <Send className="w-4 h-4" />
          Diffuser une Annonce
        </button>
      </div>

      {/* TAB 1: LIST VIEW */}
      {activeTab === 'LIST' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-brand-card p-4 rounded-xl border border-brand-border/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input 
                type="text"
                placeholder="Rechercher par titre ou contenu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-brand-surface border border-brand-border/50 rounded-lg pl-9 pr-4 py-2 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-muted" />
                <span className="text-xs font-semibold text-brand-muted">Statut :</span>
                <select
                  value={statusFilter}
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                  className="bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="ACTIVE">Actifs uniquement</option>
                  <option value="INACTIVE">Inactifs uniquement</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-brand-muted">Priorité :</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="ALL">Toutes les priorités</option>
                  <option value="FLASH">FLASH NEWS</option>
                  <option value="URGENT">URGENT</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>

              <Button variant="outline" size="sm" onClick={fetchNews} className="flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNews ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-brand-card rounded-xl border border-brand-border/50 overflow-hidden shadow-lg">
            {isLoadingNews ? (
              <div className="p-12 text-center text-brand-muted flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-brand-accent" />
                Chargement des annonces...
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="p-12 text-center text-brand-muted flex flex-col items-center gap-3">
                <Zap className="w-12 h-12 text-brand-border opacity-50" />
                <p className="text-base font-semibold text-brand-text">Aucune annonce trouvée</p>
                <p className="text-sm text-brand-muted">Créez votre première annonce ou modifiez vos filtres de recherche.</p>
                <Button onClick={() => setActiveTab('CREATE')} className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Diffuser une Annonce
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-brand-surface/80 text-brand-muted text-xs uppercase font-semibold border-b border-brand-border/50">
                    <tr>
                      <th className="px-6 py-4">Titre & Message</th>
                      <th className="px-4 py-4">Priorité</th>
                      <th className="px-4 py-4">Cibles / Destinataires</th>
                      <th className="px-4 py-4">Auteur & École</th>
                      <th className="px-4 py-4">Statut</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30">
                    {filteredNews.map(item => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-brand-border/50 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center flex-shrink-0 text-brand-accent">
                                <Zap className="w-5 h-5" />
                              </div>
                            )}
                            <div className="max-w-md">
                              <h4 className="font-bold text-brand-text line-clamp-1">{item.title}</h4>
                              <p className="text-xs text-brand-muted line-clamp-2 mt-0.5">{item.content}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          {renderPriorityBadge(item.priority)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.targetRoles.includes('ALL') ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Tous les utilisateurs
                              </span>
                            ) : (
                              item.targetRoles.map(r => (
                                <span key={r} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-accent/20 text-brand-accent border border-brand-accent/30">
                                  {r}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-xs">
                            <span className="font-semibold text-brand-text">
                              {item.author ? `${item.author.firstName} ${item.author.lastName}` : 'Super Admin'}
                            </span>
                            {item.school && (
                              <p className="text-[11px] text-brand-muted flex items-center gap-1 mt-0.5">
                                <School className="w-3 h-3" />
                                {item.school.name}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                              item.isActive 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            {item.isActive ? 'Actif' : 'Inactif'}
                          </button>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-xs text-brand-muted">
                          {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewModalItem(item)}
                              title="Voir l'aperçu"
                              className="p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => openEditModal(item)}
                              title="Éditer"
                              className="p-1.5 rounded-lg text-brand-accent hover:text-white hover:bg-brand-accent/20 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setDeleteModalItem(item)}
                              title="Supprimer"
                              className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREATE / BROADCAST FORM */}
      {activeTab === 'CREATE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Target Selection */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-brand-card rounded-xl border border-brand-border/50 p-6 space-y-5 shadow-lg">
              <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-accent" />
                Cible & Destinataires
              </h2>

              {/* Target Scope (Super Admin) */}
              {user?.role === 'SUPER_ADMIN' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-brand-muted uppercase">Périmètre des Écoles</label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      targetType === 'GLOBAL' ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-brand-border/50 hover:bg-white/5'
                    }`}>
                      <input 
                        type="radio"
                        name="targetType"
                        checked={targetType === 'GLOBAL'}
                        onChange={() => setTargetType('GLOBAL')}
                        className="text-brand-accent"
                      />
                      <div>
                        <span className="text-sm font-semibold text-brand-text flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-brand-accent" />
                          Toutes les Écoles (Global)
                        </span>
                        <p className="text-xs text-brand-muted">Diffuser à l'ensemble de la plateforme</p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      targetType === 'SPECIFIC_SCHOOLS' ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-brand-border/50 hover:bg-white/5'
                    }`}>
                      <input 
                        type="radio"
                        name="targetType"
                        checked={targetType === 'SPECIFIC_SCHOOLS'}
                        onChange={() => setTargetType('SPECIFIC_SCHOOLS')}
                        className="text-brand-accent"
                      />
                      <div>
                        <span className="text-sm font-semibold text-brand-text flex items-center gap-1.5">
                          <School className="w-4 h-4 text-brand-accent" />
                          Sélectionner des Écoles
                        </span>
                        <p className="text-xs text-brand-muted">Cibler des établissements spécifiques</p>
                      </div>
                    </label>
                  </div>

                  {targetType === 'SPECIFIC_SCHOOLS' && (
                    <div className="mt-3 p-3 bg-brand-surface rounded-lg border border-brand-border/50 max-h-48 overflow-y-auto space-y-2">
                      {schools.map(s => (
                        <label key={s.id} className="flex items-center gap-2.5 text-xs text-brand-text cursor-pointer hover:text-white">
                          <input 
                            type="checkbox"
                            checked={selectedSchoolIds.includes(s.id)}
                            onChange={() => toggleSchoolSelection(s.id)}
                            className="rounded border-brand-border text-brand-accent"
                          />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Roles Target Selection */}
              <div className="space-y-3 pt-3 border-t border-brand-border/50">
                <label className="text-xs font-bold text-brand-muted uppercase">Rôles Destinataires</label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map(role => (
                    <label key={role.key} className="flex items-center gap-3 p-2.5 rounded-lg border border-brand-border/50 bg-brand-surface/50 cursor-pointer hover:bg-white/5">
                      <input 
                        type="checkbox"
                        checked={selectedRoles.includes(role.key)}
                        onChange={() => toggleRoleSelection(role.key)}
                        className="rounded border-brand-border text-brand-accent"
                      />
                      <span className="text-xs font-medium text-brand-text">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Message Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmitCreate)} className="bg-brand-card rounded-xl border border-brand-border/50 p-6 space-y-6 shadow-lg">
              <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
                <Send className="w-5 h-5 text-brand-accent" />
                Rédiger l'Annonce / Flash News
              </h2>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Titre de l'Annonce *</label>
                <input 
                  type="text"
                  placeholder="Ex: Urgent - Report de la réunion de rentrée..."
                  {...register('title', { required: "Le titre est requis" })}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
                />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Niveau de Priorité *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'NORMAL', label: 'NORMAL', icon: Info, color: 'border-slate-500/50 text-slate-400 bg-slate-500/10' },
                    { key: 'INFO', label: 'INFO', icon: Info, color: 'border-blue-500/50 text-blue-400 bg-blue-500/10' },
                    { key: 'URGENT', label: 'URGENT', icon: AlertTriangle, color: 'border-amber-500/50 text-amber-400 bg-amber-500/10' },
                    { key: 'FLASH', label: 'FLASH NEWS', icon: Zap, color: 'border-red-500/50 text-red-500 bg-red-500/10' },
                  ].map(p => (
                    <label key={p.key} className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer font-bold text-xs transition-all ${p.color}`}>
                      <input 
                        type="radio" 
                        value={p.key}
                        {...register('priority')}
                        className="hidden"
                      />
                      <p.icon className="w-4 h-4" />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">URL d'une Image de Couverture (Optionnel)</label>
                <input 
                  type="url"
                  placeholder="https://exemple.com/image.jpg"
                  {...register('imageUrl')}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Contenu / Message de l'Annonce *</label>
                <textarea 
                  rows={6}
                  placeholder="Rédigez le texte détaillé de votre annonce ici..."
                  {...register('content', { required: "Le contenu est requis" })}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg p-4 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
                />
                {errors.content && <p className="text-xs text-red-400 mt-1">{errors.content.message}</p>}
              </div>

              {/* Send Notification Checkbox */}
              <div className="p-4 rounded-lg bg-brand-surface border border-brand-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-brand-accent" />
                  <div>
                    <h4 className="text-sm font-semibold text-brand-text">Notification immédiate</h4>
                    <p className="text-xs text-brand-muted">Alerter les utilisateurs ciblés dans leur centre de notifications</p>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  {...register('sendNotification')}
                  className="w-5 h-5 rounded border-brand-border text-brand-accent focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border/50">
                <Button type="button" variant="outline" onClick={() => setActiveTab('LIST')}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Publication en cours...' : 'Publier & Diffuser'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PREVIEW MODAL */}
      {viewModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setViewModalItem(null)} 
          />

          {/* Panel */}
          <div className="relative z-10 bg-brand-card border border-brand-border/60 rounded-2xl max-w-xl w-full p-6 shadow-[0_25px_70px_-10px_rgba(0,0,0,0.5)] space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2">{renderPriorityBadge(viewModalItem.priority)}</div>
                <h3 className="text-xl font-bold text-brand-text">{viewModalItem.title}</h3>
                <p className="text-xs text-brand-muted mt-1">
                  Publié le {new Date(viewModalItem.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} par {viewModalItem.author ? `${viewModalItem.author.firstName} ${viewModalItem.author.lastName}` : 'Admin'}
                </p>
              </div>
              <button 
                onClick={() => setViewModalItem(null)} 
                className="p-2 text-brand-muted hover:text-white rounded-xl hover:bg-white/10 transition-colors shrink-0"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {viewModalItem.imageUrl && (
              <img src={viewModalItem.imageUrl} alt="" className="w-full h-48 object-cover rounded-xl border border-brand-border/50" />
            )}

            <div className="bg-brand-surface p-4 rounded-xl border border-brand-border/50 max-h-60 overflow-y-auto">
              <p className="text-sm text-brand-text whitespace-pre-wrap leading-relaxed">{viewModalItem.content}</p>
            </div>

            <div className="flex items-center justify-between text-xs text-brand-muted pt-3 border-t border-brand-border/40">
              <span className="font-medium">Destinataires : {viewModalItem.targetRoles.join(', ')}</span>
              <Button variant="outline" size="sm" onClick={() => setViewModalItem(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setEditModalItem(null)} 
          />

          {/* Panel */}
          <div className="relative z-10 bg-brand-card border border-brand-border/60 rounded-2xl max-w-xl w-full p-6 shadow-[0_25px_70px_-10px_rgba(0,0,0,0.5)] space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
              <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-brand-accent" />
                Éditer l'Annonce
              </h3>
              <button 
                onClick={() => setEditModalItem(null)} 
                className="p-1.5 text-brand-muted hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Titre</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Priorité</label>
                <select
                  value={editPriority}
                  onChange={(e: any) => setEditPriority(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="NORMAL">NORMAL</option>
                  <option value="INFO">INFO</option>
                  <option value="URGENT">URGENT</option>
                  <option value="FLASH">FLASH NEWS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-muted uppercase mb-1">Contenu</label>
                <textarea 
                  rows={4}
                  value={editContent} 
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border/50 rounded-lg p-3 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-brand-surface border border-brand-border/50">
                <span className="text-xs font-bold text-brand-text">Statut de l'Annonce</span>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    editIsActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}
                >
                  {editIsActive ? 'Actif' : 'Inactif'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border/40">
              <Button variant="outline" onClick={() => setEditModalItem(null)}>Annuler</Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fadeIn" 
            onClick={() => setDeleteModalItem(null)} 
          />

          {/* Panel */}
          <div className="relative z-10 bg-brand-card border border-brand-border/60 rounded-2xl max-w-md w-full p-6 shadow-[0_25px_70px_-10px_rgba(0,0,0,0.5)] space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-brand-text">Supprimer cette annonce ?</h3>
            <p className="text-xs text-brand-muted leading-relaxed">
              Êtes-vous sûr de vouloir supprimer "<span className="text-brand-text font-semibold">{deleteModalItem.title}</span>" ? Cette action est irréversible.
            </p>
            <div className="flex items-center justify-center gap-3 pt-3 border-t border-brand-border/40">
              <Button variant="outline" onClick={() => setDeleteModalItem(null)}>Annuler</Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border-none">
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Broadcast;
