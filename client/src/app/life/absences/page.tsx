import { useState, useEffect } from 'react';
import { UserX, Plus, Search, Calendar, Trash2, Edit, Filter, Users, BookOpen, Clock, ShieldCheck, AlertTriangle, ArrowLeft, CheckCircle2, Save, X, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  matricule?: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface CourseItem {
  id: string;
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface TermItem {
  id: string;
  name: string;
  status: string;
}

interface Absence {
  id: string;
  date: string;
  hours: number;
  reason: string | null;
  justified: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    matricule?: string;
  };
  course?: {
    id: string;
    subject?: {
      id: string;
      name: string;
      code?: string;
    };
  } | null;
  term?: {
    id: string;
    name: string;
  } | null;
}

export default function AbsencesPage() {
  // Navigation mode: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Filters for list mode
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Form states for create/edit
  const [formClassId, setFormClassId] = useState<string>('');
  const [formStudents, setFormStudents] = useState<Student[]>([]);
  const [formCourses, setFormCourses] = useState<CourseItem[]>([]);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState<Absence | null>(null);

  const { success, error, info } = useToast();

  const { register, handleSubmit, reset, setValue, watch } = useForm<{
    studentId: string;
    classId?: string;
    courseId?: string;
    termId?: string;
    hours: number;
    date: string;
    reason: string;
    justified: boolean;
  }>({
    defaultValues: {
      hours: 1,
      justified: false,
      date: new Date().toISOString().split('T')[0],
      reason: '',
    }
  });

  const watchedStudentId = watch('studentId');
  const watchedHours = watch('hours') || 1;
  const watchedJustified = watch('justified');

  // Initial fetch
  useEffect(() => {
    fetchClasses();
    fetchTerms();
    fetchAbsences();
  }, []);

  // Filter dependencies
  useEffect(() => {
    if (selectedClassId) {
      fetchCoursesForFilter(selectedClassId);
    } else {
      setCourses([]);
    }
    fetchAbsences();
  }, [selectedClassId, selectedTermId, selectedCourseId]);

  // When form class changes in create/edit view
  useEffect(() => {
    if (formClassId) {
      fetchFormClassData(formClassId);
    } else {
      setFormStudents([]);
      setFormCourses([]);
    }
  }, [formClassId]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data || []);
    } catch (err) {
      console.error("Erreur chargement classes:", err);
    }
  };

  const fetchTerms = async () => {
    try {
      const res = await api.get('/academic/years');
      const allTerms = (res.data || []).flatMap((y: any) => y.terms || []);
      setTerms(allTerms);
      const openTerm = allTerms.find((t: any) => t.status === 'OPEN');
      if (openTerm && !selectedTermId) {
        setSelectedTermId(openTerm.id);
      }
    } catch (err) {
      console.error("Erreur chargement trimestres:", err);
    }
  };

  const fetchCoursesForFilter = async (classId: string) => {
    try {
      const res = await api.get(`/courses?classId=${classId}`);
      setCourses(res.data || []);
    } catch (err) {
      console.error("Erreur chargement cours:", err);
    }
  };

  const fetchFormClassData = async (classId: string) => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        api.get(`/classes/${classId}/students`),
        api.get(`/courses?classId=${classId}`)
      ]);
      setFormStudents(studentsRes.data || []);
      setFormCourses(coursesRes.data || []);
    } catch (err) {
      console.error("Erreur chargement données classe formulaire:", err);
    }
  };

  const fetchAbsences = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedClassId) params.classId = selectedClassId;
      if (selectedTermId) params.termId = selectedTermId;
      if (selectedCourseId) params.courseId = selectedCourseId;
      const res = await api.get('/absences', { params });
      setAbsences(res.data || []);
    } catch (err) {
      console.error("Erreur chargement absences:", err);
    } finally {
      setLoading(false);
    }
  };

  // Naviguer vers la page de création
  const handleOpenCreatePage = () => {
    setSelectedAbsence(null);
    reset({
      hours: 1,
      justified: false,
      date: new Date().toISOString().split('T')[0],
      reason: '',
      studentId: '',
      courseId: '',
      termId: selectedTermId || '',
    });
    const defaultClass = selectedClassId || (classes.length > 0 ? classes[0].id : '');
    setFormClassId(defaultClass);
    if (defaultClass) {
      fetchFormClassData(defaultClass);
    }
    setViewMode('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Naviguer vers la page de modification
  const handleOpenEditPage = (absence: Absence) => {
    setSelectedAbsence(absence);
    
    // Déterminer la classe de l'élève
    let studentClassId = selectedClassId;
    if (!studentClassId && classes.length > 0) {
      studentClassId = classes[0].id;
    }
    setFormClassId(studentClassId);
    if (studentClassId) {
      fetchFormClassData(studentClassId);
    }

    reset({
      studentId: absence.student.id,
      courseId: absence.course?.id || '',
      termId: absence.term?.id || selectedTermId || '',
      hours: absence.hours || 1,
      date: absence.date ? new Date(absence.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      reason: absence.reason || '',
      justified: absence.justified || false,
    });

    setViewMode('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Retour à la liste
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedAbsence(null);
    fetchAbsences();
  };

  // Soumission Création
  const onCreateSubmit = async (data: any) => {
    if (!data.studentId) {
      error("Veuillez sélectionner un élève");
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/absences', {
        studentId: data.studentId,
        courseId: data.courseId || null,
        termId: data.termId || selectedTermId || null,
        date: data.date,
        hours: Number(data.hours) || 1,
        reason: data.reason || null,
        justified: Boolean(data.justified),
      });
      success("Absence enregistrée avec succès ! La note de conduite a été mise à jour.");
      handleBackToList();
    } catch (err: any) {
      error(err.response?.data?.message || "Erreur lors de l'enregistrement de l'absence");
    } finally {
      setSubmitting(false);
    }
  };

  // Soumission Modification
  const onEditSubmit = async (data: any) => {
    if (!selectedAbsence) return;
    setSubmitting(true);
    try {
      await api.put(`/absences/${selectedAbsence.id}`, {
        courseId: data.courseId || null,
        termId: data.termId || selectedTermId || null,
        date: data.date,
        hours: Number(data.hours) || 1,
        reason: data.reason || null,
        justified: Boolean(data.justified),
      });
      success("Absence modifiée avec succès ! La note de conduite a été recalculée.");
      handleBackToList();
    } catch (err: any) {
      error(err.response?.data?.message || "Erreur lors de la mise à jour de l'absence");
    } finally {
      setSubmitting(false);
    }
  };

  // Suppression
  const handleDeleteConfirm = async () => {
    if (!absenceToDelete) return;
    try {
      await api.delete(`/absences/${absenceToDelete.id}`);
      success("Absence supprimée avec succès et note de conduite recalculée !");
      setIsDeleteModalOpen(false);
      setAbsenceToDelete(null);
      fetchAbsences();
    } catch (err: any) {
      error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  // Calcul des KPI de synthèse
  const totalHours = absences.reduce((acc, a) => acc + (a.hours || 1), 0);
  const justifiedHours = absences.filter(a => a.justified).reduce((acc, a) => acc + (a.hours || 1), 0);
  const unjustifiedHours = Math.max(0, totalHours - justifiedHours);

  // Filtrage par texte
  const filteredAbsences = absences.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${a.student?.firstName || ''} ${a.student?.lastName || ''}`.toLowerCase();
    const mat = (a.student?.matricule || '').toLowerCase();
    const subj = (a.course?.subject?.name || '').toLowerCase();
    return fullName.includes(term) || mat.includes(term) || subj.includes(term);
  });

  const selectedStudentObj = formStudents.find(s => s.id === watchedStudentId);

  // ==========================================
  // VUE 1 : PAGE DE CRÉATION D'ABSENCE
  // ==========================================
  if (viewMode === 'create') {
    const penaltyPerHours = watchedJustified ? 0.25 : 1.0;
    const totalPenalty = (watchedHours * penaltyPerHours).toFixed(2);
    const estimatedGrade = Math.max(0, 20 - parseFloat(totalPenalty)).toFixed(2);

    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBackToList}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Retour à la liste des absences
          </Button>
          <span className="text-xs font-semibold text-brand-text-muted">
            Mode Enregistrement • Éducateur / Vie Scolaire
          </span>
        </div>

        <PageHeader
          title="Enregistrer une Absence d'Élève"
          subtitle="Déclarez le cours concerné, la date et le volume horaire d'absence. La note de conduite et le bulletin seront synchronisés automatiquement."
          icon={<UserX className="w-8 h-8 text-brand-accent" />}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire Principal */}
          <div className="lg:col-span-2 bg-brand-card p-6 md:p-8 rounded-2xl border border-brand-border/60 shadow-sm space-y-6">
            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5">
              {/* Classe & Élève */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Classe <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
                    required
                  >
                    <option value="">-- Sélectionner la classe --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Élève Concerné <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('studentId', { required: true })}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
                    required
                    disabled={!formClassId || formStudents.length === 0}
                  >
                    <option value="">
                      {!formClassId ? '-- Choisissez d\'abord une classe --' : formStudents.length === 0 ? '-- Aucun élève trouvé --' : '-- Sélectionner l\'élève --'}
                    </option>
                    {formStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.lastName} {s.firstName} {s.matricule ? `(${s.matricule})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Matière / Cours & Période */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Matière / Cours concerné (Optionnel)
                  </label>
                  <select
                    {...register('courseId')}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
                  >
                    <option value="">-- Toute la journée / Non spécifié --</option>
                    {formCourses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.subject?.name || 'Cours'} {c.subject?.code ? `(${c.subject.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Période / Trimestre
                  </label>
                  <select
                    {...register('termId')}
                    defaultValue={selectedTermId}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
                  >
                    <option value="">-- Automatique (selon la date) --</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name} {t.status === 'OPEN' ? '(En cours)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Nombre d'heures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Date de l'Absence <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('date', { required: true })}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Durée d'Absence (Heures) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    {...register('hours', { required: true, valueAsNumber: true })}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 font-black text-lg"
                    required
                  />
                </div>
              </div>

              {/* Statut Justifiée / Non justifiée */}
              <div className="p-4 rounded-xl border border-brand-border/60 bg-brand-sidebar/50 space-y-3">
                <p className="text-xs font-bold text-brand-text-muted uppercase">Statut & Justificatif</p>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="false"
                      checked={!watchedJustified}
                      onChange={() => setValue('justified', false)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm font-semibold text-red-500">
                      Injustifiée <span className="text-xs font-normal text-gray-500">(-1.0 pt / heure)</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="true"
                      checked={watchedJustified}
                      onChange={() => setValue('justified', true)}
                      className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-emerald-600">
                      Justifiée <span className="text-xs font-normal text-gray-500">(-0.25 pt / heure)</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Motif / Commentaire */}
              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                  Motif ou Justificatif fourni
                </label>
                <textarea
                  {...register('reason')}
                  placeholder="Ex: Rendez-vous médical certifié, motif familial, absence non signalée..."
                  rows={3}
                  className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl p-3 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 resize-none font-medium"
                />
              </div>

              {/* Boutons d'Action */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBackToList}
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submitting}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Enregistrer l'absence
                </Button>
              </div>
            </form>
          </div>

          {/* Carte Latérale : Simulateur & Impact Conduite */}
          <div className="space-y-6">
            <div className="bg-brand-sidebar/70 p-6 rounded-2xl border border-brand-border/60 space-y-4">
              <div className="flex items-center gap-2 text-brand-accent">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-sm text-brand-text uppercase tracking-wider">Impact sur la Conduite</h3>
              </div>

              <div className="p-4 bg-brand-card rounded-xl border border-brand-border/60 space-y-3">
                <div className="flex justify-between items-center text-xs text-brand-text-muted">
                  <span>Élève sélectionné</span>
                  <span className="font-bold text-brand-text">
                    {selectedStudentObj ? `${selectedStudentObj.lastName} ${selectedStudentObj.firstName}` : 'Non sélectionné'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-brand-text-muted">
                  <span>Volume d'heures</span>
                  <span className="font-bold text-brand-text">{watchedHours} heure(s)</span>
                </div>
                <div className="flex justify-between items-center text-xs text-brand-text-muted">
                  <span>Pénalité calculée</span>
                  <span className={`font-black ${watchedJustified ? 'text-emerald-500' : 'text-red-500'}`}>
                    -{totalPenalty} point(s)
                  </span>
                </div>
                <div className="pt-2 border-t border-brand-border/40 flex justify-between items-center">
                  <span className="text-xs font-bold text-brand-text">Base de départ</span>
                  <span className="text-xs font-black text-brand-text">20.00 / 20</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-700 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Règle Officielle MENA / SEEEC
                </p>
                <p className="leading-relaxed text-[11px]">
                  La note de conduite démarre à 20/20 et s'intègre comme une matière de <strong>Coefficient 1</strong> dans le calcul de la moyenne générale du bulletin officiel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VUE 2 : PAGE DE MODIFICATION D'ABSENCE
  // ==========================================
  if (viewMode === 'edit' && selectedAbsence) {
    const penaltyPerHours = watchedJustified ? 0.25 : 1.0;
    const totalPenalty = (watchedHours * penaltyPerHours).toFixed(2);

    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBackToList}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Retour à la liste des absences
          </Button>
          <span className="text-xs font-semibold text-brand-accent">
            Mode Édition • Absence #{selectedAbsence.id.slice(0, 8)}
          </span>
        </div>

        <PageHeader
          title={`Modifier l'absence de ${selectedAbsence.student?.firstName} ${selectedAbsence.student?.lastName}`}
          subtitle="Modifiez les heures, la date, le statut de justification ou le motif. La conduite sera recalculée automatiquement."
          icon={<Edit className="w-8 h-8 text-brand-accent" />}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire Principal */}
          <div className="lg:col-span-2 bg-brand-card p-6 md:p-8 rounded-2xl border border-brand-border/60 shadow-sm space-y-6">
            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-5">
              {/* Informations Élève (Lecture seule) */}
              <div className="bg-brand-sidebar/70 p-4 rounded-xl border border-brand-border/60">
                <p className="text-xs font-bold text-brand-text-muted uppercase mb-1">Élève concerné</p>
                <p className="text-lg font-black text-brand-text">
                  {selectedAbsence.student?.lastName} {selectedAbsence.student?.firstName}
                </p>
                {selectedAbsence.student?.matricule && (
                  <p className="text-xs text-brand-text-muted mt-0.5">Matricule : {selectedAbsence.student.matricule}</p>
                )}
              </div>

              {/* Matière / Cours & Période */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Matière / Cours concerné
                  </label>
                  <select
                    {...register('courseId')}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
                  >
                    <option value="">-- Non spécifié / Journée entière --</option>
                    {formCourses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.subject?.name || 'Cours'} {c.subject?.code ? `(${c.subject.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Période / Trimestre
                  </label>
                  <select
                    {...register('termId')}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
                  >
                    <option value="">-- Période par défaut --</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name} {t.status === 'OPEN' ? '(En cours)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Heures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Date de l'Absence <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('date', { required: true })}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                    Durée d'Absence (Heures) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    {...register('hours', { required: true, valueAsNumber: true })}
                    className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 font-black text-lg"
                    required
                  />
                </div>
              </div>

              {/* Statut Justifiée / Non justifiée */}
              <div className="p-4 rounded-xl border border-brand-border/60 bg-brand-sidebar/50 space-y-3">
                <p className="text-xs font-bold text-brand-text-muted uppercase">Statut & Justification</p>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="false"
                      checked={!watchedJustified}
                      onChange={() => setValue('justified', false)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm font-semibold text-red-500">
                      Injustifiée <span className="text-xs font-normal text-gray-500">(-1.0 pt / heure)</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="true"
                      checked={watchedJustified}
                      onChange={() => setValue('justified', true)}
                      className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-emerald-600">
                      Justifiée <span className="text-xs font-normal text-gray-500">(-0.25 pt / heure)</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Motif */}
              <div>
                <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">
                  Motif ou Explication de la mise à jour
                </label>
                <textarea
                  {...register('reason')}
                  rows={3}
                  className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl p-3 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 resize-none font-medium"
                />
              </div>

              {/* Boutons d'Action */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBackToList}
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Mettre à jour l'absence
                </Button>
              </div>
            </form>
          </div>

          {/* Panneau Latéral */}
          <div className="space-y-6">
            <div className="bg-brand-sidebar/70 p-6 rounded-2xl border border-brand-border/60 space-y-4">
              <div className="flex items-center gap-2 text-brand-accent">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-sm text-brand-text uppercase tracking-wider">Recalcul Automatique</h3>
              </div>

              <div className="p-4 bg-brand-card rounded-xl border border-brand-border/60 space-y-3">
                <div className="flex justify-between items-center text-xs text-brand-text-muted">
                  <span>Durée modifiée</span>
                  <span className="font-bold text-brand-text">{watchedHours}h</span>
                </div>
                <div className="flex justify-between items-center text-xs text-brand-text-muted">
                  <span>Impact Conduite</span>
                  <span className={`font-black ${watchedJustified ? 'text-emerald-500' : 'text-red-500'}`}>
                    -{totalPenalty} pt
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-brand-text-muted italic leading-relaxed">
                Toute modification appliquée mettra immédiatement à jour le registre d'assiduité et la note de conduite correspondante sur le bulletin scolaire officiel.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VUE 3 : LISTE PRINCIPALE DES ABSENCES
  // ==========================================
  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in zoom-in duration-300">
      <PageHeader 
        title="Gestion des Absences" 
        subtitle="Registre officiel des absences scolaires et impact direct sur la note de conduite (20/20)."
        icon={<UserX className="w-8 h-8 text-brand-accent" />}
        action={
          <Button 
            variant="primary" 
            onClick={handleOpenCreatePage}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Enregistrer une absence
          </Button>
        }
      />

      {/* Cartes KPI & Barème Officiel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-brand-accent/10 text-brand-accent rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-brand-text-muted uppercase">Volume Total</p>
            <p className="text-2xl font-black text-brand-text">{totalHours}h</p>
            <p className="text-[11px] text-brand-text-muted">{absences.length} déclarations</p>
          </div>
        </div>

        <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-brand-text-muted uppercase">Absences Justifiées</p>
            <p className="text-2xl font-black text-emerald-600">{justifiedHours}h</p>
            <p className="text-[11px] text-emerald-600/80 font-medium">-0.25 pt / heure</p>
          </div>
        </div>

        <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-brand-text-muted uppercase">Absences Injustifiées</p>
            <p className="text-2xl font-black text-red-500">{unjustifiedHours}h</p>
            <p className="text-[11px] text-red-500/80 font-medium">-1.00 pt / heure</p>
          </div>
        </div>

        <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/60 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-brand-text-muted uppercase">Règle Conduite</p>
            <p className="text-2xl font-black text-amber-600">Base 20/20</p>
            <p className="text-[11px] text-amber-600/80 font-medium">Coef. 1 au bulletin</p>
          </div>
        </div>
      </div>

      {/* Barre de Filtrage Interactive */}
      <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/60 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-brand-text-muted uppercase tracking-wider">
          <Filter className="w-4 h-4 text-brand-accent" />
          <span>Filtres de recherche</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Classe */}
          <div>
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase mb-1">Classe</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedCourseId('');
              }}
              className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
            >
              <option value="">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Trimestre */}
          <div>
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase mb-1">Période / Trimestre</label>
            <select
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
            >
              <option value="">Tous les trimestres</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.status === 'OPEN' ? '(En cours)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Cours */}
          <div>
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase mb-1">Matière / Cours</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={!selectedClassId || courses.length === 0}
              className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium disabled:opacity-50"
            >
              <option value="">Toutes les matières</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.subject?.name || 'Matière'}</option>
              ))}
            </select>
          </div>

          {/* Recherche */}
          <div>
            <label className="block text-[11px] font-bold text-brand-text-muted uppercase mb-1">Recherche par nom</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
              <input
                type="text"
                placeholder="Rechercher un élève..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des Absences */}
      <div className="bg-brand-card rounded-2xl border border-brand-border/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-brand-text-muted font-medium">Chargement du registre des absences...</div>
        ) : filteredAbsences.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserX className="w-12 h-12 text-brand-text-muted mx-auto opacity-40" />
            <p className="text-base font-bold text-brand-text">Aucune absence trouvée</p>
            <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
              {searchTerm || selectedClassId ? "Aucun enregistrement ne correspond à vos critères de recherche." : "Aucune absence n'a encore été enregistrée pour cette période."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCreatePage}
              leftIcon={<Plus className="w-4 h-4" />}
              className="mt-2"
            >
              Enregistrer une absence
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-brand-sidebar/80 border-b border-brand-border/60 text-brand-text-muted uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3.5 px-4">Élève</th>
                  <th className="py-3.5 px-4">Matière / Cours</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-center">Durée</th>
                  <th className="py-3.5 px-4 text-center">Statut & Pénalité</th>
                  <th className="py-3.5 px-4">Motif</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 font-medium text-brand-text">
                {filteredAbsences.map((absence) => (
                  <tr key={absence.id} className="hover:bg-brand-sidebar/40 transition-colors">
                    {/* Élève */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-brand-text text-sm">
                        {absence.student?.lastName} {absence.student?.firstName}
                      </div>
                      {absence.student?.matricule && (
                        <div className="text-[10px] text-brand-text-muted">Matricule : {absence.student.matricule}</div>
                      )}
                    </td>

                    {/* Cours */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-brand-text">
                        {absence.course?.subject?.name || 'Journée / Non spécifié'}
                      </div>
                      {absence.term?.name && (
                        <div className="text-[10px] text-brand-text-muted">{absence.term.name}</div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-brand-text-muted">
                      {new Date(absence.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Durée */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-brand-sidebar border border-brand-border/60 font-black text-sm text-brand-text">
                        {absence.hours || 1}h
                      </span>
                    </td>

                    {/* Statut & Pénalité */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        absence.justified 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}>
                        {absence.justified ? 'Justifiée (-0.25 pt/h)' : 'Injustifiée (-1.0 pt/h)'}
                      </span>
                    </td>

                    {/* Motif */}
                    <td className="py-3.5 px-4 text-brand-text-muted italic max-w-xs truncate">
                      {absence.reason || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditPage(absence)}
                          className="p-1.5 rounded-lg bg-brand-sidebar hover:bg-brand-accent/10 hover:text-brand-accent text-brand-text-muted transition-colors"
                          title="Modifier cette absence"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAbsenceToDelete(absence);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-brand-sidebar hover:bg-red-500/10 hover:text-red-500 text-brand-text-muted transition-colors"
                          title="Supprimer cette absence"
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
        )}
      </div>

      {/* Confirmation Modal Suppression */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Supprimer l'enregistrement d'absence"
        message={`Êtes-vous sûr de vouloir supprimer cette absence de ${absenceToDelete?.hours || 1}h pour ${absenceToDelete?.student?.firstName} ${absenceToDelete?.student?.lastName} ? La note de conduite sera immédiatement recalculée.`}
        confirmText="Oui, supprimer"
        cancelText="Annuler"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setAbsenceToDelete(null);
        }}
      />
    </div>
  );
}
