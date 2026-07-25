import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import {
  Plus, Edit2, Trash2, Power, Eye, Search, Layers,
  Building2, CheckCircle2, XCircle, Sparkles, Code
} from 'lucide-react';
import api from '@/lib/api';

interface TeachingTypeItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  _count?: { schools: number };
  schools?: { id: string; name: string; ville: string; code: string }[];
}

export default function TeachingTypesPage() {
  const [types, setTypes] = useState<TeachingTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active items for actions
  const [editingType, setEditingType] = useState<TeachingTypeItem | null>(null);
  const [viewingType, setViewingType] = useState<TeachingTypeItem | null>(null);
  const [deletingType, setDeletingType] = useState<TeachingTypeItem | null>(null);

  // Form input
  const [formData, setFormData] = useState({ name: '', isActive: true });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/teaching-types');
      setTypes(res.data);
    } catch (error) {
      console.error(error);
      showToast("Erreur lors du chargement des types d'enseignement", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  // Helper to generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData({ name: '', isActive: true });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: TeachingTypeItem) => {
    setEditingType(item);
    setFormData({ name: item.name, isActive: item.isActive });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open View Modal
  const handleOpenView = async (item: TeachingTypeItem) => {
    setViewingType(item);
    setIsViewModalOpen(true);
    try {
      const res = await api.get(`/teaching-types/${item.id}`);
      setViewingType(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (item: TeachingTypeItem) => {
    setDeletingType(item);
    setIsDeleteModalOpen(true);
  };

  // Submit Form (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Le nom du type d'enseignement est requis.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingType) {
        // Update
        const res = await api.put(`/teaching-types/${editingType.id}`, formData);
        setTypes(prev => prev.map(t => t.id === editingType.id ? res.data : t));
        showToast("Type d'enseignement mis à jour avec succès.");
      } else {
        // Create
        const res = await api.post('/teaching-types', formData);
        setTypes(prev => [res.data, ...prev]);
        showToast("Nouveau type d'enseignement créé avec succès.");
      }
      setIsFormModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Une erreur est survenue lors de l'enregistrement.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status Action
  const handleToggleStatus = async (item: TeachingTypeItem) => {
    try {
      const res = await api.patch(`/teaching-types/${item.id}/toggle`);
      setTypes(prev => prev.map(t => t.id === item.id ? { ...t, isActive: res.data.isActive } : t));
      showToast(
        res.data.isActive 
          ? `Type "${item.name}" activé.` 
          : `Type "${item.name}" désactivé.`
      );
    } catch (err) {
      showToast("Erreur lors du changement de statut", 'error');
    }
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!deletingType) return;
    try {
      await api.delete(`/teaching-types/${deletingType.id}`);
      setTypes(prev => prev.filter(t => t.id !== deletingType.id));
      showToast("Type d'enseignement supprimé avec succès.");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Erreur lors de la suppression.";
      showToast(msg, 'error');
    } finally {
      setDeletingType(null);
    }
  };

  // Filtered List
  const filteredTypes = types.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      generateSlug(t.name).includes(search.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'ACTIVE' ? t.isActive :
      !t.isActive;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-3 animate-fade-in-up ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          {toastMessage.text}
        </div>
      )}

      {/* Page Header */}
      <PageHeader 
        title="Types d'enseignement" 
        description="Gérez et configurez la classification des établissements scolaires (Général, Technique, Mixte...)"
      >
        <Button variant="glow" onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Nouveau type
        </Button>
      </PageHeader>

      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par libellé ou slug..."
            className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-medium"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { key: 'ALL', label: 'Tous' },
            { key: 'ACTIVE', label: 'Actifs' },
            { key: 'INACTIVE', label: 'Inactifs' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === f.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-500">Chargement des types d'enseignement...</span>
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base">Aucun type d'enseignement trouvé</p>
              <p className="text-xs text-slate-400 mt-1">Essayez un autre mot-clé ou ajoutez un nouveau type.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Libellé / Nom</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Écoles rattachées</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTypes.map((type) => {
                  const slug = generateSlug(type.name);
                  const schoolCount = type._count?.schools ?? 0;

                  return (
                    <tr 
                      key={type.id} 
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name / Libellé */}
                      <td className="py-4 px-6 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-black text-xs shrink-0">
                            {type.name[0].toUpperCase()}
                          </div>
                          <span>{type.name}</span>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                          <Code className="w-3 h-3 text-slate-400" />
                          {slug}
                        </span>
                      </td>

                      {/* Attached Schools Count */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg chip-cyan">
                          <Building2 className="w-3.5 h-3.5" />
                          {schoolCount} école{schoolCount > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <Badge variant={type.isActive ? 'success' : 'danger'}>
                          {type.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Voir */}
                          <button
                            onClick={() => handleOpenView(type)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Éditer */}
                          <button
                            onClick={() => handleOpenEdit(type)}
                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Éditer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Activer / Désactiver */}
                          <button
                            onClick={() => handleToggleStatus(type)}
                            className={`p-2 rounded-lg transition-colors ${
                              type.isActive 
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={type.isActive ? 'Désactiver' : 'Activer'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Supprimer */}
                          <button
                            onClick={() => handleOpenDelete(type)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───────────────────────── MODAL: CREATE / EDIT ───────────────────────── */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingType ? "Éditer le type d'enseignement" : "Nouveau type d'enseignement"}
        size="md"
        accentColor="green"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {formError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Libellé */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Libellé / Nom officiel <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Enseignement Général (Primaire / Collège / Lycée)"
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              required
              autoFocus
            />
          </div>

          {/* Slug Preview */}
          {formData.name && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Slug généré automatiquement :</span>
              <span className="text-emerald-700 font-bold">{generateSlug(formData.name)}</span>
            </div>
          )}

          {/* Statut Active Toggle */}
          <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-900">Activer immédiatement ce type</p>
              <p className="text-[11px] text-slate-500">Sera sélectionnable lors de la création d'écoles</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                formData.isActive ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsFormModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="glow" isLoading={submitting}>
              {editingType ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ───────────────────────── MODAL: VIEW DETAILS ───────────────────────── */}
      {viewingType && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Détails du type d'enseignement"
          size="md"
          accentColor="cyan"
          footer={
            <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>
              Fermer
            </Button>
          }
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={viewingType.isActive ? 'success' : 'danger'}>
                  {viewingType.isActive ? 'Actif' : 'Inactif'}
                </Badge>
                <span className="text-[10px] font-bold text-slate-400 font-mono">ID: {viewingType.id}</span>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-1">{viewingType.name}</h3>
              <p className="text-xs font-mono text-emerald-700 font-bold mb-4">
                slug: {generateSlug(viewingType.name)}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Créé le</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(viewingType.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Écoles associées</span>
                  <span className="font-bold text-slate-900">
                    {viewingType._count?.schools ?? viewingType.schools?.length ?? 0} établissement(s)
                  </span>
                </div>
              </div>
            </div>

            {/* List of schools using this type */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" /> Écoles rattachées
              </h4>

              {viewingType.schools && viewingType.schools.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {viewingType.schools.map((sch) => (
                    <div key={sch.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{sch.name}</p>
                        <p className="text-[10px] text-slate-400">{sch.ville}</p>
                      </div>
                      <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">{sch.code}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">
                  Aucune école rattachée à ce type pour le moment.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────── MODAL: DELETE CONFIRMATION ───────────────────────── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Supprimer ce type d'enseignement"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${deletingType?.name}" ? Cette action ne peut pas être annulée.`}
        confirmText="Oui, supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}
