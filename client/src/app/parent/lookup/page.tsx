import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import {
  Search, Calendar, UserCheck, BookOpen, Award, Clock,
  ShieldCheck, AlertCircle, FileText, Sparkles, ArrowLeft,
  School, CheckCircle2, XCircle, Printer, MessageCircle,
  TrendingUp, Users, Lock, ChevronRight, Loader2, Download,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import BulletinIndividuel from '@/app/academic/report-cards/BulletinIndividuel';
import { BrandLogo } from '@/components/common/BrandLogo';
import { exportBulletinPdf } from '@/lib/bulletinPdfGenerator';
import { StudentCardModal } from '@/components/cards/StudentCardModal';
import { StudentCardData } from '@/lib/studentCardPdfGenerator';

const DEMO_PRESETS = [
  { matricule: 'MAT-2026-4A00', name: 'Jean Koffi (4ème A)', birthDate: '2012-05-14' },
  { matricule: 'MAT-2026-4A02', name: 'Bamba Fatoumata (4ème A)', birthDate: '2012-08-22' },
  { matricule: 'MAT-2026-4A09', name: 'Sylla Mariam (4ème A)', birthDate: '2011-11-03' },
];

export default function PublicStudentTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMatricule = searchParams.get('matricule') || '';
  const initialBirthDate = searchParams.get('birthDate') || '';

  const [matricule, setMatricule] = useState(initialMatricule);
  const [birthDate, setBirthDate] = useState(initialBirthDate);

  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'presence' | 'homework' | 'grades' | 'teachers'>('overview');
  const [homeworkFilter, setHomeworkFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'SUBMITTED' | 'GRADED'>('ALL');

  // Bulletin Modal & Direct Export
  const [selectedBulletinData, setSelectedBulletinData] = useState<any | null>(null);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showStudentCard, setShowStudentCard] = useState(false);

  // Charger les trimestres disponibles
  useEffect(() => {
    fetchTerms();
  }, []);

  // Déclencher la recherche si des paramètres d'URL sont présents
  useEffect(() => {
    if (initialMatricule && initialBirthDate) {
      handleSearch(initialMatricule, initialBirthDate);
    }
  }, [initialMatricule, initialBirthDate]);

  const fetchTerms = async () => {
    try {
      const res = await api.get('/parents/terms');
      const allTerms = res.data || [];
      setTerms(allTerms);
      const openTerm = allTerms.find((t: any) => t.status === 'OPEN') || allTerms[0];
      if (openTerm && !selectedTermId) setSelectedTermId(openTerm.id);
    } catch (e) {
      console.warn("Trimestres non chargés via /parents/terms:", e);
    }
  };

  const handleSearch = async (mat?: string, bDate?: string, tId?: string) => {
    const targetMatricule = (mat ?? matricule).trim().toUpperCase();
    const targetBirthDate = bDate ?? birthDate;
    const targetTerm = tId ?? selectedTermId;

    if (!targetMatricule) {
      setError("Veuillez saisir le matricule de l'enfant.");
      return;
    }
    if (!targetBirthDate) {
      setError("Veuillez renseigner la date de naissance.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/parents/lookup', {
        matricule: targetMatricule,
        birthDate: targetBirthDate,
        termId: targetTerm && targetTerm !== 'ALL' ? targetTerm : undefined
      });

      setData(res.data);
      if (res.data?.availableTerms && res.data.availableTerms.length > 0) {
        setTerms(res.data.availableTerms);
      }
      // Mettre à jour l'URL sans recharger la page
      setSearchParams({ matricule: targetMatricule, birthDate: targetBirthDate });
    } catch (err: any) {
      setData(null);
      setError(err.response?.data?.message || "Impossible de trouver le dossier correspondant à ces identifiants.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBulletin = async () => {
    if (!data?.student?.id) return;
    setLoadingBulletin(true);
    try {
      const res = await api.get(`/parents/public-bulletin/${data.student.id}`, {
        params: { termId: selectedTermId && selectedTermId !== 'ALL' ? selectedTermId : undefined }
      });
      setSelectedBulletinData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || "Le bulletin officiel certifié n'est pas encore disponible ou publié pour cette période.");
    } finally {
      setLoadingBulletin(false);
    }
  };

  const handleDirectExportPdf = async () => {
    if (!data?.student?.id || exportingPdf) return;
    setExportingPdf(true);
    try {
      const res = await api.get(`/parents/public-bulletin/${data.student.id}`, {
        params: { termId: selectedTermId && selectedTermId !== 'ALL' ? selectedTermId : undefined }
      });
      if (res.data) {
        await exportBulletinPdf(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Le bulletin certifié n'est pas encore disponible pour l'export.");
    } finally {
      setExportingPdf(false);
    }
  };

  const student = data?.student;
  const presence = data?.presence;
  const conduct = data?.conduct;
  const assignments = data?.assignments;
  const subjectAverages = data?.subjectAverages || [];
  const recentGrades = data?.recentGrades || [];
  const overallAverage = data?.overallAverage;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-16">
      
      {/* ── HEADER NAVIGATION VITRINE ── */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <BrandLogo size="md" to="/" subtitle="SEEEC" />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-bold text-slate-700">
                Se connecter
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                Retour Accueil
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* ── BARRE DE RECHERCHE PRINCIPALE (CARTE HERO TOP) ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-xs font-black uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-pink-600" />
              Accès Direct Parent • Suivi Scolaire Instantané
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Suivi Scolaire de votre Enfant
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl font-medium">
              Saisissez le matricule officiel et la date de naissance pour consulter le carnet de notes, les présences, devoirs et le bulletin certifié.
            </p>

            {/* Quick Demo Chips */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Exemples rapides :</span>
              {DEMO_PRESETS.map((c) => (
                <button
                  key={c.matricule}
                  type="button"
                  onClick={() => {
                    setMatricule(c.matricule);
                    setBirthDate(c.birthDate);
                    handleSearch(c.matricule, c.birthDate, selectedTermId);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-pink-50 text-slate-700 hover:text-pink-700 border border-slate-200 hover:border-pink-200 transition-all flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-pink-600" />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>

            {/* Formulaire de Recherche */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-3"
            >
              {/* Matricule */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Matricule de l'élève <span className="text-pink-600">*</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                    placeholder="Ex: MAT-2026-4A00"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-pink-600 focus:ring-2 focus:ring-pink-600/10 outline-none uppercase font-mono"
                    required
                  />
                </div>
              </div>

              {/* Date de Naissance */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Date de Naissance <span className="text-pink-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-pink-600 focus:ring-2 focus:ring-pink-600/10 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Trimestre / Période */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Trimestre
                </label>
                <select
                  value={selectedTermId}
                  onChange={(e) => {
                    setSelectedTermId(e.target.value);
                    if (data) handleSearch(matricule, birthDate, e.target.value);
                  }}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-250 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-pink-600 outline-none cursor-pointer"
                >
                  <option value="ALL">Tous les trimestres</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bouton de Recherche */}
              <div className="md:col-span-2 flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={loading}
                  className="w-full h-[46px] bg-pink-600 hover:bg-pink-700 text-white font-black shadow-lg shadow-pink-600/25 rounded-2xl"
                >
                  Consulter
                </Button>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold flex items-center gap-3 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-bold">Dossier introuvable</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── AFFICHAGE DU DOSSIER ÉLÈVE ── */}
        {data && student && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
            
            {/* ── HERO BANNER ÉLÈVE (STYLE ÉPURÉ, CONTRASTE PARFAIT) ── */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-pink-700 via-purple-700 to-indigo-800 text-white p-6 md:p-8 shadow-xl">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center font-black text-3xl shadow-lg shrink-0 overflow-hidden">
                    {student.avatarUrl || student.photoUrl || student.photo ? (
                      <img
                        src={
                          (student.avatarUrl || student.photoUrl || student.photo).startsWith('http') || (student.avatarUrl || student.photoUrl || student.photo).startsWith('data:')
                            ? (student.avatarUrl || student.photoUrl || student.photo)
                            : (student.avatarUrl || student.photoUrl || student.photo).startsWith('/uploads')
                            ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${student.avatarUrl || student.photoUrl || student.photo}`
                            : (student.avatarUrl || student.photoUrl || student.photo)
                        }
                        alt={`${student.firstName} ${student.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl">
                        {student.firstName?.[0]}{student.lastName?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl lg:text-3xl font-black text-white tracking-tight">
                      Bienvenue cher parent — Suivi de {student.lastName} {student.firstName}
                    </h2>
                    <p className="text-white/95 text-sm flex items-center gap-3 flex-wrap font-medium pt-0.5">
                      <span>Matricule : <strong className="font-mono text-white font-black">{student.matricule}</strong></span>
                      <span>•</span>
                      <span>Classe : <strong className="text-white font-black">{student.currentClass || '4ème A'}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <School className="w-4 h-4 text-pink-200" />
                        <span className="text-white font-bold">{student.school || 'Complexe Scolaire SEEEC'}</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowStudentCard(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-indigo-900/30 hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-indigo-400 shrink-0 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-white" />
                    <span>Carte Scolaire (3D)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenBulletin}
                    disabled={loadingBulletin}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-black/25 hover:bg-pink-50 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-white shrink-0 cursor-pointer"
                  >
                    {loadingBulletin ? (
                      <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-pink-600" />
                    )}
                    <span className="text-slate-950">Consulter le Bulletin</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectExportPdf}
                    disabled={exportingPdf}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-pink-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-pink-900/30 hover:bg-pink-500 hover:scale-[1.02] active:scale-[0.98] transition-all border-2 border-pink-500 shrink-0 cursor-pointer"
                  >
                    {exportingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Download className="w-4 h-4 text-white" />
                    )}
                    <span>{exportingPdf ? 'Exportation...' : 'Télécharger PDF'}</span>
                  </button>
                </div>
              </div>

              {/* 4 KPIs Clés */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/20">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/15">
                  <p className="text-[11px] font-bold text-pink-100 uppercase">Moyenne Générale</p>
                  <p className="text-2xl font-black mt-0.5 text-white">
                    {overallAverage !== null ? `${overallAverage.toFixed(2)}/20` : 'En cours'}
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/15">
                  <p className="text-[11px] font-bold text-pink-100 uppercase">Présence & Assiduité</p>
                  <p className="text-2xl font-black mt-0.5 text-emerald-300">
                    {presence?.attendanceRate ?? 100}%
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/15">
                  <p className="text-[11px] font-bold text-pink-100 uppercase">Devoirs à Rendre</p>
                  <p className={`text-2xl font-black mt-0.5 ${(assignments?.pending || 0) > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {assignments?.pending ?? 0} en attente
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/15">
                  <p className="text-[11px] font-bold text-pink-100 uppercase">Note de Conduite</p>
                  <p className="text-2xl font-black mt-0.5 text-white">
                    {conduct?.grade ?? 20}/20
                  </p>
                </div>
              </div>
            </div>

            {/* ── NAVIGATION PAR ONGLETS ── */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 border-b border-slate-200 overflow-x-auto custom-scrollbar bg-slate-50/50">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 py-4 px-4 text-sm font-black border-b-2 transition-all shrink-0 ${
                    activeTab === 'overview'
                      ? 'border-pink-600 text-pink-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Synthèse Globale
                </button>
                <button
                  onClick={() => setActiveTab('presence')}
                  className={`flex items-center gap-2 py-4 px-4 text-sm font-black border-b-2 transition-all shrink-0 ${
                    activeTab === 'presence'
                      ? 'border-pink-600 text-pink-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  Assiduité & Registre ({presence?.totalHours || 0}h)
                </button>
                <button
                  onClick={() => setActiveTab('homework')}
                  className={`flex items-center gap-2 py-4 px-4 text-sm font-black border-b-2 transition-all shrink-0 ${
                    activeTab === 'homework'
                      ? 'border-pink-600 text-pink-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Devoirs & Cahier ({assignments?.pending || 0} à faire)
                </button>
                <button
                  onClick={() => setActiveTab('grades')}
                  className={`flex items-center gap-2 py-4 px-4 text-sm font-black border-b-2 transition-all shrink-0 ${
                    activeTab === 'grades'
                      ? 'border-pink-600 text-pink-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  Notes & Matières ({subjectAverages.length})
                </button>
                <button
                  onClick={() => setActiveTab('teachers')}
                  className={`flex items-center gap-2 py-4 px-4 text-sm font-black border-b-2 transition-all shrink-0 ${
                    activeTab === 'teachers'
                      ? 'border-pink-600 text-pink-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Professeurs ({data.teachers?.length || 0})
                </button>
              </div>

              <div className="p-6 md:p-8">
                
                {/* ── TAB 1 : SYNTHÈSE 360° ── */}
                {activeTab === 'overview' && (
                  <div className="space-y-8 animate-in fade-in">
                    
                    {/* Alerte Statut Présence Aujourd'hui */}
                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      presence?.isAbsentToday
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${presence?.isAbsentToday ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                        <div>
                          <p className="font-black text-sm">
                            {presence?.isAbsentToday ? 'Statut du jour : Absent(e)' : 'Statut du jour : Présent(e) en classe'}
                          </p>
                          <p className="text-xs opacity-90">
                            {presence?.isAbsentToday
                              ? "Une absence a été signalée aujourd'hui par la vie scolaire."
                              : "Votre enfant est bien enregistré présent aux cours programmés aujourd'hui."}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-3 py-1 bg-white/80 rounded-xl">
                        Aujourd'hui : {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {/* Conduite & Discipline */}
                    <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 p-6 rounded-2xl border border-purple-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-purple-900">Vie Scolaire & Discipline</span>
                          <h3 className="text-xl font-black text-slate-900 mt-1">
                            Note de Conduite : <span className="text-purple-700 font-mono text-2xl">{conduct?.grade ?? 20}/20</span>
                          </h3>
                          <p className="text-xs text-slate-600 mt-1 italic">
                            « {conduct?.appreciation || 'Très bonne assiduité et comportement exemplaire.'} »
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-slate-500">Formule réglementaire :</span>
                          <p className="text-xs font-mono text-slate-700 mt-0.5">{conduct?.formula}</p>
                        </div>
                      </div>
                    </div>

                    {/* Aperçu Moyennes & Derniers Devoirs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Moyennes par Matière */}
                      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-600" />
                            Moyennes par Matière (Trimestre Actif)
                          </h4>
                          <button onClick={() => setActiveTab('grades')} className="text-xs font-bold text-pink-600 hover:underline">
                            Tout voir →
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {subjectAverages.slice(0, 5).map((subj: any) => (
                            <div key={subj.subjectName} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <div>
                                <p className="font-black text-xs text-slate-900">{subj.subjectName}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Coef. {subj.coefficient} • {subj.gradesCount} évaluation(s)</p>
                              </div>
                              <span className={`text-sm font-black font-mono px-2.5 py-1 rounded-lg ${
                                subj.average >= 14
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : subj.average >= 10
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {subj.average !== null ? `${subj.average.toFixed(2)}/20` : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Devoirs & Travaux récents */}
                      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-purple-600" />
                            Devoirs & Travaux de Maison
                          </h4>
                          <button onClick={() => setActiveTab('homework')} className="text-xs font-bold text-pink-600 hover:underline">
                            Tout voir →
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {(assignments?.list || []).slice(0, 5).map((hw: any) => (
                            <div key={hw.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-black text-xs text-slate-900 truncate">{hw.title}</p>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">{hw.subject} • Échéance : {new Date(hw.dueDate).toLocaleDateString('fr-FR')}</p>
                              </div>
                              <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                                hw.status === 'GRADED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : hw.status === 'SUBMITTED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : hw.status === 'OVERDUE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {hw.status === 'GRADED' ? `Noté (${hw.grade}/20)` : hw.status === 'SUBMITTED' ? 'Rendu' : hw.status === 'OVERDUE' ? 'En retard' : 'À faire'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* ── TAB 2 : ASSIDUITÉ & PRÉSENCE ── */}
                {activeTab === 'presence' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase">Taux d'Assiduité</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">{presence?.attendanceRate ?? 100}%</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase">Heures Justifiées</p>
                        <p className="text-2xl font-black text-blue-600 mt-1">{presence?.justifiedHours ?? 0}h</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase">Heures Non Justifiées</p>
                        <p className="text-2xl font-black text-red-600 mt-1">{presence?.unjustifiedHours ?? 0}h</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h4 className="font-black text-sm text-slate-900">Registre détaillé des absences et retards</h4>
                      </div>
                      {presence?.list && presence.list.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {presence.list.map((abs: any) => (
                            <div key={abs.id} className="p-4 flex items-center justify-between gap-4">
                              <div>
                                <p className="font-black text-sm text-slate-900">
                                  {new Date(abs.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Matière : <strong className="text-slate-700">{abs.subject}</strong> • Durée : <strong>{abs.hours}h</strong>
                                  {abs.reason && <span className="italic"> — Motif : « {abs.reason} »</span>}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                                abs.justified
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {abs.justified ? 'Justifiée' : 'Injustifiée'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-500 text-sm">
                          🎉 Aucune absence enregistrée pour cet élève. Assiduité parfaite !
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB 3 : DEVOIRS ── */}
                {activeTab === 'homework' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {(['ALL', 'PENDING', 'OVERDUE', 'SUBMITTED', 'GRADED'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setHomeworkFilter(filter)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                            homeworkFilter === filter
                              ? 'bg-pink-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {filter === 'ALL' ? 'Tous les devoirs' : filter === 'PENDING' ? 'À faire' : filter === 'OVERDUE' ? 'En retard' : filter === 'SUBMITTED' ? 'Rendus' : 'Notés'}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(assignments?.list || [])
                        .filter((hw: any) => {
                          if (homeworkFilter === 'ALL') return true;
                          return hw.status === homeworkFilter;
                        })
                        .map((hw: any) => (
                          <div key={hw.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-pink-600">{hw.subject}</span>
                                <h5 className="font-black text-sm text-slate-900 mt-0.5">{hw.title}</h5>
                              </div>
                              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                                hw.status === 'GRADED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : hw.status === 'SUBMITTED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : hw.status === 'OVERDUE'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {hw.status === 'GRADED' ? `Note : ${hw.grade}/20` : hw.status === 'SUBMITTED' ? 'Rendu' : hw.status === 'OVERDUE' ? 'En retard' : 'À rendre'}
                              </span>
                            </div>
                            {hw.description && <p className="text-xs text-slate-600 line-clamp-2">{hw.description}</p>}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                              <span>Date limite : <strong className="text-slate-700">{new Date(hw.dueDate).toLocaleDateString('fr-FR')}</strong></span>
                              <span>Coef. {hw.coefficient}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 4 : NOTES & MATIÈRES ── */}
                {activeTab === 'grades' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subjectAverages.map((subj: any) => (
                        <div key={subj.subjectName} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="font-black text-sm text-slate-900">{subj.subjectName}</h5>
                              <p className="text-xs text-slate-400">Coefficient : {subj.coefficient}</p>
                            </div>
                            <span className={`text-base font-black font-mono px-3 py-1 rounded-xl ${
                              subj.average >= 14
                                ? 'bg-emerald-100 text-emerald-800'
                                : subj.average >= 10
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {subj.average !== null ? `${subj.average.toFixed(2)}/20` : '—'}
                            </span>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Notes obtenues ({subj.gradesCount}) :</p>
                            <div className="flex flex-wrap gap-1.5">
                              {subj.grades.map((g: any) => (
                                <span
                                  key={g.id}
                                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                                    g.value >= 10 ? 'bg-slate-100 text-slate-800' : 'bg-red-50 text-red-700'
                                  }`}
                                  title={g.comment || `Note : ${g.value}/20`}
                                >
                                  {g.value}/20
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 5 : ÉQUIPE PÉDAGOGIQUE ── */}
                {activeTab === 'teachers' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(data.teachers || []).map((t: any) => (
                        <div key={t.teacherId + t.subject} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 font-black flex items-center justify-center text-lg shrink-0">
                            {t.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <h5 className="font-black text-sm text-slate-900">{t.name}</h5>
                            <p className="text-xs text-pink-600 font-bold mt-0.5">{t.subject}</p>
                            {t.email && <p className="text-[11px] text-slate-400 mt-1">{t.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

      </main>

      {/* ── MODAL BULLETIN OFFICIEL CERTIFIÉ ── */}
      {selectedBulletinData && (
        <Modal
          isOpen={!!selectedBulletinData}
          onClose={() => setSelectedBulletinData(null)}
          title="Bulletin Scolaire Officiel Certifié"
          size="xl"
        >
          <div className="space-y-4">
            <BulletinIndividuel
              data={selectedBulletinData}
              onClose={() => setSelectedBulletinData(null)}
            />
          </div>
        </Modal>
      )}

      {/* ── MODAL CARTE SCOLAIRE OFFICIELLE 3D ── */}
      {data?.student && (
        <StudentCardModal
          isOpen={showStudentCard}
          onClose={() => setShowStudentCard(false)}
          cardData={{
            id: data.student.id,
            matricule: data.student.matricule,
            firstName: data.student.firstName,
            lastName: data.student.lastName,
            birthDate: data.student.birthDate,
            birthPlace: data.student.birthPlace || 'Abidjan',
            gender: data.student.gender || 'M',
            photoUrl: data.student.avatarUrl,
            className: data.student.className,
            levelName: data.student.levelName || 'Secondaire',
            academicYear: terms.find((t: any) => t.id === selectedTermId)?.name || '2025-2026',
            schoolName: data.student.school || 'Complexe Scolaire École 3.0',
            schoolAddress: data.school?.address || 'Abidjan, Côte d\'Ivoire',
            schoolPhone: data.school?.phone || '+225 27 22 00 00 00',
            schoolEmail: data.school?.email || 'contact@ecole30.ci',
            parentName: data.student.parentName,
            parentPhone: data.student.parentPhone,
            bloodGroup: data.student.bloodGroup || 'O+',
          }}
        />
      )}

    </div>
  );
}
