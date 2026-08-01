import { useState, useEffect } from 'react';
import { UserX, Plus, Search, Calendar, XCircle, Trash2, Edit, Filter, Users, ChevronRight } from 'lucide-react';
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

interface Absence {
  id: string;
  date: string;
  reason: string | null;
  justified: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const Absences = () => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast, success, error } = useToast();
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<{
    studentId: string;
    date: string;
    reason: string;
    justified: boolean;
  }>();

  useEffect(() => {
    fetchClasses();
    fetchAbsences();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
    } catch (err) {
      console.error("Error fetching classes", err);
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

  const fetchAbsences = async () => {
    setLoading(true);
    try {
      const res = await api.get('/absences', {
        params: { classId: selectedClassId }
      });
      setAbsences(res.data);
    } catch (err) {
      console.error("Error fetching absences", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
  };

  // Re-fetch absences when class filter changes
  useEffect(() => {
    fetchAbsences();
  }, [selectedClassId]);

  const onSubmitAdd = async (data: any) => {
    try {
      await api.post('/absences', data);
      setIsAddModalOpen(false);
      reset();
      fetchAbsences();
      success("Absence enregistrée avec succès");
    } catch (err) {
      console.error("Error creating absence", err);
      error("Erreur lors de la création de l'absence");
    }
  };

  const onSubmitEdit = async (data: any) => {
    if (!selectedAbsence) return;
    try {
      await api.put(`/absences/${selectedAbsence.id}`, data);
      setIsEditModalOpen(false);
      setSelectedAbsence(null);
      fetchAbsences();
      success("Absence mise à jour avec succès");
    } catch (err) {
      console.error("Error updating absence", err);
      error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteClick = (absence: Absence) => {
    setSelectedAbsence(absence);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedAbsence) return;
    try {
      await api.delete(`/absences/${selectedAbsence.id}`);
      setIsDeleteModalOpen(false);
      setSelectedAbsence(null);
      fetchAbsences();
      success("Absence supprimée avec succès");
    } catch (err) {
      console.error("Error deleting absence", err);
      error("Erreur lors de la suppression");
    }
  };

  const openEditModal = (absence: Absence) => {
    setSelectedAbsence(absence);
    setValue('studentId', absence.student.id);
    setValue('date', new Date(absence.date).toISOString().split('T')[0]);
    setValue('reason', absence.reason || '');
    setValue('justified', absence.justified);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestion des Absences"
        subtitle="Suivi et justification des absences des élèves"
        icon={<UserX className="w-6 h-6 text-brand-accent" />}
        action={
          <Button
            variant="primary"
            onClick={() => {
              reset({ date: new Date().toISOString().split('T')[0], justified: false });
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Enregistrer une absence
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
        
        <div className="flex-1 min-w-[200px] max-w-md">
          <select
            value={selectedClassId}
            onChange={handleClassChange}
            className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text cursor-pointer"
          >
            <option value="">Toutes les classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-sm text-brand-text-muted font-medium">
          {absences.length} absence{absences.length > 1 ? 's' : ''} trouvée{absences.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-accent"></div>
        </div>
      ) : absences.length === 0 ? (
        <div className="bg-brand-card rounded-xl p-12 text-center border border-dashed border-brand-border/50 shadow-sm">
          <div className="bg-brand-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-accent/20">
            <Calendar className="w-8 h-8 text-brand-accent" />
          </div>
          <h3 className="text-xl font-bold text-brand-text mb-2">Aucune absence trouvée</h3>
          <p className="text-brand-text-muted max-w-sm mx-auto">
            {selectedClassId ? "Il n'y a pas d'absences enregistrées pour cette classe." : "Commencez par enregistrer une nouvelle absence pour un élève."}
          </p>
        </div>
      ) : (
        <div className="bg-brand-card rounded-2xl shadow-lg border border-brand-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-brand-sidebar border-b border-brand-border">
                <tr>
                  <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap">Élève</th>
                  <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap">Date</th>
                  <th className="p-4 font-semibold text-brand-text-muted text-sm">Motif</th>
                  <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap">Statut</th>
                  <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {absences.map((absence) => (
                  <tr key={absence.id} className="hover:bg-brand-sidebar/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-bold text-xs shadow-sm shrink-0">
                          {absence.student.firstName[0]}{absence.student.lastName[0]}
                        </div>
                        <span className="font-bold text-brand-text">
                          {absence.student.firstName} {absence.student.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-brand-text-muted text-sm">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(absence.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-4 text-brand-text-muted text-sm max-w-[200px] truncate" title={absence.reason || ''}>
                      {absence.reason || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        absence.justified 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {absence.justified ? 'Justifiée' : 'Non justifiée'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(absence)}
                          className="p-2 text-brand-text-muted hover:text-white bg-brand-bg hover:bg-brand-sidebar rounded-lg transition-colors border border-transparent hover:border-brand-border"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(absence)}
                          className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enregistrer une absence"
      >
        <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-text-muted ml-1 flex items-center gap-2">
                <Users className="w-4 h-4" /> Classe
              </label>
              <select
                onChange={(e) => fetchStudents(e.target.value)}
                className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm"
              >
                <option value="">Sélectionner une classe</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-text-muted ml-1 flex items-center gap-2">
                <Users className="w-4 h-4" /> Élève
              </label>
              <select
                {...register('studentId', { required: true })}
                className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm"
              >
                <option value="">Sélectionner un élève</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>{student.firstName} {student.lastName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text-muted ml-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Date de l'absence
            </label>
            <input
              type="date"
              {...register('date', { required: true })}
              className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text-muted ml-1 flex items-center gap-2">
              <Search className="w-4 h-4" /> Motif / Commentaire
            </label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Ex: Maladie, rendez-vous médical, etc."
              className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-brand-sidebar/50 rounded-lg border border-brand-border/30">
            <input
              type="checkbox"
              id="justified"
              {...register('justified')}
              className="w-5 h-5 rounded border-brand-border/50 bg-brand-bg text-brand-accent focus:ring-brand-accent/50 transition-all cursor-pointer"
            />
            <label htmlFor="justified" className="text-sm font-medium text-brand-text cursor-pointer select-none">
              Absence justifiée (avec justificatif)
            </label>
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
        title="Modifier l'absence"
      >
        <div className="mb-4 text-sm text-brand-text-muted">
          Élève : <span className="font-semibold text-brand-text">{selectedAbsence?.student.firstName} {selectedAbsence?.student.lastName}</span>
        </div>
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text-muted ml-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Date de l'absence
            </label>
            <input
              type="date"
              {...register('date', { required: true })}
              className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text-muted ml-1 flex items-center gap-2">
              <Search className="w-4 h-4" /> Motif / Commentaire
            </label>
            <textarea
              {...register('reason')}
              rows={3}
              className="w-full bg-brand-sidebar border border-brand-border/50 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all text-brand-text text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-brand-sidebar/50 rounded-lg border border-brand-border/30">
            <input
              type="checkbox"
              id="justified-edit"
              {...register('justified')}
              className="w-5 h-5 rounded border-brand-border/50 bg-brand-bg text-brand-accent focus:ring-brand-accent/50 transition-all cursor-pointer"
            />
            <label htmlFor="justified-edit" className="text-sm font-medium text-brand-text cursor-pointer select-none">
              Absence justifiée (avec justificatif)
            </label>
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
        title="Supprimer l'absence"
        message="Êtes-vous sûr de vouloir supprimer cet enregistrement d'absence ? Cette action est irréversible."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  );
};

export default Absences;
