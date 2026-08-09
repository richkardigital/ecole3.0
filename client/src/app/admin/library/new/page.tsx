import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { FileUp, ArrowLeft } from 'lucide-react';

interface Niveau {
  id: string;
  nom: string;
}

type FormData = {
  title: string;
  niveauId: string;
  linkUrl?: string;
};

export default function NewLibraryDocumentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  useEffect(() => {
    api.get('/niveaux').then(res => setNiveaux(res.data)).catch(err => console.error(err));
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onSubmit = async (data: FormData) => {
    setFormError(null);
    if (uploadType === 'file' && !selectedFile) {
      setFormError("Veuillez sélectionner un fichier à uploader.");
      return;
    }
    if (uploadType === 'link' && !data.linkUrl) {
      setFormError("Veuillez entrer l'URL du lien.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('niveauId', data.niveauId);

      if (uploadType === 'file' && selectedFile) {
        formData.append('file', selectedFile);
      } else if (uploadType === 'link' && data.linkUrl) {
        formData.append('linkUrl', data.linkUrl);
      }

      await api.post('/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Redirect back based on role
      if (user?.role === 'ENSEIGNANT') {
        navigate('/enseignant/library');
      } else if (user?.role === 'DIRECTEUR') {
        navigate('/directeur/library');
      } else {
        navigate(-1);
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || "Une erreur est survenue lors de l'ajout.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <PageHeader title="Ajouter un document" subtitle="Partagez une nouvelle ressource dans la Librairie 3.0" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        {formError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            {formError}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Titre du document *</label>
            <input
              {...register('title', { required: "Le titre est requis" })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              placeholder="Ex: Cours de Mathématiques - Chapitre 1"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Niveau cible *</label>
            <select
              {...register('niveauId', { required: "Le niveau est requis" })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            >
              <option value="">Sélectionner un niveau...</option>
              {niveaux.map(n => (
                <option key={n.id} value={n.id}>{n.nom}</option>
              ))}
            </select>
            {errors.niveauId && <p className="text-red-500 text-xs mt-1">{errors.niveauId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Type de contenu *</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setUploadType('file')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
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
                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
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
              <div className="mt-2 flex justify-center px-6 pt-8 pb-10 border-2 border-slate-300 border-dashed rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  onChange={onFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,video/*,audio/*"
                />
                <div className="space-y-2 text-center pointer-events-none">
                  <FileUp className="mx-auto h-12 w-12 text-slate-400" />
                  <div className="flex text-sm text-slate-600 justify-center">
                    <span className="relative font-bold text-emerald-600 text-base">
                      {selectedFile ? selectedFile.name : "Cliquez pour sélectionner un fichier"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">PDF, Vidéo, Audio, Word, Excel, PowerPoint</p>
                  <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wide">Taille maximale : 100 Mo</p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">URL du lien *</label>
              <input
                {...register('linkUrl')}
                type="url"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                placeholder="Ex: https://youtube.com/..."
              />
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <Button type="submit" variant="primary" isLoading={uploading} className="px-8 py-3 text-base">
            {uploading ? 'Envoi en cours...' : (user?.role === 'SUPER_ADMIN' ? 'Publier le document' : 'Soumettre pour validation')}
          </Button>
        </div>
      </form>
    </div>
  );
}
