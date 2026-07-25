import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import {
  Plus, Calendar, ChevronDown, ChevronUp, Trash2, Edit2, Eye, Search,
  Power, CheckCircle2, XCircle, Star, Clock, Archive, Building2, Code
} from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

interface TermModel {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'CLOSED';
}

interface SchoolModel {
  id: string;
  name: string;
  ville?: string;
  code?: string;
}

interface AcademicYearModel {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
  status: 'EN_COURS' | 'ACHEVE';
  schoolId: string;
  school?: SchoolModel;
  terms: TermModel[];
  _count?: { classes: number };
}

type FormData = { name: string; startDate: string; endDate: string; isCurrent: boolean; schoolId?: string };

export default function AcademicYears() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [years, setYears] = useState<AcademicYearModel[]>([]);
  const [schools, setSchools] = useState<SchoolModel[]>([]);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EN_COURS' | 'ACHEVE'>('ALL');

  // Year modals
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYearModel | null>(null);
  const [viewingYear, setViewingYear] = useState<AcademicYearModel | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<AcademicYearModel | null>(null);

  // Term modals
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [editingTerm, setEditingTerm] = useState<TermModel | null>(null);
  const [isTermDeleteModalOpen, setIsTermDeleteModalOpen] = useState(false);
  const [termToDelete, setTermToDelete] = useState<string | null>(null);

  // Expand
  const [expandedYearId, setExpandedYearId] = useState<string | null>(null);

  // Form
  const { register: registerYear, handleSubmit: handleSubmitYear, reset: resetYear, setValue: setYearValue, watch: watchYear } = useForm<FormData>();
  const { register: registerTerm, handleSubmit: handleSubmitTerm, reset: resetTerm } = useForm<{ name: string; startDate: string; endDate: string }>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchYears = async () => {
    try {
      setLoading(true);
      const url = isSuperAdmin && selectedSchoolFilter !== 'ALL' 
        ? `/academic/years?schoolId=${selectedSchoolFilter}`
        : '/academic/years';
      const response = await api.get(url);
      setYears(response.data);
    } catch (error) {
      console.error('Error fetching academic years', error);
      showToast("Erreur lors du chargement des années scolaires", 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await api.get('/schools');
      setSchools(res.data);
    } catch (err) {
      console.error('Error fetching schools', err);
    }
  };

  useEffect(() => {
    fetchYears();
    fetchSchools();
  }, [selectedSchoolFilter]);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const formatDateShort = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  // ─── Year CRUD ───
  const openCreateYearModal = () => {
    setEditingYear(null);
    resetYear({ 
      name: '', 
      startDate: '', 
      endDate: '', 
      isCurrent: false,
      schoolId: schools[0]?.id || ''
    });
    setFormError(null);
    setIsYearModalOpen(true);
  };

  const openEditYearModal = (year: AcademicYearModel) => {
    setEditingYear(year);
    resetYear({
      name: year.name,
      startDate: new Date(year.startDate).toISOString().split('T')[0],
      endDate: new Date(year.endDate).toISOString().split('T')[0],
      isCurrent: year.isCurrent,
      schoolId: year.schoolId,
    });
    setFormError(null);
    setIsYearModalOpen(true);
  };

  const openViewYearModal = async (year: AcademicYearModel) => {
    setViewingYear(year);
    setIsViewModalOpen(true);
    try {
      const res = await api.get(`/academic/years/${year.id}`);
      setViewingYear(res.data);
    } catch { /* keep current */ }
  };

  const onSubmitYear = async (data: FormData) => {
    if (!data.name.trim()) { setFormError("Le nom de l'année scolaire est requis."); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingYear) {
        const res = await api.put(`/academic/years/${editingYear.id}`, data);
        setYears(prev => prev.map(y => y.id === editingYear.id ? res.data : y));
        showToast("Année scolaire mise à jour avec succès.");
      } else {
        const res = await api.post('/academic/years', data);
        setYears(prev => [res.data, ...prev]);
        showToast("Nouvelle année scolaire créée avec succès.");
      }
      setIsYearModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteYear = async () => {
    if (!yearToDelete) return;
    try {
      await api.delete(`/academic/years/${yearToDelete.id}`);
      setYears(prev => prev.filter(y => y.id !== yearToDelete.id));
      showToast("Année scolaire supprimée avec succès.");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Erreur lors de la suppression.", 'error');
    } finally {
      setYearToDelete(null);
    }
  };

  const handleToggleStatus = async (year: AcademicYearModel) => {
    try {
      const res = await api.patch(`/academic/years/${year.id}/toggle-status`);
      setYears(prev => prev.map(y => y.id === year.id ? res.data : y));
      showToast(res.data.status === 'EN_COURS' ? `"${year.name}" marquée En cours.` : `"${year.name}" marquée Achevée.`);
    } catch { showToast("Erreur lors du changement de statut", 'error'); }
  };

  const handleToggleActive = async (year: AcademicYearModel) => {
    try {
      const res = await api.patch(`/academic/years/${year.id}/toggle-active`);
      setYears(prev => prev.map(y => y.id === year.id ? res.data : y));
      showToast(res.data.isActive ? `"${year.name}" activée.` : `"${year.name}" désactivée.`);
    } catch { showToast("Erreur lors du changement d'activation", 'error'); }
  };

  const handleSetCurrent = async (year: AcademicYearModel) => {
    try {
      const res = await api.patch(`/academic/years/${year.id}/set-current`);
      setYears(prev => prev.map(y => y.id === year.id ? { ...res.data } : { ...y, isCurrent: y.schoolId === year.schoolId ? false : y.isCurrent }));
      showToast(`"${year.name}" est désormais l'année en cours.`);
    } catch { showToast("Erreur", 'error'); }
  };

  // ─── Term CRUD ───
  const openTermModal = (yearId: string) => {
    setSelectedYearId(yearId);
    setEditingTerm(null);
    resetTerm({ name: '', startDate: '', endDate: '' });
    setIsTermModalOpen(true);
  };

  const openEditTermModal = (term: TermModel) => {
    setEditingTerm(term);
    resetTerm({
      name: term.name,
      startDate: new Date(term.startDate).toISOString().split('T')[0],
      endDate: new Date(term.endDate).toISOString().split('T')[0],
    });
    setIsTermModalOpen(true);
  };

  const onSubmitTerm = async (data: { name: string; startDate: string; endDate: string }) => {
    try {
      if (editingTerm) {
        await api.put(`/academic/terms/${editingTerm.id}`, data);
        showToast("Période modifiée avec succès.");
      } else {
        await api.post('/academic/terms', { ...data, academicYearId: selectedYearId });
        showToast("Période ajoutée avec succès.");
      }
      setIsTermModalOpen(false);
      fetchYears();
    } catch { showToast("Erreur lors de l'opération sur la période", 'error'); }
  };

  const confirmDeleteTerm = async () => {
    if (!termToDelete) return;
    try {
      await api.delete(`/academic/terms/${termToDelete}`);
      fetchYears();
      showToast("Période supprimée avec succès.");
    } catch { showToast("Erreur lors de la suppression de la période", 'error'); }
    finally { setTermToDelete(null); }
  };

  const handleToggleTermStatus = async (termId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
      await api.patch(`/academic/terms/${termId}/status`, { status: newStatus });
      fetchYears();
      showToast("Statut de la période mis à jour.");
    } catch { showToast("Erreur", 'error'); }
  };

  // ─── Filters ───
  const filteredYears = years.filter(y => {
    const matchSearch = y.name.toLowerCase().includes(search.toLowerCase()) || 
      generateSlug(y.name).includes(search.toLowerCase()) ||
      (y.school?.name && y.school.name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || y.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-3 animate-fade-in-up ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Années Scolaires"
        description="Gérez les années académiques, les découpages trimestriels et la planification globale."
      >
        <Button variant="glow" onClick={openCreateYearModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nouvelle Année
        </Button>
      </PageHeader>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, slug, école..."
              className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-medium"
            />
          </div>

          {/* School filter for Super Admin */}
          {isSuperAdmin && schools.length > 0 && (
            <div className="relative">
              <select
                value={selectedSchoolFilter}
                onChange={e => setSelectedSchoolFilter(e.target.value)}
                className="px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-250 rounded-xl outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="ALL">Toutes les écoles</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">
          {[
            { key: 'ALL', label: 'Toutes' },
            { key: 'EN_COURS', label: 'En cours' },
            { key: 'ACHEVE', label: 'Achevées' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === f.key ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-500">Chargement des années scolaires...</span>
          </div>
        ) : filteredYears.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-base">Aucune année scolaire trouvée</p>
            <p className="text-xs text-slate-400 mt-1">Cliquez sur "Nouvelle Année" pour créer une session académique.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Libellé</th>
                  {isSuperAdmin && <th className="py-3.5 px-4">Établissement</th>}
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Début</th>
                  <th className="py-3.5 px-4">Fin</th>
                  <th className="py-3.5 px-4">Trimestres</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredYears.map((year) => (
                  <>
                    <tr key={year.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Name */}
                      <td className="py-4 px-6 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-black shrink-0 ${
                            year.isCurrent ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}>
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span>{year.name}</span>
                            {year.isCurrent && (
                              <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                ★ Année en cours
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* School for Super Admin */}
                      {isSuperAdmin && (
                        <td className="py-4 px-4 text-xs font-semibold text-slate-700">
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            {year.school?.name || 'Établissement'}
                          </span>
                        </td>
                      )}

                      {/* Slug */}
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                          <Code className="w-3 h-3 text-slate-400" />
                          {generateSlug(year.name)}
                        </span>
                      </td>

                      {/* Start */}
                      <td className="py-4 px-4 text-xs text-slate-600 font-semibold">{formatDateShort(year.startDate)}</td>

                      {/* End */}
                      <td className="py-4 px-4 text-xs text-slate-600 font-semibold">{formatDateShort(year.endDate)}</td>

                      {/* Terms count */}
                      <td className="py-4 px-4">
                        <button onClick={() => setExpandedYearId(expandedYearId === year.id ? null : year.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg chip-cyan cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {year.terms.length} trimestre{year.terms.length > 1 ? 's' : ''}
                          {expandedYearId === year.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={year.status === 'EN_COURS' ? 'success' : 'neutral'}>
                            {year.status === 'EN_COURS' ? 'En cours' : 'Achevée'}
                          </Badge>
                          {!year.isActive && (
                            <Badge variant="danger">Inactive</Badge>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openViewYearModal(year)} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors" title="Voir">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditYearModal(year)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Éditer">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleStatus(year)}
                            className={`p-2 rounded-lg transition-colors ${year.status === 'EN_COURS' ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={year.status === 'EN_COURS' ? 'Marquer Achevée' : 'Reprendre En cours'}
                          >
                            {year.status === 'EN_COURS' ? <Archive className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleToggleActive(year)}
                            className={`p-2 rounded-lg transition-colors ${year.isActive ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            title={year.isActive ? 'Désactiver' : 'Activer'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          {!year.isCurrent && (
                            <button onClick={() => handleSetCurrent(year)} className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Définir comme année en cours">
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => { setYearToDelete(year); setIsDeleteModalOpen(true); }} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded terms row */}
                    {expandedYearId === year.id && (
                      <tr key={`${year.id}-terms`}>
                        <td colSpan={isSuperAdmin ? 8 : 7} className="bg-slate-50/70 px-6 py-5 border-b border-slate-200">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-emerald-600" /> Trimestres / Découpage — {year.name}
                            </h4>
                            <button onClick={() => openTermModal(year.id)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> Ajouter un trimestre
                            </button>
                          </div>

                          {year.terms.length === 0 ? (
                            <p className="text-xs text-slate-400 italic bg-white p-4 rounded-xl text-center border border-slate-200">Aucun trimestre défini. Cliquez sur "Ajouter un trimestre".</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {year.terms.map(term => (
                                <div key={term.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 text-sm">{term.name}</span>
                                      <div className="flex gap-0.5">
                                        <button onClick={() => openEditTermModal(term)} className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition" title="Modifier">
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => { setTermToDelete(term.id); setIsTermDeleteModalOpen(true); }} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition" title="Supprimer">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleToggleTermStatus(term.id, term.status)}
                                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                                        term.status === 'OPEN'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                      }`}
                                      title="Cliquez pour changer le statut"
                                    >
                                      {term.status === 'OPEN' ? 'OUVERT' : 'FERMÉ'}
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                                    {formatDateShort(term.startDate)} → {formatDateShort(term.endDate)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───── MODAL: CREATE / EDIT YEAR ───── */}
      <Modal
        isOpen={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        title={editingYear ? "Modifier l'année scolaire" : "Nouvelle Année Scolaire"}
        size="md"
        accentColor="green"
      >
        <form onSubmit={handleSubmitYear(onSubmitYear)} className="space-y-4">
          {formError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" /> <span>{formError}</span>
            </div>
          )}

          {/* School Selection for Super Admin */}
          {isSuperAdmin && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Établissement scolaire <span className="text-emerald-600">*</span>
              </label>
              <select
                {...registerYear('schoolId', { required: true })}
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold cursor-pointer"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.ville || 'Abidjan'})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Libellé / Nom <span className="text-emerald-600">*</span>
            </label>
            <input
              {...registerYear('name', { required: true })}
              placeholder="Ex: 2025-2026"
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              autoFocus
            />
          </div>

          {watchYear('name') && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Slug généré :</span>
              <span className="text-emerald-700 font-bold">{generateSlug(watchYear('name'))}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Date de début <span className="text-emerald-600">*</span>
              </label>
              <input type="date" {...registerYear('startDate', { required: true })}
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Date de fin <span className="text-emerald-600">*</span>
              </label>
              <input type="date" {...registerYear('endDate', { required: true })}
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              />
            </div>
          </div>

          {/* Is Current toggle */}
          <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-900">Définir comme année en cours</p>
              <p className="text-[11px] text-slate-500">Sera l'année active par défaut pour cet établissement</p>
            </div>
            <button type="button" onClick={() => setYearValue('isCurrent', !watchYear('isCurrent'))}
              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                watchYear('isCurrent') ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                watchYear('isCurrent') ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsYearModalOpen(false)}>Annuler</Button>
            <Button type="submit" variant="glow" isLoading={submitting}>
              {editingYear ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ───── MODAL: VIEW YEAR DETAILS ───── */}
      {viewingYear && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Détails de l'année scolaire"
          size="md"
          accentColor="cyan"
          footer={<Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Fermer</Button>}
        >
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={viewingYear.status === 'EN_COURS' ? 'success' : 'neutral'}>
                    {viewingYear.status === 'EN_COURS' ? 'En cours' : 'Achevée'}
                  </Badge>
                  {viewingYear.isCurrent && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                      ★ Année en cours
                    </span>
                  )}
                  {!viewingYear.isActive && <Badge variant="danger">Inactive</Badge>}
                </div>
                <span className="text-[10px] font-bold text-slate-400 font-mono">ID: {viewingYear.id.slice(0, 8)}...</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">{viewingYear.name}</h3>
              <p className="text-xs font-mono text-emerald-700 font-bold mb-4">slug: {generateSlug(viewingYear.name)}</p>
              
              {viewingYear.school && (
                <div className="mb-4 p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-2 font-bold text-slate-700">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  {viewingYear.school.name} ({viewingYear.school.ville || 'Abidjan'})
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Début</span>
                  <span className="font-semibold text-slate-700">{formatDate(viewingYear.startDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Fin</span>
                  <span className="font-semibold text-slate-700">{formatDate(viewingYear.endDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Classes</span>
                  <span className="font-bold text-slate-900">{viewingYear._count?.classes ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Terms list */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" /> Trimestres ({viewingYear.terms.length})
              </h4>
              {viewingYear.terms.length > 0 ? (
                <div className="space-y-2">
                  {viewingYear.terms.map(t => (
                    <div key={t.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{t.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatDateShort(t.startDate)} → {formatDateShort(t.endDate)}</p>
                      </div>
                      <Badge variant={t.status === 'OPEN' ? 'success' : 'neutral'}>
                        {t.status === 'OPEN' ? 'Ouvert' : 'Fermé'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">Aucun trimestre défini.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ───── MODAL: CREATE / EDIT TERM ───── */}
      <Modal
        isOpen={isTermModalOpen}
        onClose={() => setIsTermModalOpen(false)}
        title={editingTerm ? "Modifier la période" : "Nouvelle Période / Trimestre"}
        size="sm"
        accentColor="cyan"
      >
        <form onSubmit={handleSubmitTerm(onSubmitTerm)} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Nom <span className="text-emerald-600">*</span></label>
            <input {...registerTerm('name', { required: true })} placeholder="Ex: Trimestre 1"
              className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Début <span className="text-emerald-600">*</span></label>
              <input type="date" {...registerTerm('startDate', { required: true })}
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Fin <span className="text-emerald-600">*</span></label>
              <input type="date" {...registerTerm('endDate', { required: true })}
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-bold"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsTermModalOpen(false)}>Annuler</Button>
            <Button type="submit" variant="glow">{editingTerm ? 'Sauvegarder' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      {/* ───── CONFIRM DELETE MODALS ───── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteYear}
        title="Supprimer l'année scolaire"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${yearToDelete?.name}" ? Tous les trimestres associés seront également supprimés.`}
        confirmText="Oui, supprimer"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isTermDeleteModalOpen}
        onClose={() => setIsTermDeleteModalOpen(false)}
        onConfirm={confirmDeleteTerm}
        title="Supprimer la période"
        message="Êtes-vous sûr de vouloir supprimer cette période / trimestre ? Cette action est irréversible."
        confirmText="Oui, supprimer"
        variant="danger"
      />
    </div>
  );
}
