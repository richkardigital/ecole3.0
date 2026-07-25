import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, Edit2, Trash2, Power, Eye, Search, Layers,
  Building2, CheckCircle2, XCircle, Code, School as SchoolIcon
} from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

interface SchoolModel {
  id: string;
  name: string;
  ville?: string;
  code?: string;
}

interface NiveauModel {
  id: string;
  nom: string;
  rang: number;
  isActive: boolean;
  schoolId: string;
  school?: SchoolModel;
  classes?: { id: string; name: string }[];
  _count?: { classes: number };
}

type FormData = { nom: string; rang: number; schoolId?: string };

export default function NiveauxPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [niveaux, setNiveaux] = useState<NiveauModel[]>([]);
  const [schools, setSchools] = useState<SchoolModel[]>([]);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editingNiveau, setEditingNiveau] = useState<NiveauModel | null>(null);
  const [viewingNiveau, setViewingNiveau] = useState<NiveauModel | null>(null);
  const [deletingNiveau, setDeletingNiveau] = useState<NiveauModel | null>(null);

  // Form
  const { register, handleSubmit, reset, watch } = useForm<FormData>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchNiveaux = async () => {
    try {
      setLoading(true);
      const url = isSuperAdmin && selectedSchoolFilter !== 'ALL'
        ? `/niveaux?schoolId=${selectedSchoolFilter}`
        : '/niveaux';
      const response = await api.get(url);
      setNiveaux(response.data);
    } catch (error) {
      console.error('Error fetching niveaux:', error);
      showToast("Erreur lors du chargement des niveaux", 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await api.get('/schools');
      setSchools(res.data);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  useEffect(() => {
    fetchNiveaux();
    fetchSchools();
  }, [selectedSchoolFilter]);

  const generateSlug = (nom: string) =>
    nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const openCreateModal = () => {
    setEditingNiveau(null);
    reset({ nom: '', rang: 1, schoolId: schools[0]?.id || '' });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (niveau: NiveauModel) => {
    setEditingNiveau(niveau);
    reset({
      nom: niveau.nom,
      rang: niveau.rang,
      schoolId: niveau.schoolId,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openViewModal = async (niveau: NiveauModel) => {
    setViewingNiveau(niveau);
    setIsViewModalOpen(true);
    try {
      const res = await api.get(`/niveaux/${niveau.id}`);
      setViewingNiveau(res.data);
    } catch { /* keep current */ }
  };

  const onSubmitForm = async (data: FormData) => {
    if (!data.nom.trim()) { setFormError("Le nom du niveau est requis."); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingNiveau) {
        const res = await api.put(`/niveaux/${editingNiveau.id}`, data);
        setNiveaux(prev => prev.map(n => n.id === editingNiveau.id ? res.data : n));
        showToast("Niveau scolaire mis à jour avec succès.");
      } else {
        const res = await api.post('/niveaux', data);
        setNiveaux(prev => [...prev, res.data]);
        showToast("Nouveau niveau scolaire créé avec succès.");
      }
      setIsFormModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (niveau: NiveauModel) => {
    try {
      const res = await api.patch(`/niveaux/${niveau.id}/toggle`);
      setNiveaux(prev => prev.map(n => n.id === niveau.id ? { ...n, isActive: res.data.isActive } : n));
      showToast(res.data.isActive ? `Niveau "${niveau.nom}" activé.` : `Niveau "${niveau.nom}" désactivé.`);
    } catch {
      showToast("Erreur lors du changement de statut", 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deletingNiveau) return;
    try {
      await api.delete(`/niveaux/${deletingNiveau.id}`);
      setNiveaux(prev => prev.filter(n => n.id !== deletingNiveau.id));
      showToast("Niveau scolaire supprimé avec succès.");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erreur lors de la suppression.", 'error');
    } finally {
      setDeletingNiveau(null);
    }
  };

  const filteredNiveaux = niveaux.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = n.nom.toLowerCase().includes(q) || generateSlug(n.nom).includes(q);
    const matchStatus = statusFilter === 'ALL' ? true : statusFilter === 'ACTIVE' ? n.isActive : !n.isActive;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-3 animate-fade-in-up ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          {toastMessage.text}
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Niveaux Scolaires"
        description="Gérez l'arborescence des niveaux (CP, CM2, 6ème, 3ème, Terminale...)"
      >
        <Button variant="glow" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nouveau niveau
        </Button>
      </PageHeader>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par niveau, slug..."
              className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-medium"
            />
          </div>

          {isSuperAdmin && schools.length > 0 && (
            <div className="relative">
              <select
                value={selectedSchoolFilter}
                onChange={e => setSelectedSchoolFilter(e.target.value)}
                className="px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-250 rounded-xl outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="ALL">Toutes les écoles</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          {[
            { key: 'ALL', label: 'Tous' },
            { key: 'ACTIVE', label: 'Actifs' },
            { key: 'INACTIVE', label: 'Inactifs' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === f.key ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-500">Chargement des niveaux...</span>
          </div>
        ) : filteredNiveaux.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-base">Aucun niveau trouvé</p>
            <p className="text-xs text-slate-400 mt-1">Cliquez sur "Nouveau niveau" pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Nom du Niveau</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Rang (Ordre)</th>
                  {isSuperAdmin && <th className="py-3.5 px-4">Établissement</th>}
                  <th className="py-3.5 px-4">Classes liées</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredNiveaux.map((niveau) => (
                  <tr key={niveau.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Name */}
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-black text-xs shrink-0">
                          {niveau.nom[0]}
                        </div>
                        <span>{niveau.nom}</span>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                        <Code className="w-3 h-3 text-slate-400" />
                        {generateSlug(niveau.nom)}
                      </span>
                    </td>

                    {/* Rang */}
                    <td className="py-4 px-4 font-mono text-xs font-bold text-slate-600">
                      #{niveau.rang || 0}
                    </td>

                    {/* School for Super Admin */}
                    {isSuperAdmin && (
                      <td className="py-4 px-4 text-xs font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {niveau.school?.name || 'Établissement'}
                        </span>
                      </td>
                    )}

                    {/* Classes Count */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg chip-cyan">
                        <SchoolIcon className="w-3.5 h-3.5" />
                        {niveau._count?.classes ?? 0} classe(s)
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <Badge variant={niveau.isActive ? 'success' : 'danger'}>
                        {niveau.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openViewModal(niveau)} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors" title="Voir">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(niveau)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Éditer">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(niveau)}
                          className={`p-2 rounded-lg transition-colors ${niveau.isActive ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                          title={niveau.isActive ? 'Désactiver' : 'Activer'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setDeletingNiveau(niveau); setIsDeleteModalOpen(true); }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
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

      {/* ───────────────────────── MODAL: CREATE / EDIT ───────────────────────── */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingNiveau ? "Modifier le niveau" : "Nouveau niveau scolaire"}
        size="md"
        accentColor="green"
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {formError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" /> <span>{formError}</span>
            </div>
          )}

          {isSuperAdmin && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Établissement scolaire <span className="text-emerald-600">*</span>
              </label>
              <select
                {...register('schoolId', { required: true })}
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold cursor-pointer"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.ville || 'Abidjan'})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Nom du niveau <span className="text-emerald-600">*</span>
            </label>
            <input
              {...register('nom', { required: true })}
              placeholder="Ex: CP1, CM2, 6ème, 3ème, Terminale A..."
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              autoFocus
            />
          </div>

          {watch('nom') && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Slug généré :</span>
              <span className="text-emerald-700 font-bold">{generateSlug(watch('nom'))}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Rang / Ordre d'affichage
            </label>
            <input
              type="number"
              {...register('rang', { valueAsNumber: true })}
              placeholder="Ex: 1, 2, 3..."
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsFormModalOpen(false)}>Annuler</Button>
            <Button type="submit" variant="glow" isLoading={submitting}>
              {editingNiveau ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ───────────────────────── MODAL: VIEW DETAILS ───────────────────────── */}
      {viewingNiveau && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Détails du niveau scolaire"
          size="md"
          accentColor="cyan"
          footer={<Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Fermer</Button>}
        >
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={viewingNiveau.isActive ? 'success' : 'danger'}>
                  {viewingNiveau.isActive ? 'Actif' : 'Inactif'}
                </Badge>
                <span className="text-[10px] font-bold text-slate-400 font-mono">Rang: #{viewingNiveau.rang || 0}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">{viewingNiveau.nom}</h3>
              <p className="text-xs font-mono text-emerald-700 font-bold mb-4">slug: {generateSlug(viewingNiveau.nom)}</p>
              
              {viewingNiveau.school && (
                <div className="mb-4 p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2 font-bold text-slate-700">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  {viewingNiveau.school.name} ({viewingNiveau.school.ville || 'Abidjan'})
                </div>
              )}

              <div className="pt-3 border-t border-slate-200/60 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Classes rattachées</span>
                <span className="font-bold text-slate-900">{viewingNiveau._count?.classes ?? viewingNiveau.classes?.length ?? 0} classe(s)</span>
              </div>
            </div>

            {/* Attached classes */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <SchoolIcon className="w-4 h-4 text-emerald-600" /> Liste des classes
              </h4>
              {viewingNiveau.classes && viewingNiveau.classes.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {viewingNiveau.classes.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{c.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">Aucune classe rattachée.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────── DELETE CONFIRMATION ───────────────────────── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer le niveau scolaire"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${deletingNiveau?.nom}" ?`}
        confirmText="Oui, supprimer"
        variant="danger"
      />
    </div>
  );
}
