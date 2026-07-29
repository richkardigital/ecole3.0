import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { 
  Plus, Edit2, Trash2, Power, Eye, Search, Building2, 
  CheckCircle2, XCircle, RefreshCw, Filter, Layers, Code, School
} from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface SchoolTypeItem {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  _count?: { schools: number };
  schools?: { id: string; name: string; ville: string; code: string; isActive?: boolean }[];
}

export default function SchoolTypesPage() {
  const { success, error: toastError } = useToast();
  const [types, setTypes] = useState<SchoolTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected items
  const [editingType, setEditingType] = useState<SchoolTypeItem | null>(null);
  const [viewingType, setViewingType] = useState<SchoolTypeItem | null>(null);
  const [deletingType, setDeletingType] = useState<SchoolTypeItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({ name: '', code: '', description: '', isActive: true });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/school-types');
      setTypes(res.data);
    } catch (error) {
      console.error(error);
      toastError("Erreur lors du chargement des types d'établissement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData({ name: '', code: '', description: '', isActive: true });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item: SchoolTypeItem) => {
    setEditingType(item);
    setFormData({ 
      name: item.name, 
      code: item.code || '', 
      description: item.description || '', 
      isActive: item.isActive 
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenView = async (item: SchoolTypeItem) => {
    setViewingType(item);
    setIsViewModalOpen(true);
    try {
      const res = await api.get(`/school-types/${item.id}`);
      setViewingType(res.data);
    } catch (err) {
      console.error("Error fetching school type details", err);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Le nom du type d'établissement est obligatoire.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingType) {
        await api.put(`/school-types/${editingType.id}`, formData);
        success("Type d'établissement mis à jour avec succès !");
      } else {
        await api.post('/school-types', formData);
        success("Nouveau type d'établissement créé avec succès !");
      }
      setIsFormModalOpen(false);
      fetchTypes();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: SchoolTypeItem) => {
    try {
      const res = await api.patch(`/school-types/${item.id}/toggle-active`);
      success(res.data.message || "Statut mis à jour");
      setTypes(prev => prev.map(t => t.id === item.id ? { ...t, isActive: !t.isActive } : t));
    } catch (err: any) {
      toastError("Erreur lors de la mise à jour du statut");
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    try {
      await api.delete(`/school-types/${deletingType.id}`);
      success("Type d'établissement supprimé avec succès");
      setIsDeleteModalOpen(false);
      setDeletingType(null);
      fetchTypes();
    } catch (err: any) {
      toastError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const filteredTypes = types.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                          (t.code && t.code.toLowerCase().includes(search.toLowerCase())) ||
                          (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' ? true :
                          statusFilter === 'ACTIVE' ? t.isActive : !t.isActive;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Types d'établissement" 
        subtitle="Définissez et gérez les types d'écoles (Primaire, Collège, Lycée, etc.)"
        icon={<Building2 className="w-6 h-6 text-brand-accent" />}
        action={
          <Button onClick={handleOpenCreate} className="flex items-center gap-2 shadow-lg shadow-brand-accent/20">
            <Plus className="w-4 h-4" />
            Nouveau type d'établissement
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="bg-brand-card p-4 rounded-xl border border-brand-border/50 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input 
            type="text"
            placeholder="Rechercher par nom, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-surface border border-brand-border/50 rounded-lg pl-9 pr-4 py-2 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-accent"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
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

          <Button variant="outline" size="sm" onClick={fetchTypes} className="flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-card rounded-xl border border-brand-border/50 overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-brand-muted flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-accent" />
            Chargement des types d'établissement...
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="p-12 text-center text-brand-muted flex flex-col items-center gap-3">
            <Building2 className="w-12 h-12 text-brand-border opacity-50" />
            <p className="text-base font-semibold text-brand-text">Aucun type d'établissement trouvé</p>
            <Button onClick={handleOpenCreate} className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau type d'établissement
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-surface/80 text-brand-muted text-xs uppercase font-semibold border-b border-brand-border/50">
                <tr>
                  <th className="px-6 py-4">Nom du type</th>
                  <th className="px-4 py-4">Code</th>
                  <th className="px-4 py-4">Description</th>
                  <th className="px-4 py-4">Écoles associées</th>
                  <th className="px-4 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {filteredTypes.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-brand-text">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span>{item.name}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      {item.code ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-brand-surface text-brand-accent border border-brand-accent/20">
                          {item.code}
                        </span>
                      ) : (
                        <span className="text-xs text-brand-muted italic">-</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-xs text-brand-muted max-w-xs truncate">
                      {item.description || <span className="italic">Aucune description</span>}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-xs font-semibold text-brand-text">
                      <span className="px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-300">
                        {item._count?.schools || 0} école(s)
                      </span>
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

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenView(item)}
                          title="Voir les détails"
                          className="p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Éditer"
                          className="p-1.5 rounded-lg text-brand-accent hover:text-white hover:bg-brand-accent/20 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => { setDeletingType(item); setIsDeleteModalOpen(true); }}
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

      {/* CREATE / EDIT FORM MODAL */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingType ? "Éditer le type d'établissement" : "Nouveau type d'établissement"}
        size="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nom du Type *</label>
            <input 
              type="text"
              placeholder="Ex: Primaire, Collège, Lycée..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Code / Abréviation</label>
            <input 
              type="text"
              placeholder="Ex: PRIM, COL, LYC..."
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 uppercase focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
            <textarea 
              rows={3}
              placeholder="Brève description de ce type d'établissement..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Statut Actif</span>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                formData.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              {formData.isActive ? 'Actif' : 'Inactif'}
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement...' : editingType ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Détails du type d'établissement"
        size="md"
      >
        {viewingType && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewingType.name}</h3>
                {viewingType.code && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-100 text-emerald-800 mt-1 inline-block">
                    Code: {viewingType.code}
                  </span>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                viewingType.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {viewingType.isActive ? 'Actif' : 'Inactif'}
              </span>
            </div>

            {viewingType.description && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Description</h4>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">{viewingType.description}</p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center justify-between">
                <span>Écoles Rattachées</span>
                <span className="text-emerald-600 font-bold">{viewingType.schools?.length || 0} école(s)</span>
              </h4>

              {viewingType.schools && viewingType.schools.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {viewingType.schools.map(s => (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.name}</p>
                        <p className="text-[11px] text-slate-500">{s.ville} ({s.code})</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg text-center">Aucune école n'est rattachée à ce type pour le moment.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>Fermer</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le type d'établissement ?"
        message={`Êtes-vous sûr de vouloir supprimer "${deletingType?.name}" ?`}
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
}
