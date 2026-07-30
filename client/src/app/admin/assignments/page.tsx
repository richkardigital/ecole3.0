import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, BookOpen, Trash2, Edit2, Search,
  Calendar, FileText, CheckCircle2, Clock, Eye, Check, XCircle
} from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';

interface NiveauModel {
  id: string;
  nom: string;
}

interface SubjectModel {
  id: string;
  name: string;
}

interface TermModel {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface AcademicYearModel {
  id: string;
  name: string;
  terms: TermModel[];
}

interface ClassModel {
  id: string;
  name: string;
}

interface GlobalAssignment {
  id: string;
  title: string;
  type: 'DEVOIR' | 'PROJET' | 'EXAMEN';
  description?: string;
  dueDate: string;
  niveau?: NiveauModel;
  subject?: SubjectModel;
  published: boolean;
  isCorrected?: boolean;
  _count?: { submissions: number };
}

type FormData = {
  title: string;
  type: string;
  niveauId: string;
  subjectId: string;
  dueDate: string;
  description: string;
};

export default function GlobalAssignmentsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [assignments, setAssignments] = useState<GlobalAssignment[]>([]);
  const [niveaux, setNiveaux] = useState<NiveauModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [years, setYears] = useState<AcademicYearModel[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedNiveau, setSelectedNiveau] = useState<string>('');
  const [isCorrectedFilter, setIsCorrectedFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState(true);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<GlobalAssignment | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishingAssignment, setPublishingAssignment] = useState<GlobalAssignment | null>(null);

  const navigate = useNavigate();

  // Toast
  const toast = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      let query = '/assignments?global=true';
      if (selectedYear) query += `&academicYearId=${selectedYear}`;
      if (selectedTerm) query += `&termId=${selectedTerm}`;
      if (selectedNiveau) query += `&niveauId=${selectedNiveau}`;
      if (isCorrectedFilter !== 'ALL') query += `&isCorrected=${isCorrectedFilter === 'CORRECTED' ? 'true' : 'false'}`;

      const [assignmentsRes, niveauxRes, subjectsRes, yearsRes, classesRes] = await Promise.all([
        api.get(query),
        api.get('/niveaux'),
        api.get('/subjects'),
        api.get('/academic/years'),
        api.get('/classes')
      ]);
      setAssignments(assignmentsRes.data);
      setNiveaux(niveauxRes.data);
      setSubjects(subjectsRes.data);
      setYears(yearsRes.data);
      setClasses(classesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin, selectedYear, selectedTerm, selectedNiveau, isCorrectedFilter]);

  // Derived state for terms
  const currentTerms = years.find(y => y.id === selectedYear)?.terms || [];

  // Reset term when year changes
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
    setSelectedTerm('');
  };

  const openCreateModal = () => {
    navigate('/admin/assignments/new');
  };

  const confirmDelete = async () => {
    if (!deletingAssignment) return;
    try {
      await api.delete(`/assignments/${deletingAssignment.id}`);
      setAssignments(prev => prev.filter(a => a.id !== deletingAssignment.id));
      toast.success("L'évaluation a été supprimée.");
      setIsDeleteModalOpen(false);
      setDeletingAssignment(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const confirmPublish = async () => {
    if (!publishingAssignment) return;
    try {
      const newStatus = !publishingAssignment.published;
      await api.patch(`/assignments/${publishingAssignment.id}/publish`, { published: newStatus });
      setAssignments(prev => prev.map(a => a.id === publishingAssignment.id ? { ...a, published: newStatus } : a));
      toast.success(newStatus ? "L'évaluation a été publiée avec succès !" : "L'évaluation a été retirée de la publication.");
      setIsPublishModalOpen(false);
      setPublishingAssignment(null);
    } catch (error) {
      toast.error("Erreur lors de l'opération.");
    }
  };

  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-red-500">Accès non autorisé.</div>;
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <PageHeader 
        title="Évaluations Globales" 
        description="Gérez les devoirs, projets et examens pour des niveaux scolaires entiers."
        icon={<BookOpen className="w-8 h-8 text-brand-primary" />}
        action={
          <Button onClick={openCreateModal} className="shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle Évaluation
          </Button>
        }
      />

      <div className="bg-brand-surface-card rounded-2xl border border-brand-border/50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full mb-6 items-center">
            <select 
              value={selectedYear} 
              onChange={handleYearChange}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-sm flex-1 min-w-[200px]"
            >
              <option value="">Toutes les années</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>

            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)}
              disabled={!selectedYear || currentTerms.length === 0}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-sm flex-1 min-w-[200px] disabled:opacity-50"
            >
              <option value="">Tous les trimestres/semestres</option>
              {currentTerms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <select 
              value={selectedNiveau} 
              onChange={(e) => setSelectedNiveau(e.target.value)}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-sm flex-1 min-w-[200px]"
            >
              <option value="">Tous les niveaux</option>
              {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
            </select>

            <select 
              value={isCorrectedFilter} 
              onChange={(e) => setIsCorrectedFilter(e.target.value)}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-sm flex-1 min-w-[200px]"
            >
              <option value="ALL">Tout (Corrigé / Non corrigé)</option>
              <option value="CORRECTED">Corrigé</option>
              <option value="UNCORRECTED">À corriger</option>
            </select>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : assignments.length === 0 ? (
          <div className="text-center p-12 text-brand-text-muted">Aucune évaluation trouvée.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border/50 text-brand-text-muted">
                  <th className="py-4 px-4 font-semibold">Titre</th>
                  <th className="py-4 px-4 font-semibold">Type</th>
                  <th className="py-4 px-4 font-semibold">Niveau</th>
                  <th className="py-4 px-4 font-semibold">Matière</th>
                  <th className="py-4 px-4 font-semibold">Échéance</th>
                  <th className="py-4 px-4 font-semibold">Publication</th>
                  <th className="py-4 px-4 font-semibold">Correction</th>
                  <th className="py-4 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-brand-border/30 hover:bg-brand-surface/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-brand-text">{assignment.title}</div>
                      <div className="text-sm text-brand-text-muted line-clamp-1">{assignment.description}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        assignment.type === 'EXAMEN' ? 'bg-red-500/10 text-red-500' :
                        assignment.type === 'PROJET' ? 'bg-purple-500/10 text-purple-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {assignment.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium">
                      <button 
                        onClick={() => navigate(`/admin/assignments/${assignment.id}`)}
                        className="text-brand-primary hover:underline"
                        title="Voir les détails et corriger"
                      >
                        {assignment.niveau?.nom || '-'}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-brand-text-muted">{assignment.subject?.name || '-'}</td>
                    <td className="py-4 px-4 text-brand-text-muted">
                      {new Date(assignment.dueDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-4 px-4">
                      {assignment.published ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Publié
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
                          <Clock className="w-3 h-3 mr-1" /> Brouillon
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {assignment.isCorrected ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Corrigé
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">
                          <Clock className="w-3 h-3 mr-1" /> À corriger
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Voir */}
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/assignments/${assignment.id}`)} className="text-brand-text-muted hover:text-blue-500 hover:bg-blue-500/10 transition-colors" title="Voir l'évaluation">
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {/* Modifier */}
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/assignments/${assignment.id}/edit`)} className="text-brand-text-muted hover:text-blue-500 hover:bg-blue-500/10 transition-colors" title="Modifier">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        
                        {/* Publier / Désactiver */}
                        {!assignment.published ? (
                          <Button variant="ghost" size="sm" onClick={() => { setPublishingAssignment(assignment); setIsPublishModalOpen(true); }} className="text-brand-text-muted hover:text-green-500 hover:bg-green-500/10 transition-colors" title="Publier">
                            <Check className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => { setPublishingAssignment(assignment); setIsPublishModalOpen(true); }} className="text-brand-text-muted hover:text-orange-500 hover:bg-orange-500/10 transition-colors" title="Désactiver la publication">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}

                        {/* Supprimer */}
                        <Button variant="ghost" size="sm" onClick={() => { setDeletingAssignment(assignment); setIsDeleteModalOpen(true); }} className="text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>



      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer l'évaluation"
        message={`Êtes-vous sûr de vouloir supprimer l'évaluation "${deletingAssignment?.title}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
      />

      <ConfirmationModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={confirmPublish}
        title={publishingAssignment?.published ? "Désactiver la publication" : "Publier l'évaluation"}
        message={publishingAssignment?.published 
          ? `Êtes-vous sûr de vouloir retirer l'évaluation "${publishingAssignment?.title}" de la publication ? Elle ne sera plus visible par les élèves.` 
          : `Êtes-vous sûr de vouloir publier l'évaluation "${publishingAssignment?.title}" ? Une fois publiée, elle sera visible par les élèves.`}
        confirmText={publishingAssignment?.published ? "Désactiver" : "Publier"}
        cancelText="Annuler"
      />
    </div>
  );
}
