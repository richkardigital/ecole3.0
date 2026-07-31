import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import {
  FileText, Film, Headphones, Image as ImageIcon, Link2, 
  Download, Trash2, Plus, Search, FileUp, Eye, Edit2, CheckCircle2, XCircle, FileDigit
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import ConfirmationModal from '@/components/ui/ConfirmModal';

interface Niveau {
  id: string;
  nom: string;
}

interface Resource {
  id: string;
  title: string;
  type: 'PDF' | 'VIDEO' | 'AUDIO' | 'IMAGE' | 'LIEN';
  url: string;
  niveauId: string;
  isPublished: boolean;
  niveau?: Niveau;
  createdAt: string;
  createdBy?: { id: string; firstName: string; lastName: string };
}

type FormData = {
  title: string;
  niveauId: string;
};

export default function LibraryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR';
  const isEnseignant = user?.role === 'ENSEIGNANT';
  const isApprenant = user?.role === 'APPRENANT';
  const canAdd = isAdmin || isEnseignant;
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedNiveauId, setSelectedNiveauId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Form Add
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData & { linkUrl?: string }>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  
  // Form Edit
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit } = useForm<FormData & { linkUrl?: string }>();
  const [editUploadType, setEditUploadType] = useState<'none' | 'file' | 'link'>('none');
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [niveauxRes, resourcesRes] = await Promise.all([
        api.get('/niveaux'),
        api.get(`/resources${selectedNiveauId !== 'ALL' ? `?niveauId=${selectedNiveauId}` : ''}`)
      ]);
      setNiveaux(niveauxRes.data);
      setResources(resourcesRes.data);
    } catch (err) {
      console.error("Error fetching library data:", err);
      showToast("Erreur lors du chargement des données", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedNiveauId]);

  // --- Add Handlers ---
  const openUploadModal = () => {
    reset({ title: '', niveauId: selectedNiveauId !== 'ALL' ? selectedNiveauId : '', linkUrl: '' });
    setSelectedFile(null);
    setUploadType('file');
    setFormError(null);
    setIsUploadModalOpen(true);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onUploadSubmit = async (data: FormData & { linkUrl?: string }) => {
    if (uploadType === 'file' && !selectedFile) {
      setFormError("Veuillez sélectionner un fichier.");
      return;
    }
    if (uploadType === 'file' && selectedFile && selectedFile.size > 100 * 1024 * 1024) {
      setFormError("Le fichier est trop volumineux. La taille maximum autorisée est de 100 Mo.");
      return;
    }
    if (uploadType === 'link' && !data.linkUrl) {
      setFormError("Veuillez entrer un lien valide.");
      return;
    }
    if (!data.niveauId) {
      setFormError("Veuillez sélectionner un niveau.");
      return;
    }

    setUploading(true);
    setFormError(null);
    
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('niveauId', data.niveauId);
      if (uploadType === 'file' && selectedFile) {
        formData.append('file', selectedFile);
      } else if (uploadType === 'link' && data.linkUrl) {
        formData.append('linkUrl', data.linkUrl);
      }

      const res = await api.post('/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setResources([res.data, ...resources]);
      showToast(isAdmin ? "Document publié avec succès" : "Document envoyé (en attente de publication)");
      setIsUploadModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  // --- Edit Handlers ---
  const openEditModal = (resource: Resource) => {
    setSelectedResource(resource);
    resetEdit({ title: resource.title, niveauId: resource.niveauId, linkUrl: '' });
    setEditUploadType('none');
    setEditSelectedFile(null);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const onEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setEditSelectedFile(e.target.files[0]);
    }
  };

  const onEditSubmit = async (data: FormData & { linkUrl?: string }) => {
    if (!selectedResource) return;
    
    if (editUploadType === 'file' && !editSelectedFile) {
      setFormError("Veuillez sélectionner un fichier pour le remplacement.");
      return;
    }
    if (editUploadType === 'file' && editSelectedFile && editSelectedFile.size > 100 * 1024 * 1024) {
      setFormError("Le fichier est trop volumineux. La taille maximum autorisée est de 100 Mo.");
      return;
    }
    if (editUploadType === 'link' && !data.linkUrl) {
      setFormError("Veuillez entrer un nouveau lien valide.");
      return;
    }

    setUploading(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('niveauId', data.niveauId);
      if (editUploadType === 'file' && editSelectedFile) {
        formData.append('file', editSelectedFile);
      } else if (editUploadType === 'link' && data.linkUrl) {
        formData.append('linkUrl', data.linkUrl);
      }

      const res = await api.put(`/resources/${selectedResource.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResources(resources.map(r => r.id === selectedResource.id ? res.data : r));
      showToast("Document modifié avec succès");
      setIsEditModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Erreur lors de la modification");
    } finally {
      setUploading(false);
    }
  };

  // --- Actions ---
  const confirmDelete = async () => {
    if (!resourceToDelete) return;
    try {
      await api.delete(`/resources/${resourceToDelete.id}`);
      setResources(resources.filter(r => r.id !== resourceToDelete.id));
      showToast("Document supprimé");
    } catch (err) {
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setResourceToDelete(null);
    }
  };

  const togglePublish = async (resource: Resource) => {
    try {
      const res = await api.patch(`/resources/${resource.id}/toggle-publish`, {
        isPublished: !resource.isPublished
      });
      setResources(resources.map(r => r.id === resource.id ? res.data : r));
      showToast(res.data.isPublished ? "Document publié" : "Document retiré de la publication");
    } catch (err) {
      showToast("Erreur lors de la modification du statut", "error");
    }
  };

  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const paginatedResources = filteredResources.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedNiveauId]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="w-5 h-5 text-red-500" />;
      case 'VIDEO': return <Film className="w-5 h-5 text-blue-500" />;
      case 'AUDIO': return <Headphones className="w-5 h-5 text-purple-500" />;
      case 'IMAGE': return <ImageIcon className="w-5 h-5 text-emerald-500" />;
      case 'LIEN': return <Link2 className="w-5 h-5 text-slate-500" />;
      default: return <FileDigit className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {toastMessage && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-xl text-white font-semibold shadow-2xl z-50 animate-in slide-in-from-top-2 ${toastMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toastMessage.text}
        </div>
      )}

      <PageHeader
        title="Bibliothèque de Cours"
        description={isApprenant ? "Consultez les supports de cours de votre niveau." : "Gérez les supports de cours globaux accessibles par niveau d'étude."}
      >
        {canAdd && (
          <Button variant="glow" onClick={openUploadModal} leftIcon={<Plus className="w-4 h-4" />}>
            Ajouter un document
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative w-full md:w-[28rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un document par titre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Niveau Select */}
        {!isApprenant && (
          <div className="w-full md:w-64">
            <select
              value={selectedNiveauId}
              onChange={(e) => setSelectedNiveauId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="ALL">Tous les niveaux</option>
              {niveaux.map((niveau) => (
                <option key={niveau.id} value={niveau.id}>
                  {niveau.nom}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Resource Grid/List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-slate-500">Chargement de la bibliothèque...</span>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
              <FileUp className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">Aucun document trouvé</p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedNiveauId !== 'ALL' || isApprenant
                  ? "Ce niveau ne contient aucun support de cours." 
                  : "Votre bibliothèque est vide. Commencez par ajouter un document."}
              </p>
            </div>
            {canAdd && (
              <Button variant="secondary" onClick={openUploadModal} leftIcon={<Plus className="w-4 h-4" />}>
                Ajouter un document
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6 w-12">Type</th>
                  <th className="py-3.5 px-4">Titre du cours</th>
                  <th className="py-3.5 px-4">Niveau</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Ajouté le</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedResources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                        {getTypeIcon(resource.type)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900">{resource.title}</p>
                      {resource.createdBy && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Par {resource.createdBy.firstName} {resource.createdBy.lastName}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant="neutral">{resource.niveau?.nom || 'N/A'}</Badge>
                    </td>
                    <td className="py-4 px-4">
                      {resource.isPublished ? (
                         <Badge variant="success">Publié</Badge>
                      ) : (
                         <Badge variant="warning">En attente</Badge>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      {new Date(resource.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        <button 
                          onClick={() => { setSelectedResource(resource); setIsViewModalOpen(true); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => togglePublish(resource)}
                              className={`p-2 rounded-lg transition-colors ${resource.isPublished ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                              title={resource.isPublished ? 'Dépublier' : 'Publier'}
                            >
                              {resource.isPublished ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => openEditModal(resource)}
                              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { setResourceToDelete(resource); setIsDeleteModalOpen(true); }}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 gap-4">
              <div className="text-sm text-slate-500">
                Affichage de <span className="font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, filteredResources.length)}</span> sur <span className="font-medium text-slate-700">{filteredResources.length}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 transition-colors font-medium shadow-sm"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1 hidden sm:flex">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${currentPage === i + 1 ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 transition-colors font-medium shadow-sm"
                >
                  Suivant
                </button>
              </div>
            </div>
        )}
      </div>

      {/* Add Document Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => !uploading && setIsUploadModalOpen(false)} title="Ajouter un nouveau document">
        <form onSubmit={handleSubmit(onUploadSubmit)} className="p-5 space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Titre du cours *</label>
              <input
                {...register('title', { required: "Le titre est requis" })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                placeholder="Ex: Chapitre 1 - Les équations"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Niveau *</label>
              <select
                {...register('niveauId', { required: "Le niveau est requis" })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              >
                <option value="">Sélectionner un niveau...</option>
                {niveaux.map(n => (
                  <option key={n.id} value={n.id}>{n.nom}</option>
                ))}
              </select>
              {errors.niveauId && <p className="text-red-500 text-xs mt-1">{errors.niveauId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Type de ressource *</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setUploadType('file')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    uploadType === 'file' 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Uploader un fichier
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('link')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    uploadType === 'link' 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Lien Externe
                </button>
              </div>
            </div>

            {uploadType === 'file' ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Fichier (Document ou Vidéo) *</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    onChange={onFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,video/*,audio/*"
                  />
                  <div className="space-y-1 text-center pointer-events-none">
                    <FileUp className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <span className="relative font-bold text-emerald-600 hover:text-emerald-500">
                        {selectedFile ? selectedFile.name : "Cliquez pour sélectionner un fichier"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">PDF, Vidéo, Audio, Word, Excel, PowerPoint (Images non autorisées)</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">Taille maximale : 100 Mo</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">URL du lien (Vidéo YouTube, Document Drive, etc.) *</label>
                <input
                  {...register('linkUrl')}
                  type="url"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="https://youtube.com/..."
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsUploadModalOpen(false)} disabled={uploading}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={uploading}>
              {uploading ? 'Envoi en cours...' : (isAdmin ? 'Publier le document' : 'Soumettre le document')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Document Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => !uploading && setIsEditModalOpen(false)} title="Modifier le document">
        <form onSubmit={handleSubmitEdit(onEditSubmit)} className="p-5 space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Titre du cours *</label>
              <input
                {...registerEdit('title', { required: "Le titre est requis" })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Niveau *</label>
              <select
                {...registerEdit('niveauId', { required: "Le niveau est requis" })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              >
                <option value="">Sélectionner un niveau...</option>
                {niveaux.map(n => (
                  <option key={n.id} value={n.id}>{n.nom}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-2">Remplacer le document (Optionnel)</label>
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setEditUploadType('none')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                    editUploadType === 'none' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Ne pas modifier
                </button>
                <button
                  type="button"
                  onClick={() => setEditUploadType('file')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                    editUploadType === 'file' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Nouveau fichier
                </button>
                <button
                  type="button"
                  onClick={() => setEditUploadType('link')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                    editUploadType === 'link' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Nouveau lien
                </button>
              </div>

              {editUploadType === 'file' && (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    onChange={onEditFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,video/*,audio/*"
                  />
                  <div className="space-y-1 text-center pointer-events-none">
                    <FileUp className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <span className="relative font-bold text-emerald-600 hover:text-emerald-500">
                        {editSelectedFile ? editSelectedFile.name : "Cliquez pour sélectionner le nouveau fichier"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {editUploadType === 'link' && (
                <input
                  {...registerEdit('linkUrl')}
                  type="url"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  placeholder="Nouveau lien..."
                />
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} disabled={uploading}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={uploading}>
              {uploading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Document Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Détails du document">
        {selectedResource && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs">
                {getTypeIcon(selectedResource.type)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedResource.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="neutral">{selectedResource.niveau?.nom}</Badge>
                  {selectedResource.isPublished ? (
                     <Badge variant="success">Publié</Badge>
                  ) : (
                     <Badge variant="warning">En attente de validation</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Ajouté par</span>
                <span className="font-semibold text-slate-900">
                  {selectedResource.createdBy ? `${selectedResource.createdBy.firstName} ${selectedResource.createdBy.lastName}` : 'Système'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date d'ajout</span>
                <span className="font-semibold text-slate-900">
                  {new Date(selectedResource.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type de fichier</span>
                <span className="font-semibold text-slate-900">{selectedResource.type}</span>
              </div>
            </div>

            <div className="pt-2">
              <a 
                href={selectedResource.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-md"
              >
                <Download className="w-5 h-5" />
                Télécharger / Ouvrir le fichier
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer le document"
        message={`Êtes-vous sûr de vouloir supprimer le document "${resourceToDelete?.title}" ? Cette action est irréversible.`}
        confirmText="Supprimer définitivement"
      />
    </div>
  );
}
