import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Save, 
  X, 
  Building2, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Power, 
  ShieldCheck, 
  ShieldAlert, 
  User, 
  Mail, 
  Phone, 
  Filter, 
  Sparkles, 
  Check, 
  ChevronDown,
  Layers,
  Award,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

interface Subscription {
  id: string;
  name: string;
  planKey: string;
  description: string | null;
  price: number;
  period: string;
  features: string[];
  isActive: boolean;
  _count?: {
    schools: number;
  };
  schools?: { 
    id: string; 
    name: string; 
    ville: string;
    subscriptionStatus?: string;
    subscriptionEndDate?: string;
  }[];
}

interface EnrolledSchool {
  id: string;
  name: string;
  code: string;
  ville?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  subscriptionId?: string | null;
  subscription?: Subscription | null;
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'INACTIVE';
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  } | null;
  schoolType?: { id: string; name: string; code?: string | null } | null;
  teachingType?: { id: string; name: string } | null;
  academicYears?: {
    id: string;
    name: string;
    isCurrent?: boolean;
    status?: string;
  }[];
  _count?: {
    users: number;
    classes: number;
  };
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent?: boolean;
  status?: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [schools, setSchools] = useState<EnrolledSchool[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View tabs
  const [viewMode, setViewMode] = useState<'PLANS' | 'SCHOOLS'>('SCHOOLS');

  // Search & Filters for Enrolled Schools
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal: Create / Edit Subscription Plan
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    planKey: '',
    description: '',
    price: 0,
    period: 'par an',
    features: '',
    isActive: true
  });

  // Modal: Assign Subscription Plan to School
  const [isAssignPlanModalOpen, setIsAssignPlanModalOpen] = useState(false);
  const [selectedSchoolForPlan, setSelectedSchoolForPlan] = useState<EnrolledSchool | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Modal: Assign Academic Year to School
  const [isAssignYearModalOpen, setIsAssignYearModalOpen] = useState(false);
  const [selectedSchoolForYear, setSelectedSchoolForYear] = useState<EnrolledSchool | null>(null);
  const [selectedYearId, setSelectedYearId] = useState('');

  // Actions loading indicator
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [subsRes, schoolsRes, yearsRes] = await Promise.allSettled([
        api.get('/subscriptions?all=true'),
        api.get('/subscriptions/schools'),
        api.get('/academic/years')
      ]);

      if (subsRes.status === 'fulfilled') {
        setSubscriptions(subsRes.value.data || []);
      }
      if (schoolsRes.status === 'fulfilled') {
        setSchools(schoolsRes.value.data || []);
      }
      if (yearsRes.status === 'fulfilled') {
        setAcademicYears(yearsRes.value.data || []);
      }
    } catch (err) {
      console.error('Error fetching subscription data', err);
      setError('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Actions Écoles ──────────────────────────────────────────────────────────

  // Renouveler l'abonnement pour une année scolaire (+1 an)
  const handleRenewSubscription = async (school: EnrolledSchool) => {
    try {
      if (!window.confirm(`Voulez-vous renouveler l'abonnement annuel de l'établissement "${school.name}" ?\n\nCela prolongera l'accès d'une année scolaire complète et réactivera l'école.`)) {
        return;
      }
      setActionLoading(school.id);
      await api.post('/subscriptions/renew', { schoolId: school.id });
      await fetchData();
      alert(`L'abonnement de "${school.name}" a été renouvelé avec succès pour une année scolaire complète !`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur lors du renouvellement.');
    } finally {
      setActionLoading(null);
    }
  };

  // Activer / Désactiver (Fermer) l'accès d'une école
  const handleToggleSchoolStatus = async (school: EnrolledSchool) => {
    try {
      const willBeActive = !school.isActive;
      const confirmMessage = willBeActive
        ? `Activer l'établissement "${school.name}" ?\nL'école sera opérationnelle et visible sur la plateforme.`
        : `Désactiver / Fermer l'accès de l'établissement "${school.name}" ?\nL'école ne sera plus active sur la plateforme jusqu'à réactivation.`;

      if (!window.confirm(confirmMessage)) return;

      setActionLoading(school.id);
      await api.patch('/subscriptions/school/status', {
        schoolId: school.id,
        isActive: willBeActive,
        subscriptionStatus: willBeActive ? 'ACTIVE' : 'INACTIVE'
      });
      await fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur lors du changement de statut.');
    } finally {
      setActionLoading(null);
    }
  };

  // Ouvrir modal pour changer le plan d'une école
  const openAssignPlanModal = (school: EnrolledSchool) => {
    setSelectedSchoolForPlan(school);
    setSelectedPlanId(school.subscriptionId || (subscriptions[0]?.id || ''));
    setIsAssignPlanModalOpen(true);
  };

  const handleSaveAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolForPlan || !selectedPlanId) return;

    try {
      setActionLoading(selectedSchoolForPlan.id);
      await api.patch('/subscriptions/school', {
        schoolId: selectedSchoolForPlan.id,
        subscriptionId: selectedPlanId
      });
      setIsAssignPlanModalOpen(false);
      await fetchData();
      alert('Formule d\'abonnement mise à jour avec succès !');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setActionLoading(null);
    }
  };

  // Ouvrir modal pour associer une année académique
  const openAssignYearModal = (school: EnrolledSchool) => {
    setSelectedSchoolForYear(school);
    const activeYear = academicYears.find(y => y.isCurrent) || academicYears[0];
    setSelectedYearId(activeYear?.id || '');
    setIsAssignYearModalOpen(true);
  };

  const handleSaveAssignYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolForYear || !selectedYearId) return;

    try {
      setActionLoading(selectedSchoolForYear.id);
      await api.post('/subscriptions/school/academic-year', {
        schoolId: selectedSchoolForYear.id,
        academicYearId: selectedYearId
      });
      setIsAssignYearModalOpen(false);
      await fetchData();
      alert('Année académique associée avec succès à l\'établissement !');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'association de l\'année académique.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Actions Plans ───────────────────────────────────────────────────────────

  const openCreatePlanModal = () => {
    setEditingSub(null);
    setPlanFormData({
      name: '',
      planKey: '',
      description: '',
      price: 195000,
      period: 'par an',
      features: 'Gestion complète élèves & classes, Bulletins automatisés officiels SEEEC, Agenda scolaire synchronisé, Cahier de texte numérique, Support dédié',
      isActive: true
    });
    setIsPlanModalOpen(true);
  };

  const openEditPlanModal = (sub: Subscription) => {
    setEditingSub(sub);
    setPlanFormData({
      name: sub.name,
      planKey: sub.planKey,
      description: sub.description || '',
      price: sub.price,
      period: sub.period || 'par an',
      features: sub.features ? sub.features.join(', ') : '',
      isActive: sub.isActive
    });
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...planFormData,
        features: planFormData.features.split(',').map(f => f.trim()).filter(Boolean),
        id: editingSub?.id
      };
      
      if (editingSub) {
        await api.put('/subscriptions', payload);
      } else {
        await api.post('/subscriptions', payload);
      }
      setIsPlanModalOpen(false);
      await fetchData();
      alert('Plan d\'abonnement enregistré avec succès !');
    } catch (err: unknown) {
      const error = err as AxiosError<{message: string}>;
      alert(error.response?.data?.message || 'Erreur lors de la sauvegarde.');
    }
  };

  // ── Filtrage des écoles ─────────────────────────────────────────────────────

  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        school.name.toLowerCase().includes(q) ||
        (school.code && school.code.toLowerCase().includes(q)) ||
        (school.ville && school.ville.toLowerCase().includes(q)) ||
        (school.manager && `${school.manager.firstName} ${school.manager.lastName}`.toLowerCase().includes(q)) ||
        (school.manager && school.manager.email.toLowerCase().includes(q))
      );

      const matchesPlan = planFilter === 'ALL' || (
        school.subscription?.planKey === planFilter || school.subscriptionId === planFilter
      );

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchesStatus = school.isActive && school.subscriptionStatus === 'ACTIVE';
      } else if (statusFilter === 'EXPIRED') {
        matchesStatus = school.subscriptionStatus === 'EXPIRED' || (
          Boolean(school.subscriptionEndDate && new Date(school.subscriptionEndDate) < new Date())
        );
      } else if (statusFilter === 'INACTIVE') {
        matchesStatus = !school.isActive || school.subscriptionStatus === 'INACTIVE';
      }

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [schools, searchQuery, planFilter, statusFilter]);

  // KPIs
  const totalSchools = schools.length;
  const activeSchoolsCount = schools.filter(s => s.isActive && s.subscriptionStatus === 'ACTIVE').length;
  const expiredSchoolsCount = schools.filter(s => s.subscriptionStatus === 'EXPIRED' || (!s.isActive && s.subscriptionStatus === 'INACTIVE')).length;
  const activePlansCount = subscriptions.filter(s => s.isActive).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-semibold">Chargement des abonnements et des écoles...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* ── EN-TÊTE DE LA PAGE ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center border border-indigo-600/20 shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Gestion des Abonnements & Écoles
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Supervision des formules annuelles, écoles inscrites, renouvellements et accès plateforme.
              </p>
            </div>
          </div>
        </div>

        {/* Actions header */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openCreatePlanModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Plan Tarifaire</span>
          </button>
        </div>
      </div>

      {/* ── KPI HIGHLIGHTS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Écoles Inscrites</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{totalSchools}</span>
            <span className="text-[10px] text-slate-500 font-medium">Tous établissements</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Abonnements Actifs</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{activeSchoolsCount}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Opérationnels & En ligne</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">À Renouveler / Fermés</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{expiredSchoolsCount}</span>
            <span className="text-[10px] text-amber-600 font-semibold">Accès restreint ou clos</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Périodicité des Packs</span>
            <span className="text-2xl font-black text-indigo-900 mt-1 block">Par an</span>
            <span className="text-[10px] text-slate-500 font-medium">Facturation Annuelle</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── SÉLECTEUR D'ONGLETS / VUES ── */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs inline-flex gap-2">
        <button
          type="button"
          onClick={() => setViewMode('SCHOOLS')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
            viewMode === 'SCHOOLS'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Liste Complète des Écoles Inscrites ({schools.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('PLANS')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
            viewMode === 'PLANS'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Formules & Packs Tarifaires ({subscriptions.length})</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* VUE 1 : LISTE COMPLÈTE DES ÉCOLES INSCRITES AUX ABONNEMENTS */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'SCHOOLS' && (
        <div className="space-y-6">
          
          {/* Barre de recherche et filtres */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher école, code, ville, directeur..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Filtre par Plan */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-600">Pack :</span>
                <select
                  value={planFilter}
                  onChange={e => setPlanFilter(e.target.value)}
                  className="bg-transparent font-bold text-indigo-700 outline-none cursor-pointer"
                >
                  <option value="ALL">Tous les packs</option>
                  {subscriptions.map(s => (
                    <option key={s.id} value={s.planKey || s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtre par Statut */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-600">Statut :</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="ACTIVE">Actifs / En ligne</option>
                  <option value="EXPIRED">Expirés / À renouveler</option>
                  <option value="INACTIVE">Fermés / Inactifs</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tableau des Écoles */}
          {filteredSchools.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-800">Aucun établissement ne correspond aux filtres</p>
              <p className="text-xs text-slate-500">Essayez de réinitialiser la recherche ou modifiez vos critères.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-black border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Établissement</th>
                      <th className="px-5 py-4">Responsable</th>
                      <th className="px-5 py-4">Formule Souscrite</th>
                      <th className="px-5 py-4">Période & Échéance</th>
                      <th className="px-5 py-4">Année Scolaire</th>
                      <th className="px-5 py-4 text-center">Statut</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {filteredSchools.map((school) => {
                      const isExpired = school.subscriptionStatus === 'EXPIRED' || (
                        Boolean(school.subscriptionEndDate && new Date(school.subscriptionEndDate) < new Date())
                      );
                      const isClosed = !school.isActive || school.subscriptionStatus === 'INACTIVE';
                      const isLoadingThis = actionLoading === school.id;

                      return (
                        <tr key={school.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Établissement */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-black text-sm flex items-center justify-center border border-indigo-100 shrink-0">
                                {school.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{school.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {school.code && (
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      {school.code}
                                    </span>
                                  )}
                                  {school.ville && (
                                    <span className="text-[11px] text-slate-500">
                                      📍 {school.ville}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Responsable */}
                          <td className="px-5 py-4">
                            {school.manager ? (
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-800">
                                  {school.manager.firstName} {school.manager.lastName}
                                </p>
                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{school.manager.email}</span>
                                </p>
                                {school.manager.phone && (
                                  <p className="text-[10px] text-slate-400">
                                    📞 {school.manager.phone}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Non assigné</span>
                            )}
                          </td>

                          {/* Formule Souscrite */}
                          <td className="px-5 py-4">
                            {school.subscription ? (
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${
                                  school.subscription.planKey === 'pro'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : school.subscription.planKey === 'elite'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>{school.subscription.name}</span>
                                </span>
                                <div className="text-[11px] font-bold text-slate-500">
                                  {school.subscription.price.toLocaleString('fr-FR')} FCFA / an
                                </div>
                              </div>
                            ) : (
                              <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-[11px] font-bold border border-amber-200 inline-block">
                                Sans abonnement
                              </span>
                            )}
                          </td>

                          {/* Période & Échéance */}
                          <td className="px-5 py-4">
                            <div className="space-y-1 text-[11px]">
                              {school.subscriptionStartDate && (
                                <div className="text-slate-500">
                                  Début : <strong className="text-slate-700">{new Date(school.subscriptionStartDate).toLocaleDateString('fr-FR')}</strong>
                                </div>
                              )}
                              {school.subscriptionEndDate ? (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Échéance :</span>
                                  <strong className={isExpired ? 'text-red-600 font-black' : 'text-emerald-700 font-bold'}>
                                    {new Date(school.subscriptionEndDate).toLocaleDateString('fr-FR')}
                                  </strong>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Illimité / Non défini</span>
                              )}
                            </div>
                          </td>

                          {/* Année Scolaire */}
                          <td className="px-5 py-4">
                            {school.academicYears && school.academicYears.length > 0 ? (
                              <div className="flex flex-wrap gap-1 items-center">
                                {school.academicYears.map(y => (
                                  <span key={y.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                                    <GraduationCap className="w-3 h-3" />
                                    <span>{y.name}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Aucune année liée</span>
                            )}
                          </td>

                          {/* Statut Plateforme */}
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            {isClosed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                                <XCircle className="w-3.5 h-3.5 text-slate-500" /> Fermé / Inactif
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Expiré (À renouveler)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Actif & En Ligne
                              </span>
                            )}
                          </td>

                          {/* Actions Directes */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1. Bouton Renouveler */}
                              <button
                                type="button"
                                disabled={isLoadingThis}
                                onClick={() => handleRenewSubscription(school)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition cursor-pointer"
                                title="Renouveler pour 1 an (Année scolaire)"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThis ? 'animate-spin' : ''}`} />
                                <span>Renouveler</span>
                              </button>

                              {/* 2. Bouton Activer / Fermer */}
                              <button
                                type="button"
                                disabled={isLoadingThis}
                                onClick={() => handleToggleSchoolStatus(school)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs border transition cursor-pointer ${
                                  school.isActive 
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200' 
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                                title={school.isActive ? "Fermer l'accès à la plateforme" : "Activer et rendre opérationnel"}
                              >
                                <Power className="w-3.5 h-3.5" />
                                <span>{school.isActive ? 'Fermer' : 'Activer'}</span>
                              </button>

                              {/* 3. Changer de plan */}
                              <button
                                type="button"
                                onClick={() => openAssignPlanModal(school)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition cursor-pointer"
                                title="Changer la formule d'abonnement"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>

                              {/* 4. Associer Année Académique */}
                              <button
                                type="button"
                                onClick={() => openAssignYearModal(school)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition cursor-pointer"
                                title="Associer une année académique"
                              >
                                <Calendar className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* VUE 2 : FORMULES & PACKS TARIFAIRES */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'PLANS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map(sub => (
              <div key={sub.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="p-6 border-b border-slate-100 bg-slate-50/70 relative">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-xl text-slate-900">{sub.name}</h3>
                      {sub.isActive ? (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Actif</span>
                      ) : (
                        <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Inactif</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed min-h-[32px]">{sub.description}</p>
                    
                    <div className="mt-4 p-3 rounded-2xl bg-white border border-slate-200/80 flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-black text-indigo-950">
                          {sub.price === 0 ? "Gratuit" : `${sub.price.toLocaleString('fr-FR')} FCFA`}
                        </span>
                        <span className="text-xs font-bold text-slate-400 block mt-0.5">
                          / {sub.period || 'par an (année scolaire)'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        {sub.planKey}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
                        Fonctionnalités incluses ({sub.features?.length || 0})
                      </h4>
                      <ul className="space-y-2">
                        {sub.features?.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setPlanFilter(sub.planKey || sub.id);
                      setViewMode('SCHOOLS');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Voir les écoles inscrites ({sub.schools?.length || sub._count?.schools || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditPlanModal(sub)}
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL : CRÉER / MODIFIER UN PLAN TARIFAIRE */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-black text-slate-900">
                  {editingSub ? 'Modifier la Formule Tarifaire' : 'Nouvelle Formule d\'Abonnement'}
                </h2>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nom du pack</label>
                  <input
                    required
                    type="text"
                    value={planFormData.name}
                    onChange={e => setPlanFormData({ ...planFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ex: Pack Pro Établissement"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Clé unique (planKey)</label>
                  <input
                    required
                    type="text"
                    value={planFormData.planKey}
                    onChange={e => setPlanFormData({ ...planFormData, planKey: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ex: pro"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <input
                  type="text"
                  value={planFormData.description}
                  onChange={e => setPlanFormData({ ...planFormData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Pour les collèges & lycées d'excellence..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prix Annuel (FCFA)</label>
                  <input
                    required
                    type="number"
                    value={planFormData.price}
                    onChange={e => setPlanFormData({ ...planFormData, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Ex: 390000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Périodicité</label>
                  <input
                    required
                    type="text"
                    value={planFormData.period}
                    onChange={e => setPlanFormData({ ...planFormData, period: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="par an (année scolaire)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fonctionnalités incluses (séparées par une virgule)
                </label>
                <textarea
                  required
                  rows={4}
                  value={planFormData.features}
                  onChange={e => setPlanFormData({ ...planFormData, features: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Gestion complète élèves, Bulletins certifiés SEEEC, Cahier de texte, Messagerie directe..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="planIsActive"
                  checked={planFormData.isActive}
                  onChange={e => setPlanFormData({ ...planFormData, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="planIsActive" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Plan actif et visible sur le site public
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-700 transition-colors shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer le Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL : ASSIGNER UNE FORMULE D'ABONNEMENT À UNE ÉCOLE */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {isAssignPlanModalOpen && selectedSchoolForPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Changer la Formule d'Abonnement
                </h3>
              </div>
              <button
                onClick={() => setIsAssignPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignPlan} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Établissement</span>
                <span className="font-bold text-sm text-slate-900">{selectedSchoolForPlan.name}</span>
                {selectedSchoolForPlan.ville && (
                  <span className="text-xs text-slate-500 block">📍 {selectedSchoolForPlan.ville}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Sélectionner la Formule d'Abonnement
                </label>
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <label
                      key={sub.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedPlanId === sub.id
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="subPlanRadio"
                          value={sub.id}
                          checked={selectedPlanId === sub.id}
                          onChange={() => setSelectedPlanId(sub.id)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900">{sub.name}</p>
                          <p className="text-[11px] text-slate-500">{sub.description}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-indigo-900 shrink-0">
                        {sub.price.toLocaleString('fr-FR')} F/an
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-md"
                >
                  Appliquer la formule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL : ASSOCIER UNE ANNÉE ACADÉMIQUE À UNE ÉCOLE */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {isAssignYearModalOpen && selectedSchoolForYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-base">
                  Associer une Année Académique
                </h3>
              </div>
              <button
                onClick={() => setIsAssignYearModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignYear} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Établissement</span>
                <span className="font-bold text-sm text-slate-900">{selectedSchoolForYear.name}</span>
                {selectedSchoolForYear.academicYears && selectedSchoolForYear.academicYears.length > 0 && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Année(s) déjà liée(s) : {selectedSchoolForYear.academicYears.map(y => y.name).join(', ')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Choisir l'Année Académique
                </label>
                <div className="space-y-2">
                  {academicYears.map((year) => (
                    <label
                      key={year.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedYearId === year.id
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="academicYearRadio"
                          value={year.id}
                          checked={selectedYearId === year.id}
                          onChange={() => setSelectedYearId(year.id)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="font-bold text-xs sm:text-sm text-slate-900">{year.name}</span>
                      </div>
                      {year.isCurrent && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignYearModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-md"
                >
                  Associer l'année
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
