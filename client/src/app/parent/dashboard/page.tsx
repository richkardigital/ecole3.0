import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { 
  Users, GraduationCap, Calendar, BookOpen, AlertCircle, 
  FileText, Award, Clock, ShieldCheck, CheckCircle2, 
  XCircle, UserCheck, CheckSquare, Sparkles, UserPlus,
  TrendingUp, MessageCircle, ChevronRight, School, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import BulletinIndividuel from '@/app/academic/report-cards/BulletinIndividuel';

interface ChildSummary {
  id: string;
  firstName: string;
  lastName: string;
  matricule?: string;
  email?: string;
  avatarUrl?: string;
  currentClass?: string;
  classId?: string;
  niveau?: string;
  niveauId?: string;
  school?: string;
  schoolLogo?: string;
  progress?: any;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'presence' | 'homework' | 'grades' | 'teachers'>('overview');

  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [loadingChild, setLoadingChild] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Lier un Enfant
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkMatricule, setLinkMatricule] = useState('');
  const [linkBirthDate, setLinkBirthDate] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  // Devoirs filter
  const [homeworkFilter, setHomeworkFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'SUBMITTED' | 'GRADED'>('ALL');

  // Modal Bulletin Officiel
  const [selectedBulletinData, setSelectedBulletinData] = useState<any | null>(null);
  const [loadingBulletin, setLoadingBulletin] = useState(false);


  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadChildDetails(selectedChildId, selectedTermId);
    }
  }, [selectedTermId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Charger les trimestres
      let termId = '';
      try {
        const yearsRes = await api.get('/academic/years');
        const allTerms = (yearsRes.data || []).flatMap((y: any) => y.terms || []);
        setTerms(allTerms);
        const openTerm = allTerms.find((t: any) => t.status === 'OPEN') || allTerms[0];
        termId = openTerm?.id || '';
        setSelectedTermId(termId);
      } catch (errYears) {
        console.warn("Années scolaires non disponibles pour ce rôle:", errYears);
      }

      // 2. Charger les enfants du parent
      const res = await api.get('/parents/children');
      const childrenData: ChildSummary[] = Array.isArray(res.data) ? res.data : (res.data?.children || []);

      if (childrenData.length > 0) {
        const firstChild = childrenData[0];
        setSelectedChildId(firstChild.id);

        const childrenWithData = await Promise.all(
          childrenData.map(async (child) => {
            try {
              const progRes = await api.get(`/parents/children/${child.id}/progress`, {
                params: { termId: termId || undefined }
              });
              return {
                ...child,
                progress: progRes.data
              };
            } catch (err) {
              console.error(`Erreur chargement progression pour ${child.firstName}:`, err);
              return child;
            }
          })
        );

        setChildren(childrenWithData);
      } else {
        setChildren([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Impossible de charger la liste de vos enfants.");
    } finally {
      setLoading(false);
    }
  };

  const loadChildDetails = async (childId: string, termId?: string) => {
    try {
      setLoadingChild(true);
      const progRes = await api.get(`/parents/children/${childId}/progress`, {
        params: { termId: termId || undefined }
      });

      setChildren((prev) =>
        prev.map((c) => (c.id === childId ? { ...c, progress: progRes.data } : c))
      );
    } catch (err) {
      console.error("Erreur rechargement données enfant:", err);
    } finally {
      setLoadingChild(false);
    }
  };

  const handleSelectChild = (childId: string) => {
    setSelectedChildId(childId);
    const existing = children.find((c) => c.id === childId);
    if (!existing?.progress) {
      loadChildDetails(childId, selectedTermId);
    }
  };

  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkMatricule.trim() || !linkBirthDate) {
      setLinkError("Veuillez renseigner le matricule et la date de naissance de l'enfant.");
      return;
    }

    try {
      setLinking(true);
      setLinkError(null);
      const res = await api.post('/parents/link-by-credentials', {
        matricule: linkMatricule.trim().toUpperCase(),
        birthDate: linkBirthDate
      });

      setLinkSuccess(res.data.message || "Enfant rattaché avec succès !");
      setTimeout(() => {
        setIsLinkModalOpen(false);
        setLinkMatricule('');
        setLinkBirthDate('');
        setLinkSuccess(null);
        fetchInitialData();
      }, 1200);
    } catch (err: any) {
      setLinkError(err.response?.data?.message || "Impossible de lier cet élève. Vérifiez les informations saisies.");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkChild = async (studentId: string, studentName: string) => {
    if (!confirm(`Souhaitez-vous vraiment retirer ${studentName} de votre liste d'enfants ?`)) return;
    try {
      await api.post('/parents/unlink-child', { studentId });
      await fetchInitialData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erreur lors de la dissociation.");
    }
  };

  const handleOpenBulletin = async (childId: string) => {
    if (!selectedTermId) {
      alert("Veuillez sélectionner un trimestre actif.");
      return;
    }
    setLoadingBulletin(true);
    try {
      const res = await api.get(`/bulletins/student/${childId}`, {
        params: { termId: selectedTermId }
      });
      setSelectedBulletinData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || "Impossible de charger le bulletin officiel pour cet élève.");
    } finally {
      setLoadingBulletin(false);
    }
  };

  const currentChild = children.find((c) => c.id === selectedChildId) || children[0];
  const progress = currentChild?.progress;

  // Calculs consolidés pour la famille entière
  const familyTotalChildren = children.length;
  const familyPendingHomework = children.reduce(
    (sum, c) => sum + (c.progress?.assignments?.pending || 0),
    0
  );
  const familyTotalAbsences = children.reduce(
    (sum, c) => sum + (c.progress?.presence?.totalHours || 0),
    0
  );
  const familyChildrenAverages = children
    .map((c) => c.progress?.overallAverage)
    .filter((v): v is number => typeof v === 'number');
  const familyOverallAverage =
    familyChildrenAverages.length > 0
      ? Number(
          (
            familyChildrenAverages.reduce((a, b) => a + b, 0) /
            familyChildrenAverages.length
          ).toFixed(2)
        )
      : null;

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-600 font-medium animate-pulse">
        Chargement de votre espace parent 360°...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center bg-red-50 border border-red-200 rounded-3xl text-red-600 space-y-4">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
        <h3 className="text-lg font-black">Erreur de chargement</h3>
        <p className="text-sm">{error}</p>
        <Button variant="primary" onClick={fetchInitialData}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
      
      {/* ── BANNIÈRE D'ACCUEIL & HEADER ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-pink-700 via-purple-700 to-indigo-800 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider text-pink-100 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-pink-300" />
              Espace Famille 360° — SEEEC Connect
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">
              Bienvenue, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-pink-100/90 text-sm md:text-base max-w-2xl leading-relaxed">
              Suivez l'assiduité, les devoirs à rendre, le registre des absences, la note de conduite et les bulletins certifiés de vos enfants en direct.
            </p>
          </div>

          {/* Actions rapides & Sélecteur de Trimestre */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setLinkError(null);
                setLinkSuccess(null);
                setIsLinkModalOpen(true);
              }}
              leftIcon={<UserPlus className="w-4 h-4 text-pink-200" />}
              className="bg-white/15 hover:bg-white/25 text-white border-white/20 font-bold backdrop-blur-md"
            >
              ➕ Lier un enfant
            </Button>

            {terms.length > 0 && (
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-white shrink-0 min-w-[220px]">
                <div className="flex items-center gap-2 mb-1 text-[11px] font-bold text-pink-200">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Période :</span>
                </div>
                <select
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="w-full bg-white/90 text-slate-900 border-none rounded-xl px-2.5 py-1.5 text-xs font-black outline-none shadow-sm cursor-pointer"
                >
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.status === 'OPEN' ? '🟢 (En cours)' : '⚪ (Clôturé)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Synthèse Rapide de la Famille */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/20 text-white">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/15">
            <p className="text-[11px] font-bold text-pink-200 uppercase">Enfants Inscrits</p>
            <p className="text-2xl font-black mt-0.5">{familyTotalChildren}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/15">
            <p className="text-[11px] font-bold text-pink-200 uppercase">Devoirs à Faire</p>
            <p className={`text-2xl font-black mt-0.5 ${familyPendingHomework > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {familyPendingHomework}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/15">
            <p className="text-[11px] font-bold text-pink-200 uppercase">Cumul Absences</p>
            <p className={`text-2xl font-black mt-0.5 ${familyTotalAbsences > 0 ? 'text-pink-300' : 'text-emerald-300'}`}>
              {familyTotalAbsences}h
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/15">
            <p className="text-[11px] font-bold text-pink-200 uppercase">Moyenne Famille</p>
            <p className="text-2xl font-black mt-0.5">
              {familyOverallAverage !== null ? `${familyOverallAverage.toFixed(2)}/20` : 'En calcul'}
            </p>
          </div>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600 mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Aucun enfant encore rattaché à votre compte parent</h3>
          <p className="text-slate-500 text-sm">
            Rattachez facilement votre enfant en saisissant son matricule officiel et sa date de naissance.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setLinkError(null);
              setLinkSuccess(null);
              setIsLinkModalOpen(true);
            }}
            className="bg-pink-600 hover:bg-pink-700 text-white font-black shadow-lg shadow-pink-600/20"
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Lier mon premier enfant
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* ── SÉLECTEUR MULTI-ENFANTS FLUIDE (ONGLETS D'ENFANTS) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-600" />
                Vos Enfants ({children.length}) — Sélectionnez un profil :
              </h3>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLinkError(null);
                  setLinkSuccess(null);
                  setIsLinkModalOpen(true);
                }}
                leftIcon={<UserPlus className="w-3.5 h-3.5 text-pink-600" />}
                className="border-pink-200 text-pink-700 hover:bg-pink-50 font-bold"
              >
                ➕ Lier un autre enfant
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => {
                const isSelected = child.id === currentChild.id;
                const childProg = child.progress;
                const isAbsentToday = childProg?.presence?.isAbsentToday;
                const pendingHw = childProg?.assignments?.pending ?? 0;

                return (
                  <button
                    key={child.id}
                    onClick={() => handleSelectChild(child.id)}
                    className={`relative p-5 rounded-2xl text-left transition-all duration-200 flex flex-col justify-between gap-4 group ${
                      isSelected
                        ? 'bg-white border-2 border-pink-600 shadow-lg ring-4 ring-pink-600/10'
                        : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >

                    {/* Header Carte Enfant */}
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-13 h-13 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm shrink-0 transition-transform group-hover:scale-105 ${
                          isSelected
                            ? 'bg-pink-600 text-white shadow-pink-600/30'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {child.avatarUrl ? (
                          <img src={child.avatarUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          `${child.firstName[0]}${child.lastName[0]}`
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-base text-slate-900 truncate">
                            {child.lastName} {child.firstName}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          Classe : <span className="font-bold text-slate-800">{child.currentClass || child.progress?.student?.currentClass || 'Non assigné'}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {child.school || child.progress?.student?.school || 'SEEEC Établissement'}
                        </p>
                      </div>
                    </div>

                    {/* Badges d'état en direct */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 flex-wrap">
                      {/* Statut Présence Aujourd'hui */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${
                          isAbsentToday
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isAbsentToday ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                        {isAbsentToday ? 'Absent(e) aujourd\'hui' : 'En classe aujourd\'hui'}
                      </span>

                      {/* Devoirs en attente */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          pendingHw > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Clock className="w-3 h-3 text-amber-600" />
                        {pendingHw > 0 ? `${pendingHw} devoirs à faire` : 'À jour'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── FOCUS SUR L'ENFANT SÉLECTIONNÉ ── */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Header Profil de l'Enfant Actif */}
            <div className="bg-slate-50/80 p-6 md:p-8 border-b border-slate-200 flex flex-wrap justify-between items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                  {currentChild.firstName[0]}{currentChild.lastName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                      {currentChild.lastName} {currentChild.firstName}
                    </h2>
                    {currentChild.matricule && (
                      <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold">
                        Matricule : {currentChild.matricule}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">
                      Classe : {currentChild.currentClass || progress?.student?.currentClass || 'N/A'}
                    </span>
                    <span>•</span>
                    <span>Niveau : <span className="font-semibold text-slate-700">{currentChild.niveau || progress?.student?.niveau || 'Général'}</span></span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <School className="w-3.5 h-3.5 text-slate-400" />
                      {currentChild.school || progress?.student?.school || 'Établissement SEEEC'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Bouton d'action directe : Bulletin Officiel */}
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleOpenBulletin(currentChild.id)}
                  leftIcon={<FileText className="w-4 h-4" />}
                  className="bg-pink-600 hover:bg-pink-700 text-white font-black shadow-md shadow-pink-600/20"
                >
                  Consulter le Bulletin Certifié
                </Button>
              </div>
            </div>

            {/* Navigation par Onglets Pédagogiques */}
            <div className="flex items-center gap-2 px-6 border-b border-slate-200 overflow-x-auto custom-scrollbar bg-white">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 py-4 px-3 text-sm font-black border-b-2 transition-all shrink-0 ${
                  activeTab === 'overview'
                    ? 'border-pink-600 text-pink-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Synthèse 360°
              </button>

              <button
                onClick={() => setActiveTab('presence')}
                className={`flex items-center gap-2 py-4 px-3 text-sm font-black border-b-2 transition-all shrink-0 ${
                  activeTab === 'presence'
                    ? 'border-pink-600 text-pink-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Assiduité & Présence ({progress?.presence?.totalHours || 0}h)
              </button>

              <button
                onClick={() => setActiveTab('homework')}
                className={`flex items-center gap-2 py-4 px-3 text-sm font-black border-b-2 transition-all shrink-0 ${
                  activeTab === 'homework'
                    ? 'border-pink-600 text-pink-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Devoirs & Cahier de Textes ({progress?.assignments?.pending || 0} à faire)
              </button>

              <button
                onClick={() => setActiveTab('grades')}
                className={`flex items-center gap-2 py-4 px-3 text-sm font-black border-b-2 transition-all shrink-0 ${
                  activeTab === 'grades'
                    ? 'border-pink-600 text-pink-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4" />
                Bilan Notes & Matières
              </button>

              <button
                onClick={() => setActiveTab('teachers')}
                className={`flex items-center gap-2 py-4 px-3 text-sm font-black border-b-2 transition-all shrink-0 ${
                  activeTab === 'teachers'
                    ? 'border-pink-600 text-pink-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Équipe Pédagogique ({progress?.teachers?.length || 0})
              </button>
            </div>

            {/* Contenu de l'Onglet Actif */}
            <div className="p-6 md:p-8">
              
              {/* ── ONGLET 1 : SYNTHÈSE 360° ── */}
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  
                  {/* Grille des 4 KPIs Principaux */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Moyenne Générale */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Moyenne Générale</span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-3xl font-black text-emerald-700">
                          {progress?.overallAverage !== null && progress?.overallAverage !== undefined
                            ? `${progress.overallAverage.toFixed(2)}/20`
                            : 'En calcul'}
                        </p>
                        <p className="text-xs font-bold text-emerald-600 mt-1">
                          {progress?.bulletin?.rangClasse ? `Rang : ${progress.bulletin.rangClasse}e / ${progress.bulletin.nombreEleves || 'classe'}` : 'Trimestre en cours'}
                        </p>
                      </div>
                    </div>

                    {/* Présence & Assiduité */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-800">Présence Aujourd'hui</span>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                          <UserCheck className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${progress?.presence?.isAbsentToday ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                          <p className="text-xl font-black text-slate-900">
                            {progress?.presence?.isAbsentToday ? 'Absent(e) signalé(e)' : 'Présent(e) en classe'}
                          </p>
                        </div>
                        <p className="text-xs text-blue-700 font-semibold mt-1">
                          Taux d'assiduité : <span className="font-black">{progress?.presence?.attendanceRate || 100}%</span>
                        </p>
                      </div>
                    </div>

                    {/* Note de Conduite */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-800">Conduite (Coef 1)</span>
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                          <Award className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className={`text-3xl font-black ${
                          (progress?.conduct?.grade ?? 20) >= 14 ? 'text-emerald-700' : (progress?.conduct?.grade ?? 20) >= 10 ? 'text-amber-700' : 'text-red-600'
                        }`}>
                          {progress?.conduct?.grade !== undefined ? `${progress.conduct.grade.toFixed(1)}/20` : '20.0/20'}
                        </p>
                        <p className="text-xs text-amber-800 font-bold truncate mt-1">
                          {progress?.conduct?.appreciation || 'Très bonne assiduité'}
                        </p>
                      </div>
                    </div>

                    {/* Complétion des Devoirs */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/80 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-purple-800">Devoirs & Travaux</span>
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-3xl font-black text-purple-700">
                          {progress?.assignments?.completionRate ?? 100}%
                        </p>
                        <p className="text-xs text-purple-700 font-semibold mt-1">
                          {progress?.assignments?.pending || 0} à rendre • {progress?.assignments?.submitted || 0} terminés
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section Synthèse & Alertes Récentes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Devoirs Urgents / Récents */}
                    <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-pink-600" />
                          Devoirs & Échéances à Venir
                        </h4>
                        <button
                          onClick={() => setActiveTab('homework')}
                          className="text-xs font-black text-pink-600 hover:text-pink-700 flex items-center gap-1"
                        >
                          Tout voir ({progress?.assignments?.total || 0})
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {progress?.assignments?.list && progress.assignments.list.length > 0 ? (
                        <div className="space-y-3">
                          {progress.assignments.list.slice(0, 4).map((hw: any) => {
                            const isSubmitted = hw.submitted;
                            const isOverdue = hw.status === 'OVERDUE';
                            return (
                              <div
                                key={hw.id}
                                className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black uppercase">
                                      {hw.subject}
                                    </span>
                                    <h5 className="font-bold text-xs text-slate-900 truncate">{hw.title}</h5>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-1">
                                    Échéance : {new Date(hw.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  {isSubmitted ? (
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-black flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      {hw.status === 'GRADED' ? `Noté: ${hw.grade}/20` : 'Rendu'}
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-[11px] font-black flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" /> En retard
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-black flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> À faire
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-6 text-center">
                          Aucun devoir enregistré pour le moment.
                        </p>
                      )}
                    </div>

                    {/* Dernières Notes Reçues */}
                    <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                          <Award className="w-4 h-4 text-pink-600" />
                          Dernières Notes Reçues
                        </h4>
                        <button
                          onClick={() => setActiveTab('grades')}
                          className="text-xs font-black text-pink-600 hover:text-pink-700 flex items-center gap-1"
                        >
                          Bilan complet
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {progress?.recentGrades && progress.recentGrades.length > 0 ? (
                        <div className="space-y-3">
                          {progress.recentGrades.slice(0, 4).map((g: any) => (
                            <div
                              key={g.id}
                              className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-black uppercase">
                                    {g.subject}
                                  </span>
                                  <p className="text-xs text-slate-500">
                                    {new Date(g.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                  </p>
                                </div>
                                {g.comment && <p className="text-[11px] text-slate-600 italic mt-1 truncate">{g.comment}</p>}
                              </div>
                              <div className="shrink-0 text-right">
                                <span
                                  className={`text-base font-black px-2.5 py-1 rounded-xl border ${
                                    g.value >= 14
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : g.value >= 10
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  }`}
                                >
                                  {g.value}/20
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-6 text-center">
                          Aucune note enregistrée récemment.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bilan & Appréciation Générale */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-md space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-pink-300">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-base">Appréciation Pédagogique & Vie Scolaire</h4>
                          <p className="text-xs text-slate-300">Synthèse du conseil de classe et de l'équipe éducative</p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenBulletin(currentChild.id)}
                        leftIcon={<FileText className="w-4 h-4" />}
                        className="bg-pink-600 hover:bg-pink-700 text-white font-black"
                      >
                        Ouvrir le Bulletin Officiel
                      </Button>
                    </div>

                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 text-sm text-slate-200 leading-relaxed italic">
                      "{progress?.bulletin?.appreciationGenerale || progress?.conduct?.appreciation || 'Trimestre en cours. Le bilan pédagogique officiel sera validé et signé lors du conseil de classe.'}"
                    </div>
                  </div>
                </div>
              )}

              {/* ── ONGLET 2 : ASSIDUITÉ & PRÉSENCE ── */}
              {activeTab === 'presence' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  
                  {/* Status Banner Aujourd'hui */}
                  <div className={`p-6 rounded-3xl border flex items-center justify-between gap-6 flex-wrap ${
                    progress?.presence?.isAbsentToday
                      ? 'bg-red-50/80 border-red-200 text-red-900'
                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${
                        progress?.presence?.isAbsentToday ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                        {progress?.presence?.isAbsentToday ? <XCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                      </div>
                      <div>
                        <h4 className="text-xl font-black">
                          {progress?.presence?.isAbsentToday ? 'Absence Signalée Aujourd\'hui' : 'Assiduité Parfaite Aujourd\'hui'}
                        </h4>
                        <p className="text-xs opacity-85 mt-0.5">
                          {progress?.presence?.isAbsentToday
                            ? 'L\'élève a été déclaré absent lors des appels du jour. Vous pouvez contacter l\'établissement pour fournir un justificatif.'
                            : 'Aucune absence enregistrée pour ce jour. L\'élève est présent en classe.'}
                        </p>
                      </div>
                    </div>

                    {/* Statistiques d'Heures */}
                    <div className="flex items-center gap-4 text-center">
                      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/60 min-w-[100px]">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Total Heures</p>
                        <p className="text-xl font-black text-slate-900">{progress?.presence?.totalHours || 0}h</p>
                      </div>
                      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/60 min-w-[100px]">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Justifiées</p>
                        <p className="text-xl font-black text-emerald-700">{progress?.presence?.justifiedHours || 0}h</p>
                      </div>
                      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/60 min-w-[100px]">
                        <p className="text-[10px] font-bold text-red-600 uppercase">Non Justifiées</p>
                        <p className="text-xl font-black text-red-600">{progress?.presence?.unjustifiedHours || 0}h</p>
                      </div>
                    </div>
                  </div>

                  {/* Impact sur la Conduite */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      Calcul Officiel de la Note de Conduite (Base 20/20)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Conformément au barème officiel : départ à <span className="font-bold">20.00 / 20</span>. Chaque heure d'absence non justifiée retire <span className="font-bold text-red-600">1.0 point</span>, et chaque heure justifiée retire <span className="font-bold text-amber-600">0.25 point</span>.
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                      <span>Note de conduite calculée :</span>
                      <span className="text-sm font-black text-pink-600">
                        {progress?.conduct?.grade !== undefined ? `${progress.conduct.grade.toFixed(2)}/20` : '20.00/20'}
                      </span>
                    </div>
                  </div>

                  {/* Tableau du Registre Complet des Absences */}
                  <div className="space-y-4">
                    <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-pink-600" />
                      Historique Complet des Absences Déclarées
                    </h4>

                    {progress?.presence?.list && progress.presence.list.length > 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                              <tr>
                                <th className="p-3.5">Date</th>
                                <th className="p-3.5">Matière / Cours</th>
                                <th className="p-3.5">Durée</th>
                                <th className="p-3.5">Statut</th>
                                <th className="p-3.5">Motif / Justificatif</th>
                                <th className="p-3.5 text-right">Impact Conduite</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {progress.presence.list.map((abs: any) => (
                                <tr key={abs.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3.5 font-bold text-slate-900">
                                    {new Date(abs.date).toLocaleDateString('fr-FR', {
                                      weekday: 'short',
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </td>
                                  <td className="p-3.5 font-semibold text-slate-700">{abs.subject}</td>
                                  <td className="p-3.5 font-bold text-slate-900">{abs.hours}h</td>
                                  <td className="p-3.5">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                                        abs.justified
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-red-50 text-red-700 border border-red-200'
                                      }`}
                                    >
                                      {abs.justified ? 'Justifiée' : 'Non justifiée'}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-slate-500 italic">
                                    {abs.reason || 'Aucun motif renseigné'}
                                  </td>
                                  <td className="p-3.5 text-right font-bold text-slate-700">
                                    {abs.justified ? (
                                      <span className="text-amber-600">-{(abs.hours * 0.25).toFixed(2)} pt</span>
                                    ) : (
                                      <span className="text-red-600">-{(abs.hours * 1.0).toFixed(2)} pt</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <h5 className="font-bold text-slate-800">Aucune absence enregistrée</h5>
                        <p className="text-xs text-slate-500">L'élève présente une assiduité parfaite pour ce trimestre.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ONGLET 3 : DEVOIRS & CAHIER DE TEXTES ── */}
              {activeTab === 'homework' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* Filtres de Devoirs */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setHomeworkFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          homeworkFilter === 'ALL'
                            ? 'bg-pink-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tous ({progress?.assignments?.total || 0})
                      </button>
                      <button
                        onClick={() => setHomeworkFilter('PENDING')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          homeworkFilter === 'PENDING'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ⏳ À Faire ({progress?.assignments?.pending || 0})
                      </button>
                      <button
                        onClick={() => setHomeworkFilter('OVERDUE')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          homeworkFilter === 'OVERDUE'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ⚠️ En Retard ({progress?.assignments?.overdue || 0})
                      </button>
                      <button
                        onClick={() => setHomeworkFilter('SUBMITTED')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          homeworkFilter === 'SUBMITTED'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ✅ Rendus ({progress?.assignments?.submitted || 0})
                      </button>
                      <button
                        onClick={() => setHomeworkFilter('GRADED')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                          homeworkFilter === 'GRADED'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        🏆 Corrigés & Notés ({progress?.assignments?.graded || 0})
                      </button>
                    </div>
                  </div>

                  {/* Grille des Devoirs */}
                  {progress?.assignments?.list && progress.assignments.list.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {progress.assignments.list
                        .filter((hw: any) => {
                          if (homeworkFilter === 'ALL') return true;
                          if (homeworkFilter === 'PENDING') return hw.status === 'PENDING';
                          if (homeworkFilter === 'OVERDUE') return hw.status === 'OVERDUE';
                          if (homeworkFilter === 'SUBMITTED') return hw.status === 'SUBMITTED' || hw.status === 'GRADED';
                          if (homeworkFilter === 'GRADED') return hw.status === 'GRADED';
                          return true;
                        })
                        .map((hw: any) => {
                          const isSubmitted = hw.submitted;
                          const isOverdue = hw.status === 'OVERDUE';
                          const isGraded = hw.status === 'GRADED';

                          return (
                            <div
                              key={hw.id}
                              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-pink-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="px-2.5 py-0.5 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    {hw.subject}
                                  </span>
                                  {isGraded ? (
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-black">
                                      Note : {hw.grade}/20
                                    </span>
                                  ) : isSubmitted ? (
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-black flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Rendu
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-black flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5" /> En retard
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-black flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" /> À faire
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-black text-sm text-slate-900 leading-snug">{hw.title}</h4>
                                {hw.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{hw.description}</p>
                                )}
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>
                                  Date limite :{' '}
                                  <span className="font-bold text-slate-800">
                                    {new Date(hw.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                  </span>
                                </span>
                                {hw.feedback && (
                                  <span className="text-[11px] text-slate-600 font-semibold italic truncate max-w-[150px]">
                                    "{hw.feedback}"
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                      Aucun devoir à afficher.
                    </div>
                  )}
                </div>
              )}

              {/* ── ONGLET 4 : BILAN NOTES & MATIÈRES ── */}
              {activeTab === 'grades' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* Bilan Matière par Matière */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {progress?.subjectAverages && progress.subjectAverages.length > 0 ? (
                      progress.subjectAverages.map((sub: any) => (
                        <div
                          key={sub.subjectName}
                          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-sm text-slate-900 truncate">{sub.subjectName}</h4>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                              Coef {sub.coefficient}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-slate-500 font-semibold">Moyenne calculée :</span>
                            <span
                              className={`text-xl font-black ${
                                sub.average !== null && sub.average >= 14
                                  ? 'text-emerald-600'
                                  : sub.average !== null && sub.average >= 10
                                  ? 'text-blue-600'
                                  : sub.average !== null
                                  ? 'text-red-500'
                                  : 'text-slate-400'
                              }`}
                            >
                              {sub.average !== null ? `${sub.average.toFixed(2)}/20` : '—'}
                            </span>
                          </div>

                          {/* Liste des Notes de la Matière */}
                          <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Notes enregistrées ({sub.grades?.length || 0}) :
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {sub.grades?.map((g: any) => (
                                <span
                                  key={g.id}
                                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                                    g.value >= 10
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-red-50 text-red-600 border-red-200'
                                  }`}
                                  title={g.comment || `Note : ${g.value}/20`}
                                >
                                  {g.value}/20
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                        Aucune note n'a encore été saisie pour ce trimestre.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ONGLET 5 : ÉQUIPE PÉDAGOGIQUE & CONTACTS ── */}
              {activeTab === 'teachers' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-base text-slate-900">Enseignants & Équipe de la Classe</h4>
                      <p className="text-xs text-slate-500">Contactez directement les professeurs de votre enfant</p>
                    </div>
                  </div>

                  {progress?.teachers && progress.teachers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {progress.teachers.map((t: any) => (
                        <div
                          key={t.teacherId + t.subject}
                          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 font-black flex items-center justify-center shrink-0">
                              {t.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                              <h5 className="font-black text-sm text-slate-900">{t.name}</h5>
                              <p className="text-xs text-pink-600 font-bold mt-0.5">{t.subject}</p>
                              {t.email && <p className="text-[11px] text-slate-400 mt-1">{t.email}</p>}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/chat')}
                            leftIcon={<MessageCircle className="w-3.5 h-3.5 text-purple-600" />}
                            className="border-purple-200 hover:bg-purple-50 text-purple-700"
                          >
                            Écrire
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                      Aucun professeur n'est encore assigné à cette classe.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── MODAL LIER UN ENFANT PAR MATRICULE & DATE DE NAISSANCE ── */}
      {isLinkModalOpen && (
        <Modal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          title="➕ Lier un Enfant à votre Espace Famille"
          size="md"
          accentColor="violet"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-900 leading-relaxed font-medium">
                Saisissez le matricule officiel et la date de naissance de votre 2ème ou 3ème enfant pour l'ajouter instantanément à votre tableau de bord multi-enfants.
              </p>
            </div>

            {linkError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{linkError}</span>
              </div>
            )}

            {linkSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{linkSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLinkChild} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Matricule de l'Élève <span className="text-pink-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: MAT-2026-4A02"
                  value={linkMatricule}
                  onChange={(e) => setLinkMatricule(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-pink-600 outline-none uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Date de Naissance de l'Élève <span className="text-pink-600">*</span>
                </label>
                <input
                  type="date"
                  value={linkBirthDate}
                  onChange={(e) => setLinkBirthDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-pink-600 outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="w-1/3"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={linking}
                  className="w-2/3 bg-pink-600 hover:bg-pink-700 text-white font-black shadow-md shadow-pink-600/20"
                >
                  {linking ? 'Rattachement...' : 'Valider & Lier'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── MODAL VISUALISATION DU BULLETIN OFFICIEL CERTIFIÉ ── */}
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

    </div>
  );
}

