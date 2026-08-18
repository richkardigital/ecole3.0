import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { 
  CreditCard, Search, Filter, Download, Printer, CheckSquare, 
  Square, Users, School, GraduationCap, Sparkles, Loader2, 
  RotateCw, Eye, CheckCircle2, User, Layers, Calendar
} from 'lucide-react';
import { StudentCard } from '@/components/cards/StudentCard';
import { StudentCardModal } from '@/components/cards/StudentCardModal';
import { StudentCardData, exportBatchStudentCardsPdf, exportStudentCardPdf } from '@/lib/studentCardPdfGenerator';

export default function StudentCardsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Filters
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Multi-selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [batchDownloading, setBatchDownloading] = useState(false);

  // Single Modal
  const [selectedCardForModal, setSelectedCardForModal] = useState<StudentCardData | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
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
        setAcademicYears(Array.isArray(yearsRes.value.data) ? yearsRes.value.data : []);
      }
    } catch (e) {
      console.error('Erreur chargement données:', e);
    } finally {
      setLoading(false);
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
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const full = `${st.firstName} ${st.lastName} ${st.matricule || ''} ${st.email || ''}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [students, selectedSchoolId, selectedClassId, searchQuery]);

  // Convert an internal user to StudentCardData format
  const mapToCardData = (st: any): StudentCardData => {
    const enrollment = st.enrollments?.[0];
    const className = enrollment?.class?.name || 'Classe non assignée';
    const levelName = enrollment?.class?.niveau?.nom || 'Secondaire';
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
      const title = selectedClassObj ? `Cartes_${selectedClassObj.name}` : 'Planche_Cartes_Scolaires';
      await exportBatchStudentCardsPdf(cardsData, { title, academicYear: selectedYear });
    } catch (e) {
      console.error('Erreur export batch:', e);
      alert('Une erreur est survenue lors de l\'exportation de la planche.');
    } finally {
      setBatchDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── HEADER ── */}
      <PageHeader
        title="Cartes Scolaires & Badges Apprenant École 3.0"
        subtitle="Générez, prévisualisez en 3D et exportez les cartes scolaires officielles sécurisées avec QR code pour vos élèves."
        icon={<CreditCard className="w-6 h-6 text-pink-600" />}
        action={
          <div className="flex items-center gap-2.5 flex-wrap">
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
                  ? `Imprimer ${selectedStudentIds.size} Carte(s) (Planche A4)`
                  : `Imprimer Toute la Sélection (${filteredStudents.length}) (A4)`}
              </span>
            </button>
          </div>
        }
      />

      {/* ── FILTRES & BARRE D'ACTION ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, matricule..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

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
                  {ay.name}
                </option>
              ))}
            </select>
          </div>

          {/* Switch Vue Grille / Tableau */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Vue Cartes 3D
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Vue Tableau
            </button>
          </div>
        </div>

        {/* Barre de sélection multiple */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAll}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-800 transition-colors"
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

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Format standard PVC CR80 (85.6 × 54 mm) ou Planche A4 (8 cartes / page)
            </span>
          </div>
        </div>
      </div>

      {/* ── CONTENU : LISTE OU GRILLE ── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
          <p className="text-sm font-bold">Chargement des apprenants...</p>
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

            return (
              <div
                key={st.id}
                className={`relative bg-white rounded-3xl p-5 border-2 transition-all shadow-sm space-y-4 ${
                  isSelected ? 'border-pink-500 ring-2 ring-pink-500/20 bg-pink-50/10' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Select checkbox overlay */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => toggleSelectStudent(st.id)}
                    className="inline-flex items-center gap-2 text-xs font-black text-slate-700 hover:text-pink-600 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-pink-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                    <span>Sélectionner pour impression</span>
                  </button>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {cardData.className}
                  </span>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0}
                      onChange={selectAll}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                  </th>
                  <th className="p-4">Apprenant</th>
                  <th className="p-4">Matricule</th>
                  <th className="p-4">Classe & Niveau</th>
                  <th className="p-4">Date de Naissance</th>
                  <th className="p-4">Statut Photo</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredStudents.map((st) => {
                  const cardData = mapToCardData(st);
                  const isSelected = selectedStudentIds.has(st.id);

                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-pink-50/30' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(st.id)}
                          className="rounded text-pink-600 focus:ring-pink-500"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {cardData.photoUrl ? (
                              <img src={cardData.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 uppercase">
                              {st.lastName} {st.firstName}
                            </p>
                            <p className="text-[10px] text-slate-400">{st.email || 'Sans email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-[11px]">
                          {cardData.matricule}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-slate-900">{cardData.className}</p>
                        <p className="text-[10px] text-slate-400">{cardData.levelName}</p>
                      </td>
                      <td className="p-4">
                        {cardData.birthDate
                          ? new Date(cardData.birthDate).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                      <td className="p-4">
                        {cardData.photoUrl ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3" />
                            Conforme
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-black">
                            Placeholder
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCardForModal(cardData)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors"
                            title="Aperçu 3D"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => exportStudentCardPdf(cardData)}
                            className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl transition-colors"
                            title="Télécharger Carte PVC PDF"
                          >
                            <Download className="w-4 h-4" />
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

      {/* ── MODAL 3D CARD ── */}
      <StudentCardModal
        isOpen={!!selectedCardForModal}
        onClose={() => setSelectedCardForModal(null)}
        cardData={selectedCardForModal}
      />
    </div>
  );
}
