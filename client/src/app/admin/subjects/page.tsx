import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, BookOpen, Trash2, Edit2, Eye, Search,
  Building2, CheckCircle2, XCircle, Code, Layers, Sparkles
} from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface SchoolModel {
  id: string;
  name: string;
  ville?: string;
  code?: string;
}

interface SubjectModel {
  id: string;
  name: string;
  code?: string;
  schoolId: string;
  school?: SchoolModel;
  _count?: { courses: number; grades: number };
}

type FormData = { name: string; code?: string; schoolId?: string };

export default function SubjectsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [schools, setSchools] = useState<SchoolModel[]>([]);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editingSubject, setEditingSubject] = useState<SubjectModel | null>(null);
  const [viewingSubject, setViewingSubject] = useState<SubjectModel | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<SubjectModel | null>(null);

  // Form
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const url = isSuperAdmin && selectedSchoolFilter !== 'ALL'
        ? `/subjects?schoolId=${selectedSchoolFilter}`
        : '/subjects';
      const response = await api.get(url);
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      showToast("Erreur lors du chargement des matières", 'error');
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
    fetchSubjects();
    fetchSchools();
  }, [selectedSchoolFilter]);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const openCreateModal = () => {
    setEditingSubject(null);
    reset({ name: '', code: '', schoolId: schools[0]?.id || '' });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (subject: SubjectModel) => {
    setEditingSubject(subject);
    reset({
      name: subject.name,
      code: subject.code || '',
      schoolId: subject.schoolId,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openViewModal = async (subject: SubjectModel) => {
    setViewingSubject(subject);
    setIsViewModalOpen(true);
    try {
      const res = await api.get(`/subjects/${subject.id}`);
      setViewingSubject(res.data);
    } catch { /* keep current */ }
  };

  const onSubmitForm = async (data: FormData) => {
    if (!data.name.trim()) { setFormError("Le nom de la matière est requis."); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingSubject) {
        const res = await api.put(`/subjects/${editingSubject.id}`, data);
        setSubjects(prev => prev.map(s => s.id === editingSubject.id ? res.data : s));
        showToast("Matière mise à jour avec succès.");
      } else {
        const res = await api.post('/subjects', data);
        setSubjects(prev => [res.data, ...prev]);
        showToast("Nouvelle matière ajoutée avec succès.");
      }
      setIsFormModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingSubject) return;
    try {
      await api.delete(`/subjects/${deletingSubject.id}`);
      setSubjects(prev => prev.filter(s => s.id !== deletingSubject.id));
      showToast("Matière supprimée avec succès.");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erreur lors de la suppression.", 'error');
    } finally {
      setDeletingSubject(null);
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const q = search.toLowerCase();
    const matchName = s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q));
    const matchSchool = !s.school?.name || s.school.name.toLowerCase().includes(q);
    return matchName || matchSchool;
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
        title="Gestion des Matières"
        description="Catalogue et configuration des disciplines enseignées dans l'établissement."
      >
        <Button variant="glow" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nouvelle Matière
        </Button>
      </PageHeader>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par matière, code..."
            className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-medium"
          />
        </div>

        {isSuperAdmin && schools.length > 0 && (
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedSchoolFilter}
              onChange={e => setSelectedSchoolFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-250 rounded-xl outline-none cursor-pointer focus:border-emerald-500"
            >
              <option value="ALL">Toutes les écoles</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid or Empty */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs font-bold text-slate-500">Chargement des matières...</span>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-800 text-base">Aucune matière trouvée</p>
          <p className="text-xs text-slate-400 mt-1">Cliquez sur "Nouvelle Matière" pour en ajouter une.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  {subject.code && (
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                      {subject.code}
                    </span>
                  )}
                </div>

                <h3 className="font-black text-slate-900 text-base mb-1 group-hover:text-emerald-700 transition-colors">
                  {subject.name}
                </h3>

                <p className="text-xs font-mono text-slate-400 font-medium mb-3">
                  slug: {generateSlug(subject.name)}
                </p>

                {isSuperAdmin && subject.school && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold mb-3">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{subject.school.name}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                <span className="text-[11px] font-bold text-slate-500">
                  {subject._count?.courses ?? 0} cours rattaché(s)
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openViewModal(subject)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    title="Voir les détails"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(subject)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Éditer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setDeletingSubject(subject); setIsDeleteModalOpen(true); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ───────────────────────── MODAL: CREATE / EDIT ───────────────────────── */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingSubject ? "Modifier la matière" : "Nouvelle Matière"}
        size="md"
        accentColor="green"
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {formError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
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
              Nom de la matière <span className="text-emerald-600">*</span>
            </label>
            <input
              {...register('name', { required: true })}
              placeholder="Ex: Mathématiques, Histoire-Géographie..."
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              autoFocus
            />
          </div>

          {watch('name') && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Slug généré :</span>
              <span className="text-emerald-700 font-bold">{generateSlug(watch('name'))}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Code (Optionnel)
            </label>
            <input
              {...register('code')}
              placeholder="Ex: MATHS, HIST-GEO"
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold uppercase"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsFormModalOpen(false)}>Annuler</Button>
            <Button type="submit" variant="glow" isLoading={submitting}>
              {editingSubject ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ───────────────────────── MODAL: VIEW DETAILS ───────────────────────── */}
      {viewingSubject && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Détails de la matière"
          size="md"
          accentColor="cyan"
          footer={<Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Fermer</Button>}
        >
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 font-mono">ID: {viewingSubject.id}</span>
                {viewingSubject.code && (
                  <span className="font-mono text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                    {viewingSubject.code}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-1">{viewingSubject.name}</h3>
              <p className="text-xs font-mono text-emerald-700 font-bold mb-4">slug: {generateSlug(viewingSubject.name)}</p>

              {viewingSubject.school && (
                <div className="mb-4 p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2 font-bold text-slate-700">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  {viewingSubject.school.name} ({viewingSubject.school.ville || 'Abidjan'})
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cours rattachés</span>
                  <span className="font-bold text-slate-900">{viewingSubject._count?.courses ?? 0}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Évaluations / Notes</span>
                  <span className="font-bold text-slate-900">{viewingSubject._count?.grades ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────── DELETE CONFIRMATION ───────────────────────── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer la matière"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${deletingSubject?.name}" ?`}
        confirmText="Oui, supprimer"
        variant="danger"
      />
    </div>
  );
}
