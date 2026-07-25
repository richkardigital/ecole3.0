import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Calendar, XCircle, Trash2, Edit, Filter, Award } from 'lucide-react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface Class {
  id: string;
  name: string;
}

interface Term {
  id: string;
  name: string;
}

interface Conduct {
  id: string;
  appreciation: string | null;
  comment: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  term: {
    id: string;
    name: string;
  };
  createdAt: string;
}

const Conduct = () => {
  const [conducts, setConducts] = useState<Conduct[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast, success, error } = useToast();
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedConduct, setSelectedConduct] = useState<Conduct | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<{
    studentId: string;
    termId: string;
    appreciation: string;
    comment: string;
  }>();

  useEffect(() => {
    fetchClasses();
    fetchTerms();
    fetchConducts();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchConducts();
  }, [selectedClassId, selectedTermId]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (err) {
      console.error("Error fetching classes", err);
    }
  };

  const fetchTerms = async () => {
    try {
      // Fetch academic years and flatten terms
      const res = await api.get('/academic/years');
      const allTerms = res.data.flatMap((year: any) => year.terms);
      setTerms(allTerms);
      if (allTerms.length > 0 && !selectedTermId) {
        // Optionnel: sélectionner le terme ouvert par défaut
        const openTerm = allTerms.find((t: any) => t.status === 'OPEN');
        if (openTerm) setSelectedTermId(openTerm.id);
      }
    } catch (err) {
      console.error("Error fetching terms", err);
    }
  };

  const fetchStudents = async (classId: string) => {
    try {
      const res = await api.get(`/classes/${classId}/students`);
      setStudents(res.data);
    } catch (err) {
      console.error("Error fetching students", err);
    }
  };

  const fetchConducts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedClassId) params.classId = selectedClassId;
      if (selectedTermId) params.termId = selectedTermId;
      
      const res = await api.get('/conducts', { params });
      setConducts(res.data);
    } catch (err) {
      console.error("Error fetching conducts", err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitAdd = async (data: any) => {
    try {
      await api.post('/conducts', data);
      setIsAddModalOpen(false);
      reset();
      fetchConducts();
      success("Appréciation enregistrée avec succès");
    } catch (err) {
      console.error("Error creating conduct", err);
      error("Erreur lors de l'enregistrement de la conduite");
    }
  };

  const onSubmitEdit = async (data: any) => {
    if (!selectedConduct) return;
    try {
      await api.put(`/conducts/${selectedConduct.id}`, data);
      setIsEditModalOpen(false);
      setSelectedConduct(null);
      fetchConducts();
      success("Appréciation mise à jour avec succès");
    } catch (err) {
      console.error("Error updating conduct", err);
      error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteClick = (conduct: Conduct) => {
    setSelectedConduct(conduct);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedConduct) return;
    try {
      await api.delete(`/conducts/${selectedConduct.id}`);
      setIsDeleteModalOpen(false);
      setSelectedConduct(null);
      fetchConducts();
      success("Appréciation supprimée avec succès");
    } catch (err) {
      console.error("Error deleting conduct", err);
      error("Erreur lors de la suppression");
    }
  };

  const openEditModal = (conduct: Conduct) => {
    setSelectedConduct(conduct);
    setValue('appreciation', conduct.appreciation || '');
    setValue('comment', conduct.comment || '');
    setIsEditModalOpen(true);
  };

  const getAppreciationStyle = (appreciation: string | null) => {
    if (!appreciation) return 'bg-brand-sidebar text-brand-text-muted';
    const lower = appreciation.toLowerCase();
    if (lower.includes('bien') || lower.includes('excellent') || lower.includes('félicitation')) 
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (lower.includes('avertissement') || lower.includes('blâme') || lower.includes('mauvais'))
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    return 'bg-brand-accent/10 text-brand-accent border-brand-accent/20';
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestion de la Conduite"
        subtitle="Appréciations et suivi disciplinaire par période"
        icon={<ClipboardList className="w-6 h-6 text-brand-accent" />}
        action={
          <Button
            variant="primary"
            onClick={() => {
              reset({ termId: selectedTermId });
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Saisir une appréciation
          </Button>
        }
      />

      {/* Filters */}
      <div className="bg-brand-card p-5 rounded-xl shadow-sm border border-brand-border/50 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-accent/10 rounded-lg">
            <Filter className="w-5 h-5 text-brand-accent" />
          </div>
          <span className="font-semibold text-brand-text">Filtrer par :</span>
        </div>
        
        <div className="flex items-center gap-4 flex-1">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="flex-1 bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text cursor-pointer"
          >
            <option value="">Toutes les classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>

          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="flex-1 bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text cursor-pointer"
          >
            <option value="">Toutes les périodes</option>
            {terms.map(term => (
              <option key={term.id} value={term.id}>{term.name}</option>
            ))}
          </select>
        </div>

        <div className="text-sm text-brand-text-muted font-medium">
          {conducts.length} appréciation{conducts.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-accent"></div>
        </div>
      ) : conducts.length === 0 ? (
        <div className="bg-brand-card rounded-xl p-12 text-center border border-dashed border-brand-border/50 shadow-sm">
          <div className="bg-brand-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-accent/20">
            <Award className="w-8 h-8 text-brand-accent" />
          </div>
          <h3 className="text-xl font-bold text-brand-text mb-2">Aucune appréciation</h3>
          <p className="text-brand-text-muted max-w-sm mx-auto">
            Sélectionnez une classe et une période pour voir les appréciations ou commencez par en créer une nouvelle.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conducts.map((conduct) => (
            <div key={conduct.id} className="bg-brand-card rounded-xl p-5 shadow-sm border border-brand-border/50 hover:border-brand-accent/30 hover:shadow-md transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-bold text-lg shadow-sm">
                    {conduct.student.firstName[0]}{conduct.student.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-text leading-tight">
                      {conduct.student.firstName} {conduct.student.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-brand-text-muted mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {conduct.term.name}
                    </div>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getAppreciationStyle(conduct.appreciation)}`}>
                  {conduct.appreciation || 'N/A'}
                </div>
              </div>

              {conduct.comment && (
                <div className="bg-brand-sidebar border border-brand-border/30 rounded-lg p-3 mb-4 flex-1">
                  <p className="text-sm text-brand-text-muted italic">
                    "{conduct.comment}"
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-brand-border/30 mt-auto">
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(conduct)}
                    className="p-2 text-brand-text-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                  >
                    <Edit className="w-4.5 h-4.5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(conduct)}
                    className="p-2 text-brand-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
                <div className="text-[10px] text-brand-text-muted/70">
                  Saisi le {new Date(conduct.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Saisir une appréciation"
      >
        <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-text-muted ml-1">Classe</label>
              <select
                onChange={(e) => fetchStudents(e.target.value)}
                className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm cursor-pointer"
              >
                <option value="">Sélectionner une classe</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-text-muted ml-1">Période</label>
              <select
                {...register('termId', { required: true })}
                className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm cursor-pointer"
              >
                <option value="">Sélectionner une période</option>
                {terms.map(term => (
                  <option key={term.id} value={term.id}>{term.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text-muted ml-1">Élève</label>
            <select
              {...register('studentId', { required: true })}
              className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm cursor-pointer"
            >
              <option value="">Sélectionner un élève</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text-muted ml-1">Appréciation globale</label>
            <select
              {...register('appreciation')}
              className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm cursor-pointer"
            >
              <option value="">Choisir une appréciation</option>
              <option value="Excellent">Excellent</option>
              <option value="Très Bien">Très Bien</option>
              <option value="Bien">Bien</option>
              <option value="Assez Bien">Assez Bien</option>
              <option value="Passable">Passable</option>
              <option value="Insuffisant">Insuffisant</option>
              <option value="Avertissement de conduite">Avertissement de conduite</option>
              <option value="Blâme de conduite">Blâme de conduite</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text-muted ml-1">Commentaire détaillé</label>
            <textarea
              {...register('comment')}
              rows={4}
              placeholder="Détails sur le comportement, les progrès ou les points à améliorer..."
              className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/30">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier l'appréciation"
      >
        <div className="mb-4 text-sm text-brand-text-muted">
          <span className="font-semibold text-brand-text">{selectedConduct?.student.firstName} {selectedConduct?.student.lastName}</span> - {selectedConduct?.term.name}
        </div>
        
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text-muted ml-1">Appréciation globale</label>
            <select
              {...register('appreciation')}
              className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm cursor-pointer"
            >
              <option value="">Choisir une appréciation</option>
              <option value="Excellent">Excellent</option>
              <option value="Très Bien">Très Bien</option>
              <option value="Bien">Bien</option>
              <option value="Assez Bien">Assez Bien</option>
              <option value="Passable">Passable</option>
              <option value="Insuffisant">Insuffisant</option>
              <option value="Avertissement de conduite">Avertissement de conduite</option>
              <option value="Blâme de conduite">Blâme de conduite</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text-muted ml-1">Commentaire détaillé</label>
            <textarea
              {...register('comment')}
              rows={4}
              className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/30">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Mettre à jour
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer l'appréciation"
        message="Êtes-vous sûr de vouloir supprimer cet enregistrement de conduite ? Cette action est irréversible."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};

export default Conduct;
