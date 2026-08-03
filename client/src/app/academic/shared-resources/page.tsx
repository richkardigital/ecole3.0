import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Search, FileText, Video, Download, ExternalLink, Filter, School, Layers, Plus, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface SchoolModel {
  id: string;
  name: string;
}

interface ClassModel {
  id: string;
  name: string;
  level?: string | null;
}

interface SharedMaterial {
  id: string;
  title: string;
  type: string;
  url: string;
  source?: string | null;
  createdAt: string;
  course: {
    class: {
      id: string;
      name: string;
      level?: string | null;
      school: {
        id: string;
        name: string;
      };
    };
    subject: { name: string };
    teacher: { id: string; firstName: string; lastName: string };
  };
}

interface CourseModel {
  id: string;
  class: { id: string; name: string };
  subject: { id: string; name: string };
}

const SharedResources = () => {
  const { user } = useAuth();
  const [schools, setSchools] = useState<SchoolModel[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [materials, setMaterials] = useState<SharedMaterial[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [reloadKey, setReloadKey] = useState(0);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [myCourses, setMyCourses] = useState<CourseModel[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    type: 'PDF',
    url: '',
    source: '',
    file: null as File | null,
  });

  const canEditInSelectedSchool =
    !!user &&
    !!selectedSchoolId &&
    !!user.schoolId &&
    user.schoolId === selectedSchoolId &&
    (user.role === 'ENSEIGNANT' || user.role === 'DIRECTEUR');

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get('/courses/shared/schools');
        setSchools(res.data || []);
      } catch (error) {
        console.error('Error fetching schools', error);
      } finally {
        setLoadingSchools(false);
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    if (!selectedSchoolId && user?.role !== 'APPRENANT') {
      setClasses([]);
      setSelectedClassId('ALL');
      setMaterials([]);
      return;
    }
    
    if (!selectedSchoolId) return; // For APPRENANT when empty school, no need to fetch classes

    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await api.get(`/courses/shared/schools/${selectedSchoolId}/classes`);
        setClasses(res.data || []);
      } catch (error) {
        console.error('Error fetching classes', error);
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [selectedSchoolId]);

  useEffect(() => {
    if (!selectedSchoolId && user?.role !== 'APPRENANT') return;

    const fetchMaterials = async () => {
      setLoadingMaterials(true);
      try {
        const res = await api.get('/courses/shared/materials', {
          params: {
            schoolId: selectedSchoolId,
            classId: selectedClassId,
            q: searchTerm || undefined,
            type: typeFilter,
          },
        });
        setMaterials(res.data || []);
      } catch (error) {
        console.error('Error fetching shared materials', error);
        setMaterials([]);
      } finally {
        setLoadingMaterials(false);
      }
    };

    const handle = setTimeout(fetchMaterials, 300);
    return () => clearTimeout(handle);
  }, [selectedSchoolId, selectedClassId, searchTerm, typeFilter, reloadKey]);

  useEffect(() => {
    if (!canEditInSelectedSchool) {
      setIsUploadModalOpen(false);
      setSelectedCourseId('');
      setNewMaterial({ title: '', type: 'PDF', url: '', source: '', file: null });
    }
  }, [canEditInSelectedSchool]);

  const fetchMyCourses = async () => {
    try {
      const res = await api.get('/courses');
      setMyCourses(res.data || []);
    } catch (error) {
      console.error('Error fetching courses', error);
      setMyCourses([]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return alert('Veuillez sélectionner un cours');
    if (!newMaterial.title) return alert('Veuillez entrer un titre');
    if (!newMaterial.file && !newMaterial.url) return alert('Veuillez fournir un fichier ou un lien');

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('title', newMaterial.title);
    formData.append('type', newMaterial.type);
    if (newMaterial.url) formData.append('url', newMaterial.url);
    if (newMaterial.source) formData.append('source', newMaterial.source);
    if (newMaterial.file) formData.append('file', newMaterial.file);

    try {
      await api.post(`/courses/${selectedCourseId}/materials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIsUploadModalOpen(false);
      setSelectedCourseId('');
      setNewMaterial({ title: '', type: 'PDF', url: '', source: '', file: null });
      setReloadKey((k) => k + 1);
    } catch (error) {
      console.error('Upload failed', error);
      alert("Erreur lors de l'ajout du document");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm('Supprimer cette ressource ?')) return;
    try {
      await api.delete(`/courses/materials/${materialId}`);
      setReloadKey((k) => k + 1);
    } catch (error) {
      console.error('Delete failed', error);
      alert("Impossible de supprimer cette ressource");
    }
  };

  const availableTypes = useMemo(() => {
    const types = new Set(materials.map(m => m.type).filter(Boolean));
    return Array.from(types.values()).sort((a, b) => a.localeCompare(b));
  }, [materials]);

  const getIcon = (type: string) => {
    if (type === 'VIDEO' || type.toLowerCase().includes('video')) return <Video className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <PageHeader
          title={user?.role === 'APPRENANT' ? "Ressources réseau SEEC" : "Écoles connectées"}
          subtitle={user?.role === 'APPRENANT' ? "Consultez les cours mutualisés des autres écoles de votre niveau" : "Consultez les documents partagés par les enseignants des autres écoles"}
        />
        {canEditInSelectedSchool && (
          <Button
            variant="primary"
            onClick={async () => {
              if (myCourses.length === 0) {
                await fetchMyCourses();
              }
              setIsUploadModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Ajouter une ressource
          </Button>
        )}
      </div>

      <div className="bg-brand-card p-4 rounded-xl shadow-sm border border-brand-border/50 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <School className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text outline-none"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              disabled={loadingSchools}
            >
              <option value="">{loadingSchools ? 'Chargement des écoles...' : (user?.role === 'APPRENANT' ? 'Toutes les écoles (Mon Niveau)' : 'Choisir une école')}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {user?.role !== 'APPRENANT' && (
            <div className="relative">
              <Layers className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text outline-none"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={!selectedSchoolId || loadingClasses}
              >
                <option value="ALL">{loadingClasses ? 'Chargement des classes...' : 'Toutes les classes'}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.level ? ` (${c.level})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-text-muted" />
            <select
              className="flex-1 border border-brand-border/50 rounded-lg py-2 px-3 focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text outline-none"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              disabled={!selectedSchoolId && user?.role !== 'APPRENANT'}
            >
              <option value="ALL">Tous les types</option>
              <option value="PDF">PDF / Documents</option>
              <option value="VIDEO">Vidéos</option>
              {availableTypes
                .filter(t => t !== 'PDF' && t !== 'VIDEO')
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-text-muted" />
          <input
            type="text"
            placeholder="Rechercher un document, une matière, une classe, un professeur..."
            className="w-full pl-10 pr-4 py-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 bg-brand-sidebar text-brand-text outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={!selectedSchoolId && user?.role !== 'APPRENANT'}
          />
        </div>
      </div>

      {(!selectedSchoolId && user?.role !== 'APPRENANT') ? (
        <div className="text-center py-12 bg-brand-card rounded-xl border border-dashed border-brand-border text-brand-text-muted">
          <School className="w-12 h-12 opacity-20 mx-auto mb-3" />
          <p>Sélectionnez une école pour afficher les ressources</p>
        </div>
      ) : loadingMaterials ? (
        <div className="text-center py-8 text-brand-text-muted">Chargement...</div>
      ) : materials.length === 0 ? (
        <div className="text-center py-12 bg-brand-card rounded-xl border border-dashed border-brand-border text-brand-text-muted">
          <FileText className="w-12 h-12 opacity-20 mx-auto mb-3" />
          <p>Aucune ressource trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            (() => {
              const canDelete =
                canEditInSelectedSchool &&
                (user?.role === 'DIRECTEUR' || (user?.role === 'ENSEIGNANT' && material.course.teacher.id === user.id));
              return (
            <div
              key={material.id}
              className="bg-brand-card rounded-xl shadow-sm border border-brand-border/50 hover:border-brand-accent/30 transition p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-brand-sidebar rounded-xl border border-brand-border/50">{getIcon(material.type)}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 bg-brand-accent/10 text-brand-accent border border-brand-accent/20 rounded-full">
                    {material.course.subject.name}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(material.id)}
                      className="p-2 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-lg text-brand-text mb-1 line-clamp-2" title={material.title}>
                {material.title}
              </h3>
              <p className="text-sm text-brand-text-muted mb-4">
                {material.course.class.school.name} • {material.course.class.name} • Prof. {material.course.teacher.lastName}
                {material.source && (
                  <span className="block text-xs mt-1 italic opacity-70">Source : {material.source}</span>
                )}
              </p>

              <div className="mt-auto pt-4 border-t border-brand-border/50 flex justify-between items-center">
                <span className="text-xs text-brand-text-muted">{new Date(material.createdAt).toLocaleDateString()}</span>
                <a
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-brand-accent hover:underline"
                >
                  {material.type === 'VIDEO' ? 'Regarder' : 'Télécharger'}
                  {material.type === 'VIDEO' ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                </a>
              </div>
            </div>
              );
            })()
          ))}
        </div>
      )}

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Ajouter une ressource partagée"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-brand-text-muted">Cours concerné</label>
            <select
              className="w-full border border-brand-border/50 rounded-lg p-2.5 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              required
            >
              <option value="">Sélectionner un cours...</option>
              {myCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class.name} - {c.subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-brand-text-muted">Titre</label>
            <input
              className="w-full border border-brand-border/50 rounded-lg p-2.5 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none"
              value={newMaterial.title}
              onChange={(e) => setNewMaterial((v) => ({ ...v, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-brand-text-muted">Type</label>
              <select
                className="w-full border border-brand-border/50 rounded-lg p-2.5 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none"
                value={newMaterial.type}
                onChange={(e) => setNewMaterial((v) => ({ ...v, type: e.target.value }))}
              >
                <option value="PDF">PDF</option>
                <option value="VIDEO">VIDEO</option>
                <option value="LINK">LINK</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-brand-text-muted">Source (optionnel)</label>
              <input
                className="w-full border border-brand-border/50 rounded-lg p-2.5 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none"
                value={newMaterial.source}
                onChange={(e) => setNewMaterial((v) => ({ ...v, source: e.target.value }))}
                placeholder="Ex: Manuel, page 12..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-brand-text-muted">Lien URL (optionnel)</label>
            <input
              className="w-full border border-brand-border/50 rounded-lg p-2.5 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none"
              value={newMaterial.url}
              onChange={(e) => setNewMaterial((v) => ({ ...v, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-brand-text-muted">Fichier (optionnel)</label>
            <input
              type="file"
              className="w-full border border-brand-border/50 rounded-lg p-2.5 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
              onChange={(e) => setNewMaterial((v) => ({ ...v, file: e.target.files?.[0] || null }))}
            />
            <p className="text-xs text-brand-text-muted mt-2">
              Fournissez un fichier ou un lien URL.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-brand-border/30">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUploadModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploadLoading}
            >
              {uploadLoading ? 'Envoi...' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SharedResources;
