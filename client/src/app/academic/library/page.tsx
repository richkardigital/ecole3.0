import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  Search, FileText, Video, Download, ExternalLink, Filter, Plus,
  Trash2, Eye, BookOpen, GraduationCap, CheckCircle2, XCircle, Sparkles, Building2
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import ConfirmationModal from '@/components/ui/ConfirmModal';

interface Material {
  id: string;
  title: string;
  type: string;
  url: string;
  source?: string;
  courseId: string;
  createdAt: string;
  course: {
    class: {
      name: string;
      level?: string;
    };
    subject: {
      name: string;
    };
    teacher?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Course {
  id: string;
  class: { name: string };
  subject: { name: string };
}

export default function LibraryPage() {
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR' || user?.role === 'ENSEIGNANT';

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    type: 'PDF',
    url: '',
    source: '',
    file: null as File | null
  });

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses/library');
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching library:', error);
      showToast("Erreur lors du chargement de la bibliothèque", 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCourses = async () => {
    try {
      const response = await api.get('/courses');
      setMyCourses(response.data);
    } catch (error) {
      console.error("Error fetching courses", error);
    }
  };

  useEffect(() => {
    fetchMaterials();
    if (isTeacherOrAdmin) {
      fetchMyCourses();
    }
  }, [user]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return showToast("Veuillez sélectionner un cours", 'error');
    if (!newMaterial.title.trim()) return showToast("Veuillez entrer un titre", 'error');
    if (!newMaterial.file && !newMaterial.url) return showToast("Veuillez fournir un fichier ou un lien", 'error');

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('title', newMaterial.title);
    formData.append('type', newMaterial.type);
    if (newMaterial.source) formData.append('source', newMaterial.source);
    if (newMaterial.url) formData.append('url', newMaterial.url);
    if (newMaterial.file) formData.append('file', newMaterial.file);

    try {
      await api.post(`/courses/${selectedCourseId}/materials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast("Document ajouté avec succès !");
      setIsUploadModalOpen(false);
      setNewMaterial({ title: '', type: 'PDF', url: '', source: '', file: null });
      fetchMaterials();
    } catch (err) {
      console.error("Upload failed", err);
      showToast("Erreur lors de l'ajout du document", 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;
    try {
      await api.delete(`/courses/materials/${materialToDelete.id}`);
      setMaterials(prev => prev.filter(m => m.id !== materialToDelete.id));
      showToast("Document supprimé avec succès.");
    } catch (err: any) {
      showToast("Erreur lors de la suppression.", 'error');
    } finally {
      setMaterialToDelete(null);
    }
  };

  const availableLevels = Array.from(new Set(materials.map(m => m.course?.class?.level).filter(Boolean)));

  const filteredMaterials = materials.filter((material) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      material.title.toLowerCase().includes(q) ||
      (material.course?.subject?.name && material.course.subject.name.toLowerCase().includes(q)) ||
      (material.course?.class?.name && material.course.class.name.toLowerCase().includes(q));
    const matchesType = typeFilter === 'ALL' || material.type === typeFilter;
    const matchesLevel = levelFilter === 'ALL' || material.course?.class?.level === levelFilter;
    return matchesSearch && matchesType && matchesLevel;
  });

  const getIcon = (type: string) => {
    if (type === 'VIDEO' || type.includes('video')) return <Video className="w-5 h-5 text-red-600" />;
    return <FileText className="w-5 h-5 text-sky-600" />;
  };

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
        title="Bibliothèque de Cours" 
        description="Accédez aux supports pédagogiques, fiches de révision et ressources numérisées de l'établissement."
      >
        {isTeacherOrAdmin && (
          <Button 
            variant="glow"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Ajouter un document
          </Button>
        )}
      </PageHeader>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par titre, matière, classe..."
            className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {availableLevels.length > 0 && (
            <select
              className="px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-250 rounded-xl outline-none cursor-pointer focus:border-emerald-500"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="ALL">Tous les niveaux</option>
              {availableLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          )}

          <select
            className="px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-250 rounded-xl outline-none cursor-pointer focus:border-emerald-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Tous les types</option>
            <option value="PDF">PDF / Documents</option>
            <option value="VIDEO">Vidéos</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs font-bold text-slate-500">Chargement de la bibliothèque...</span>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-800 text-base">Aucun document trouvé</p>
          <p className="text-xs text-slate-400 mt-1">Modifiez vos critères de recherche ou ajoutez un nouveau document.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  {getIcon(material.type)}
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg chip-cyan">
                  {material.course?.subject?.name || 'Matière'}
                </span>
              </div>
              
              <h3 className="font-black text-slate-900 text-base mb-1.5 line-clamp-2" title={material.title}>
                {material.title}
              </h3>
              
              <p className="text-xs text-slate-500 font-medium mb-4">
                {material.course?.class?.name || 'Classe'}
                {material.course?.teacher && ` • Prof. ${material.course.teacher.lastName}`}
                {material.source && <span className="block text-[11px] mt-1 italic text-slate-400">Source : {material.source}</span>}
              </p>

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">
                  {new Date(material.createdAt).toLocaleDateString('fr-FR')}
                </span>

                <div className="flex items-center gap-2">
                  <a 
                    href={material.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                  >
                    {material.type === 'VIDEO' ? 'Regarder' : 'Télécharger'}
                    {material.type === 'VIDEO' ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  </a>

                  {isTeacherOrAdmin && (
                    <button
                      onClick={() => { setMaterialToDelete(material); setIsDeleteModalOpen(true); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ───────────────────────── UPLOAD MODAL ───────────────────────── */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Ajouter un document à la bibliothèque"
        size="md"
        accentColor="green"
      >
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Cours concerné <span className="text-emerald-600">*</span>
            </label>
            <select 
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold cursor-pointer"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              required
            >
              <option value="">Sélectionner un cours...</option>
              {myCourses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class?.name || 'Classe'} - {c.subject?.name || 'Matière'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Titre du document <span className="text-emerald-600">*</span>
            </label>
            <input 
              type="text"
              placeholder="Ex: Chapitre 1 - Équations du second degré"
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              value={newMaterial.title}
              onChange={e => setNewMaterial({...newMaterial, title: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Source (Optionnel)
            </label>
            <input 
              type="text"
              placeholder="Ex: Ministère de l'Éducation, Manuel scolaire..."
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              value={newMaterial.source}
              onChange={e => setNewMaterial({...newMaterial, source: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Type de ressource
            </label>
            <select 
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold cursor-pointer"
              value={newMaterial.type}
              onChange={e => setNewMaterial({...newMaterial, type: e.target.value})}
            >
              <option value="PDF">Document (PDF, Word, Excel...)</option>
              <option value="VIDEO">Vidéo (Lien YouTube...)</option>
            </select>
          </div>

          {newMaterial.type === 'VIDEO' ? (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Lien Vidéo <span className="text-emerald-600">*</span>
              </label>
              <input 
                type="url"
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
                placeholder="https://youtube.com/..."
                value={newMaterial.url}
                onChange={e => setNewMaterial({...newMaterial, url: e.target.value})}
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Fichier <span className="text-emerald-600">*</span>
              </label>
              <input 
                type="file"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm font-semibold file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer"
                onChange={e => setNewMaterial({...newMaterial, file: e.target.files ? e.target.files[0] : null})}
                required={!newMaterial.url}
              />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button 
              variant="secondary"
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="glow"
              type="submit"
              isLoading={uploadLoading}
            >
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>

      {/* ───────────────────────── DELETE CONFIRMATION ───────────────────────── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer la ressource"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${materialToDelete?.title}" ?`}
        confirmText="Oui, supprimer"
        variant="danger"
      />
    </div>
  );
}
