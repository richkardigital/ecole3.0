import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, ArrowLeft, UploadCloud, Link as LinkIcon } from 'lucide-react';

interface Course {
  id: string;
  class: { name: string; niveauId?: string };
  subject: { name: string };
}

export default function NewResourcePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [courses, setCourses] = useState<Course[]>([]);
  const [niveaux, setNiveaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'PDF',
    source: '',
    url: '',
    file: null as File | null,
    isGlobal: false,
    courseId: '',
    niveauId: ''
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [coursesRes, niveauxRes] = await Promise.all([
          api.get('/courses'),
          api.get('/academic/niveaux')
        ]);
        setCourses(coursesRes.data);
        setNiveaux(niveauxRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFormData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return showToast("Le titre est requis", 'error');
    if (!formData.isGlobal && !formData.courseId) return showToast("Sélectionnez un cours", 'error');
    if (formData.isGlobal && !formData.niveauId) return showToast("Sélectionnez un niveau", 'error');
    if (!formData.file && !formData.url) return showToast("Fournissez un fichier ou un lien", 'error');

    setLoading(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('type', formData.type);
    if (formData.source) data.append('source', formData.source);
    if (formData.url) data.append('url', formData.url);
    if (formData.file) data.append('file', formData.file);
    if (formData.isGlobal) data.append('niveauId', formData.niveauId);

    try {
      if (formData.isGlobal) {
        data.append('isGlobal', 'true');
        await api.post('/courses/materials/global', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post(`/courses/${formData.courseId}/materials`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      showToast("Document ajouté avec succès !");
      setTimeout(() => navigate('/academic/library'), 1000);
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'ajout", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-3 animate-fade-in-up ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          {toastMessage.text}
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <Link to="/academic/library" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-900 shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#4D3E90] tracking-tight">Ajouter un Document</h1>
          <p className="text-sm font-medium text-slate-500">Enrichissez la bibliothèque de ressources pédagogiques</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-8">
        
        {/* Section: Informations générales */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">1</span>
            Informations Générales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Titre de la ressource <span className="text-emerald-600">*</span>
              </label>
              <input 
                type="text"
                placeholder="Ex: Chapitre 1 - Équations du second degré"
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Source (Optionnel)
              </label>
              <input 
                type="text"
                placeholder="Ex: Ministère, Manuel scolaire, etc."
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
                value={formData.source}
                onChange={e => setFormData({...formData, source: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Section: Portée */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">2</span>
            Portée de la ressource
          </h2>

          {isSuperAdmin && (
            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-emerald-500 transition-all">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={formData.isGlobal}
                onChange={e => setFormData({...formData, isGlobal: e.target.checked, courseId: ''})}
              />
              <div>
                <p className="text-sm font-bold text-slate-900">Ressource globale (Tout le réseau)</p>
                <p className="text-xs text-slate-500 mt-0.5">Cette ressource sera visible par toutes les écoles connectées pour ce niveau.</p>
              </div>
            </label>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.isGlobal ? (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Niveau concerné <span className="text-emerald-600">*</span>
                </label>
                <select 
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold cursor-pointer"
                  value={formData.niveauId}
                  onChange={e => setFormData({...formData, niveauId: e.target.value})}
                  required
                >
                  <option value="">Sélectionner un niveau...</option>
                  {niveaux.map(n => (
                    <option key={n.id} value={n.id}>{n.nom}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Cours concerné <span className="text-emerald-600">*</span>
                </label>
                <select 
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold cursor-pointer"
                  value={formData.courseId}
                  onChange={e => setFormData({...formData, courseId: e.target.value})}
                  required
                >
                  <option value="">Sélectionner un cours...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.class?.name || 'Classe'} - {c.subject?.name || 'Matière'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Section: Fichier ou Lien */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">3</span>
            Contenu
          </h2>

          <div className="flex gap-4">
            <label className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer ${formData.type === 'PDF' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}>
              <input 
                type="radio" 
                name="type" 
                value="PDF" 
                className="hidden"
                checked={formData.type === 'PDF'}
                onChange={() => setFormData({...formData, type: 'PDF', url: ''})}
              />
              <UploadCloud className={`w-8 h-8 mb-2 ${formData.type === 'PDF' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className={`text-sm font-bold ${formData.type === 'PDF' ? 'text-emerald-900' : 'text-slate-600'}`}>Fichier Document</span>
            </label>

            <label className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer ${formData.type === 'VIDEO' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}>
              <input 
                type="radio" 
                name="type" 
                value="VIDEO" 
                className="hidden"
                checked={formData.type === 'VIDEO'}
                onChange={() => setFormData({...formData, type: 'VIDEO', file: null})}
              />
              <LinkIcon className={`w-8 h-8 mb-2 ${formData.type === 'VIDEO' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className={`text-sm font-bold ${formData.type === 'VIDEO' ? 'text-emerald-900' : 'text-slate-600'}`}>Lien Vidéo</span>
            </label>
          </div>

          <div className="pt-4">
            {formData.type === 'VIDEO' ? (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Lien de la vidéo (YouTube, Vimeo, etc.) <span className="text-emerald-600">*</span>
                </label>
                <input 
                  type="url"
                  className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Sélectionner un fichier <span className="text-emerald-600">*</span>
                </label>
                <input 
                  type="file"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-all cursor-pointer"
                  onChange={e => setFormData({...formData, file: e.target.files ? e.target.files[0] : null})}
                  required={!formData.url}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <Link to="/academic/library">
            <Button variant="secondary" type="button">Annuler</Button>
          </Link>
          <Button variant="glow" type="submit" isLoading={loading}>
            Enregistrer la ressource
          </Button>
        </div>
      </form>
    </div>
  );
}
