import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, BookOpen, Trash2, Edit2, Eye, Search,
  CheckCircle2, XCircle, Code, Layers, Sparkles, Image as ImageIcon, GraduationCap
} from 'lucide-react';
import { PRESET_COVERS, getSubjectIllustration } from '@/lib/subjectIllustrations';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export { PRESET_COVERS, getSubjectIllustration };

interface CourseItem {
  id: string;
  coefficient?: number;
  isPublished?: boolean;
  niveau?: { id?: string; nom: string };
  _count?: { chapters: number; assignments: number };
}

interface SubjectModel {
  id: string;
  name: string;
  code?: string;
  imageUrl?: string;
  coefficient?: number;
  courses?: CourseItem[];
  _count?: { courses: number; teacherClasses?: number };
}

type FormData = {
  name: string;
  code?: string;
  imageUrl?: string;
  coefficient?: number;
};

export default function SubjectsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
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
      const response = await api.get('/subjects');
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      showToast("Erreur lors du chargement des matières", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const openCreateModal = () => {
    setEditingSubject(null);
    reset({ name: '', code: '', imageUrl: '', coefficient: 1 });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (subject: SubjectModel) => {
    setEditingSubject(subject);
    reset({
      name: subject.name,
      code: subject.code || '',
      imageUrl: subject.imageUrl || '',
      coefficient: subject.coefficient || 1,
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
    return s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q));
  });

  const selectedName = watch('name') || '';
  const selectedImageUrl = watch('imageUrl');

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
        title="Gestion des Matières & Disciplines"
        description={isSuperAdmin ? "Catalogue national et configuration des disciplines enseignées avec illustrations automatiques." : "Consultez les matières disponibles. Seul l'administrateur peut les créer ou les modifier."}
      >
        {isSuperAdmin && (
          <Button variant="glow" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Nouvelle Matière
          </Button>
        )}
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
            className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          <span className="text-slate-900 font-extrabold">{filteredSubjects.length}</span> matière(s) au catalogue
        </div>
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
          {filteredSubjects.map((subject) => {
            const illustrationSrc = getSubjectIllustration(subject.name, subject.imageUrl);

            return (
              <div
                key={subject.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group overflow-hidden"
              >
                <div>
                  {/* Subject Banner / Illustration */}
                  <div className="relative h-32 w-full bg-slate-900 overflow-hidden shrink-0">
                    <img
                      src={illustrationSrc}
                      alt={subject.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                    
                    {subject.code && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="font-mono text-[10px] font-extrabold bg-black/60 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 backdrop-blur-md">
                          {subject.code}
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-2.5 left-3.5 right-3.5">
                      <h3 className="font-black text-white text-base tracking-tight drop-shadow-md line-clamp-1">
                        {subject.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-slate-400 font-semibold truncate">
                        slug: {generateSlug(subject.name)}
                      </span>
                      {subject.coefficient && (
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          Coef. {subject.coefficient}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {subject._count?.courses ?? 0} cours rattaché(s)
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openViewModal(subject)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
                      title="Voir les détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {isSuperAdmin && (
                      <>
                        <button
                          onClick={() => openEditModal(subject)}
                          className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-colors"
                          title="Éditer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeletingSubject(subject); setIsDeleteModalOpen(true); }}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────── MODAL: CREATE / EDIT ───────────────────────── */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingSubject ? "Modifier la matière" : "Nouvelle Matière"}
        size="lg"
        accentColor="green"
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {formError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Nom de la matière <span className="text-emerald-600">*</span>
              </label>
              <input
                {...register('name', { required: true })}
                placeholder="Ex: Mathématiques, Histoire-Géographie..."
                className="w-full px-4 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Code (Optionnel)
              </label>
              <input
                {...register('code')}
                placeholder="Ex: MATHS, HIST-GEO"
                className="w-full px-4 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Coefficient par défaut (Optionnel)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              {...register('coefficient', { valueAsNumber: true })}
              placeholder="Ex: 1, 2, 3..."
              className="w-full px-4 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold"
            />
          </div>

          {/* Preset / Custom Image Picker */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Illustration de la matière (Image de fond automatique ou personnalisée)
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 max-h-40 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-250">
              {Object.entries(PRESET_COVERS).map(([key, item]) => {
                const isSelected = selectedImageUrl === key || (!selectedImageUrl && getSubjectIllustration(selectedName) === item.src);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setValue('imageUrl', key)}
                    className={`relative rounded-xl overflow-hidden border p-1.5 flex flex-col items-center gap-1 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <img src={item.src} alt={item.label} className="w-full h-12 object-cover rounded-lg" />
                    <span className="text-[10px] font-bold text-slate-800 truncate w-full text-center">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                {...register('imageUrl')}
                placeholder="Ou saisir une clé de preset (math, french, etc.) ou une URL d'image..."
                className="w-full px-4 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-medium"
              />
            </div>
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
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
              <div className="relative h-40 w-full bg-slate-950 overflow-hidden">
                <img
                  src={getSubjectIllustration(viewingSubject.name, viewingSubject.imageUrl)}
                  alt={viewingSubject.name}
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-xl font-black text-white drop-shadow-md">{viewingSubject.name}</h3>
                  {viewingSubject.code && (
                    <span className="inline-block mt-1 font-mono text-xs font-extrabold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-md">
                      {viewingSubject.code}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-700 font-bold bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60">
                  <span>slug: {generateSlug(viewingSubject.name)}</span>
                  {viewingSubject.coefficient && (
                    <span className="text-slate-700 font-bold">Coef. par défaut : {viewingSubject.coefficient}</span>
                  )}
                </div>

                {/* Section Cours Rattachés */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      Cours rattachés à cette matière
                    </span>
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {viewingSubject._count?.courses ?? viewingSubject.courses?.length ?? 0}
                    </span>
                  </div>

                  {viewingSubject.courses && viewingSubject.courses.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {viewingSubject.courses.map((course, idx) => (
                        <div key={course.id || idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-bold text-slate-800">
                              {viewingSubject.name} — {course.niveau?.nom || 'Niveau scolaire'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                            {course.coefficient && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Coef. {course.coefficient}</span>}
                            {course._count?.chapters !== undefined && (
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                {course._count.chapters} chapitre(s)
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl text-center">
                      Aucun cours spécifique n'a encore été rattaché à cette matière.
                    </p>
                  )}
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
