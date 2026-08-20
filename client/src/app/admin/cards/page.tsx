import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { 
  CreditCard, Search, Filter, Download, Printer, CheckSquare, 
  Square, Users, School, GraduationCap, Sparkles, Loader2, 
  RotateCw, Eye, CheckCircle2, User, Layers, Calendar, Clock,
  ShieldCheck, ShieldAlert, Check, X, AlertTriangle, FileText
} from 'lucide-react';
import { StudentCard } from '@/components/cards/StudentCard';
import { StudentCardModal } from '@/components/cards/StudentCardModal';
import { StudentCardData, exportBatchStudentCardsPdf, exportStudentCardPdf } from '@/lib/studentCardPdfGenerator';

export default function StudentCardsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isDirecteur = user?.role === 'DIRECTEUR';
  const isApprenant = user?.role === 'APPRENANT';
  const canManageCards = isSuperAdmin || isDirecteur;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Filters
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Multi-selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Single Modal
  const [selectedCardForModal, setSelectedCardForModal] = useState<StudentCardData | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (isApprenant) {
        // Un élève ne récupère que ses propres informations
        const [profileRes, yearsRes] = await Promise.allSettled([
          api.get('/users/profile/me'),
          api.get('/academic-years')
        ]);
        if (profileRes.status === 'fulfilled') {
          setStudents([profileRes.value.data]);
        }
        if (yearsRes.status === 'fulfilled') {
          setAcademicYears(Array.isArray(yearsRes.value.data) ? yearsRes.value.data : []);
          const active = yearsRes.value.data?.find((y: any) => y.isCurrent);
          if (active) setSelectedYear(active.name);
        }
      } else {
        const [usersRes, classesRes, schoolsRes, yearsRes] = await Promise.allSettled([
          api.get('/users', { params: { role: 'APPRENANT' } }),
          api.get('/classes'),
          api.get('/schools'),
          api.get('/academic-years'),
        ]);

        if (usersRes.status === 'fulfilled') {
          const studentList = Array.isArray(usersRes.value.data) ? usersRes.value.data : usersRes.value.data.users || [];
          setStudents(studentList.filter((u: any) => u.role === 'APPRENANT' || u.role === 'ELEVE'));
        }
        if (classesRes.status === 'fulfilled') {
          setClasses(Array.isArray(classesRes.value.data) ? classesRes.value.data : []);
        }
        if (schoolsRes.status === 'fulfilled') {
          setSchools(Array.isArray(schoolsRes.value.data) ? schoolsRes.value.data : []);
        }
        if (yearsRes.status === 'fulfilled') {
          const years = Array.isArray(yearsRes.value.data) ? yearsRes.value.data : [];
          setAcademicYears(years);
          const active = years.find((y: any) => y.isCurrent);
          if (active) setSelectedYear(active.name);
        }
      }
    } catch (e) {
      console.error('Erreur chargement données cartes scolaires:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user?.role]);

  // Validation / Mise en attente d'une carte scolaire
  const handleToggleValidation = async (studentId: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'VALIDEE' ? 'EN_COURS' : 'VALIDEE';
    try {
      setActionLoadingId(studentId);
      await api.patch(`/users/${studentId}/card-validation`, { status: newStatus });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, cardStatus: newStatus } : s));
    } catch (err: any) {
      alert(err.response?.data?.message || "Erreur lors de la validation de la carte.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Validation en lot par le Super Admin
  const handleBatchValidate = async (status: 'VALIDEE' | 'EN_COURS') => {
    const targetIds = Array.from(selectedStudentIds);
    if (targetIds.length === 0) return;

    try {
      setBatchDownloading(true);
      await api.post('/users/cards/batch-validate', { studentIds: targetIds, status });
      setStudents(prev => prev.map(s => targetIds.includes(s.id) ? { ...s, cardStatus: status } : s));
      setSelectedStudentIds(new Set());
      alert(`${targetIds.length} cartes scolaires mises à jour avec succès !`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Erreur lors de la validation en lot.");
    } finally {
      setBatchDownloading(false);
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      // School filter
      if (selectedSchoolId !== 'ALL' && st.schoolId !== selectedSchoolId) {
        return false;
      }
      // Class filter
      if (selectedClassId !== 'ALL') {
        const hasEnrollment = st.enrollments?.some((en: any) => en.classId === selectedClassId || en.class?.id === selectedClassId);
        if (!hasEnrollment) return false;
      }
      // Status filter
      const stStatus = st.cardStatus || 'EN_COURS';
      if (statusFilter !== 'ALL' && stStatus !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const full = `${st.firstName} ${st.lastName} ${st.matricule || ''} ${st.email || ''}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [students, selectedSchoolId, selectedClassId, statusFilter, searchQuery]);

  // Convert an internal user to StudentCardData format
  const mapToCardData = (st: any): StudentCardData => {
    const enrollment = st.enrollments?.[0];
    const className = st.className || enrollment?.class?.name || 'Classe active';
    const levelName = st.niveauName || enrollment?.class?.niveau?.nom || 'Secondaire';
    const schoolName = st.school?.name || (user as any)?.schoolName || 'Complexe Scolaire École 3.0';

    return {
      id: st.id,
      matricule: st.matricule || `MAT-${st.id.substring(0, 8).toUpperCase()}`,
      firstName: st.firstName,
      lastName: st.lastName,
      birthDate: st.birthDate || null,
      birthPlace: st.birthPlace || 'Abidjan',
      gender: st.gender || 'M',
      photoUrl: st.avatarUrl || null,
      className,
      levelName,
      academicYear: selectedYear,
      schoolName,
      schoolAddress: st.school?.address || 'Abidjan, Côte d\'Ivoire',
      schoolPhone: st.school?.phone || '+225 27 22 00 00 00',
      schoolEmail: st.school?.email || 'contact@ecole30.ci',
      parentName: st.parentName || (st.parents?.[0] ? `${st.parents[0].firstName} ${st.parents[0].lastName}` : undefined),
      parentPhone: st.parentPhone || st.parents?.[0]?.phone,
      bloodGroup: st.bloodGroup || 'O+',
      isValidated: st.cardStatus === 'VALIDEE'
    };
  };

  // Selection toggle
  const toggleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const selectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  // Batch Export A4
  const handleExportBatchA4 = async () => {
    const targetStudents = filteredStudents.filter((s) =>
      selectedStudentIds.size > 0 ? selectedStudentIds.has(s.id) : true
    );

    if (targetStudents.length === 0) {
      alert('Aucun élève à exporter.');
      return;
    }

    setBatchDownloading(true);
    try {
      const cardsData = targetStudents.map(mapToCardData);
      const selectedClassObj = classes.find((c) => c.id === selectedClassId);
      const title = selectedClassObj ? `Cartes_Scolaires_${selectedClassObj.name}` : 'Planche_Cartes_Scolaires';
      await exportBatchStudentCardsPdf(cardsData, { title, academicYear: selectedYear });
    } catch (e) {
      console.error('Erreur export batch:', e);
      alert('Une erreur est survenue lors de l\'exportation de la planche.');
    } finally {
      setBatchDownloading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VUE SPÉCIFIQUE APPRENANT (ÉLÈVE CONNECTÉ)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isApprenant) {
    const me = students[0] || user;
    const isCardValidated = me?.cardStatus === 'VALIDEE';
    const myCardData = me ? mapToCardData(me) : null;

    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-in fade-in duration-300">
        <PageHeader
          title="Ma Carte Scolaire"
          subtitle="Votre carte d'identité scolaire officielle certifiée avec QR code pour l'année académique active."
          icon={<CreditCard className="w-6 h-6 text-pink-600" />}
        />

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
            <p className="text-sm font-bold">Chargement de votre carte scolaire...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Banner Statut de Validation */}
            {isCardValidated ? (
              <div className="p-5 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-emerald-900">Carte Scolaire Validée & Officielle</h4>
                    <p className="text-xs text-emerald-700">Votre carte est validée par l'administration générale pour l'année {selectedYear}.</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded-full uppercase tracking-wider">
                  En Ligne
                </span>
              </div>
            ) : (
              <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-amber-900">Carte Scolaire en cours de validation</h4>
                    <p className="text-xs text-amber-800">
                      Votre carte scolaire est actuellement en cours de vérification par le Super Admin. Elle sera téléchargeable dès sa validation.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-500 text-white text-xs font-black rounded-full uppercase tracking-wider animate-pulse">
                  En cours
                </span>
              </div>
            )}

            {/* Visualisation 3D */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-6">
              <div className="text-center max-w-md space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-pink-600">
                  {isCardValidated ? 'Carte Scolaire Officielle (Recto / Verso 3D)' : 'Aperçu Provisoire'}
                </span>
                <p className="text-xs text-slate-500">
                  Cliquez sur la carte pour la retourner en 3D.
                </p>
              </div>

              {myCardData && (
                <StudentCard
                  data={myCardData}
                  showActions={isCardValidated}
                />
              )}

              {!isCardValidated && (
                <div className="text-center text-xs font-bold text-slate-400 italic">
                  * Le téléchargement du document PDF officiel est verrouillé en attente de la validation administrative.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VUE SUPER ADMIN & DIRECTION
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <PageHeader
        title="Cartes Scolaires"
        subtitle="Validation administrative, aperçu 3D et impression groupée des cartes scolaires officielles pour les élèves."
        icon={<CreditCard className="w-6 h-6 text-pink-600" />}
        action={
          <div className="flex items-center gap-2.5 flex-wrap">
            {selectedStudentIds.size > 0 && canManageCards && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchValidate('VALIDEE')}
                  disabled={batchDownloading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valider la sélection ({selectedStudentIds.size})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchValidate('EN_COURS')}
                  disabled={batchDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer transition-all"
                >
                  <span>Mettre en attente</span>
                </button>
              </div>
            )}

            <button
              onClick={handleExportBatchA4}
              disabled={batchDownloading || filteredStudents.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-pink-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {batchDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Printer className="w-4 h-4 text-white" />
              )}
              <span>
                {selectedStudentIds.size > 0
                  ? `Imprimer ${selectedStudentIds.size} Carte(s) (A4)`
                  : `Imprimer Toute la Sélection (${filteredStudents.length}) (A4)`}
              </span>
            </button>
          </div>
        }
      />

      {/* ── FILTRES & BARRE D'ACTION ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher élève, matricule..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Établissement (Super Admin) */}
          {isSuperAdmin && (
            <div>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500 truncate"
              >
                <option value="ALL">Tous les établissements ({schools.length})</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Classe */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="ALL">Toutes les classes ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.niveau?.nom ? `(${c.niveau.nom})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Statut Validation */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="VALIDEE">Validées & En ligne</option>
              <option value="EN_COURS">En cours de validation</option>
            </select>
          </div>

          {/* Année Scolaire */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="2025-2026">Année Scolaire 2025-2026</option>
              <option value="2024-2025">Année Scolaire 2024-2025</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.name}>
                  {ay.name} {ay.isCurrent ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barre de sélection multiple & mode */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-600 gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAll}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-800 transition-colors cursor-pointer"
            >
              {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-pink-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </span>
            </button>
            <span>
              <strong>{selectedStudentIds.size}</strong> sur <strong>{filteredStudents.length}</strong> élève(s) sélectionné(s)
            </span>
          </div>

          {/* Switch Vue Grille / Tableau */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Vue Cartes 3D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Vue Tableau
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENU : LISTE OU GRILLE ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
          <p className="text-sm font-bold">Chargement des cartes scolaires...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-slate-200 text-center p-8 space-y-3">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-base font-black text-slate-800">Aucun apprenant trouvé</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Aucun élève ne correspond aux critères de filtre sélectionnés. Essayez de réinitialiser la recherche.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRILLE DE CARTES 3D ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStudents.map((st) => {
            const cardData = mapToCardData(st);
            const isSelected = selectedStudentIds.has(st.id);
            const isValidated = st.cardStatus === 'VALIDEE';
            const isActionLoading = actionLoadingId === st.id;

            return (
              <div
                key={st.id}
                className={`relative bg-white rounded-3xl p-5 border-2 transition-all shadow-sm space-y-4 ${
                  isSelected ? 'border-pink-500 ring-2 ring-pink-500/20 bg-pink-50/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Status and Action bar */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleSelectStudent(st.id)}
                    className="inline-flex items-center gap-2 text-xs font-black text-slate-700 hover:text-pink-600 transition-colors cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-pink-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                    <span>Sélectionner</span>
                  </button>

                  {/* Validation status badge and toggle */}
                  {canManageCards && (
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleToggleValidation(st.id, st.cardStatus)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isValidated 
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                      title={isValidated ? "Cliquer pour mettre en attente" : "Cliquer pour valider la carte"}
                    >
                      {isValidated ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Validée</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>En cours</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* 3D Flip Card */}
                <StudentCard data={cardData} showActions={true} />
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLEAU DÉTAILLÉ ── */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0}
                      onChange={selectAll}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                  </th>
                  <th className="py-3.5 px-4">Élève</th>
                  <th className="py-3.5 px-4">Matricule</th>
                  <th className="py-3.5 px-4">Classe</th>
                  <th className="py-3.5 px-4">Établissement</th>
                  <th className="py-3.5 px-4 text-center">Statut Carte</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredStudents.map((st) => {
                  const isSelected = selectedStudentIds.has(st.id);
                  const isValidated = st.cardStatus === 'VALIDEE';
                  const cardData = mapToCardData(st);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(st.id)}
                          className="rounded text-pink-600 focus:ring-pink-500"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {st.avatarUrl ? (
                            <img src={st.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 font-black text-xs flex items-center justify-center">
                              {st.firstName?.[0]}
                            </div>
                          )}
                          <span>{st.lastName} {st.firstName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{st.matricule || '—'}</td>
                      <td className="py-3.5 px-4">{cardData.className}</td>
                      <td className="py-3.5 px-4 text-slate-500">{cardData.schoolName}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          isValidated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isValidated ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{isValidated ? 'Validée' : 'En cours'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManageCards && (
                            <button
                              type="button"
                              onClick={() => handleToggleValidation(st.id, st.cardStatus)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                isValidated ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {isValidated ? 'Mettre en attente' : 'Valider'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedCardForModal(cardData)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
                            title="Aperçu 3D & Téléchargement"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Aperçu 3D Unique */}
      {selectedCardForModal && (
        <StudentCardModal
          isOpen={true}
          onClose={() => setSelectedCardForModal(null)}
          cardData={selectedCardForModal}
        />
      )}
    </div>
  );
}
