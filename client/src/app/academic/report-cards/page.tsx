import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  BookOpen, RefreshCw, Send, Save, Award, Users,
  ChevronDown, FileText, Loader2, CheckCircle2
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import TeacherGradesGrid from './TeacherGradesGrid';
import BulletinIndividuel from './BulletinIndividuel';
import WorkflowBulletin from './WorkflowBulletin';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AcademicYear {
  id: string;
  name: string;
  terms: Term[];
}

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface ClassItem {
  id: string;
  name: string;
}

// ─── Page Principale ─────────────────────────────────────────────────────────

const ReportCardsPage = () => {
  const { user } = useAuth();
  const role = user?.role ?? '';

  // Sélecteurs communs
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Vues
  const [viewMode, setViewMode] = useState<'grid' | 'bulletins' | 'individual'>('bulletins');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Données
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [bulletinData, setBulletinData] = useState<any | null>(null);
  const [loadingBulletins, setLoadingBulletins] = useState(false);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialisation
  useEffect(() => {
    fetchAcademicYears();
    if (role !== 'APPRENANT') fetchClasses();
  }, [role]);

  useEffect(() => {
    if (selectedYearId && academicYears.length > 0) {
      const year = academicYears.find(y => y.id === selectedYearId);
      if (year?.terms) {
        const sorted = [...year.terms].sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
        setTerms(sorted);
        // Sélectionner le trimestre OPEN ou le premier
        const openTerm = sorted.find(t => t.status === 'OPEN') ?? sorted[0];
        if (openTerm) setSelectedTermId(openTerm.id);
      }
    }
  }, [selectedYearId, academicYears]);

  // Charger selon le rôle
  useEffect(() => {
    if (!selectedTermId) return;

    if (role === 'APPRENANT') {
      fetchMyBulletin();
    } else if (selectedClassId) {
      if (viewMode === 'bulletins') {
        fetchClassBulletins();
      }
    }
  }, [selectedTermId, selectedClassId, role, viewMode]);

  // Apprenant: changer de trimestre recharge le bulletin
  useEffect(() => {
    if (role === 'APPRENANT' && selectedTermId) {
      fetchMyBulletin();
    }
  }, [selectedTermId]);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/academic/years');
      setAcademicYears(res.data);
      if (res.data.length > 0) {
        const current = res.data.find((y: AcademicYear & { isCurrent: boolean }) => y.isCurrent) ?? res.data[0];
        setSelectedYearId(current.id);
      }
    } catch (err) {
      console.error('Erreur années académiques', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data);
      if (res.data.length > 0) setSelectedClassId(res.data[0].id);
    } catch (err) {
      console.error('Erreur classes', err);
    }
  };

  const fetchMyBulletin = async () => {
    setLoadingBulletin(true);
    setError(null);
    try {
      const res = await api.get(`/bulletins/student/${user!.id}?termId=${selectedTermId}`);
      setBulletinData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de charger le bulletin');
      setBulletinData(null);
    } finally {
      setLoadingBulletin(false);
    }
  };

  const fetchClassBulletins = async () => {
    if (!selectedClassId || !selectedTermId) return;
    setLoadingBulletins(true);
    setError(null);
    try {
      const res = await api.get(`/bulletins/class/${selectedClassId}?termId=${selectedTermId}`);
      setBulletins(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur chargement bulletins');
      setBulletins([]);
    } finally {
      setLoadingBulletins(false);
    }
  };

  const fetchStudentBulletin = async (studentId: string) => {
    setLoadingBulletin(true);
    setSelectedStudentId(studentId);
    setViewMode('individual');
    setError(null);
    try {
      const res = await api.get(`/bulletins/student/${studentId}?termId=${selectedTermId}`);
      setBulletinData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Impossible de charger le bulletin');
      setBulletinData(null);
    } finally {
      setLoadingBulletin(false);
    }
  };

  const handleGenerateBulletins = async () => {
    if (!selectedClassId || !selectedTermId) return;
    setGenerating(true);
    setError(null);
    try {
      await api.post('/bulletins/generate', {
        classId: selectedClassId,
        termId: selectedTermId,
      });
      await fetchClassBulletins();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur génération bulletins');
    } finally {
      setGenerating(false);
    }
  };

  const handleSoumettreClasse = async () => {
    if (!selectedClassId || !selectedTermId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/bulletins/soumettre-classe', {
        classId: selectedClassId,
        termId: selectedTermId,
      });
      await fetchClassBulletins();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur soumission');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  const termLabel = terms.find(t => t.id === selectedTermId)?.name ?? '';
  const classLabel = classes.find(c => c.id === selectedClassId)?.name ?? '';

  return (
    <div className="space-y-6">

      {/* ─── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <PageHeader
          title="Bulletins de Notes"
          subtitle={
            role === 'APPRENANT'
              ? 'Consultez vos résultats scolaires'
              : 'Gestion et validation des bulletins'
          }
        />

        {/* Sélecteurs */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Année */}
          <div className="relative">
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border rounded-lg text-sm bg-white border-gray-300 text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Trimestre */}
          <div className="relative">
            <select
              value={selectedTermId}
              onChange={e => setSelectedTermId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border rounded-lg text-sm bg-white border-gray-300 text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Classe (non apprenant) */}
          {role !== 'APPRENANT' && (
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border rounded-lg text-sm bg-white border-gray-300 text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="">— Classe —</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabs Vue (non apprenant) ─────────────────────────────────────── */}
      {role !== 'APPRENANT' && (
        <div className="flex gap-2 no-print border-b border-gray-200 pb-0">
          {[
            { id: 'bulletins', label: 'Bulletins', icon: FileText },
            ...(role === 'ENSEIGNANT' ? [{ id: 'grid', label: 'Grille de Notes', icon: BookOpen }] : []),
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
                  viewMode === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Erreur ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* ─── VUE APPRENANT ────────────────────────────────────────────────── */}
      {role === 'APPRENANT' && (
        <>
          {loadingBulletin && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mr-3" />
              Chargement du bulletin...
            </div>
          )}
          {!loadingBulletin && bulletinData && (
            <BulletinIndividuel data={bulletinData} />
          )}
          {!loadingBulletin && !bulletinData && !error && (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-14 h-14 opacity-20 mx-auto mb-3" />
              <p className="text-lg font-medium">Aucun bulletin disponible</p>
              <p className="text-sm mt-1">Sélectionnez une année scolaire et un trimestre</p>
            </div>
          )}
        </>
      )}

      {/* ─── VUE GRILLE ENSEIGNANT ─────────────────────────────────────────── */}
      {role === 'ENSEIGNANT' && viewMode === 'grid' && selectedClassId && selectedTermId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              Grille de notes — {classLabel} — {termLabel}
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSoumettreClasse}
              isLoading={submitting}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Soumettre les bulletins
            </Button>
          </div>
          <TeacherGradesGrid
            classId={selectedClassId}
            termId={selectedTermId}
          />
        </div>
      )}

      {/* ─── VUE BULLETINS (Liste) ─────────────────────────────────────────── */}
      {role !== 'APPRENANT' && viewMode === 'bulletins' && (
        <>
          {!selectedClassId ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-400">
              <BookOpen className="w-12 h-12 opacity-20 mx-auto mb-3" />
              <p>Sélectionnez une classe et un trimestre</p>
            </div>
          ) : (
            <>
              {/* Barre d'actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <p className="text-sm text-gray-500">
                  {loadingBulletins ? 'Chargement...' : `${bulletins.length} élève(s) — ${classLabel} — ${termLabel}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateBulletins}
                    isLoading={generating}
                    leftIcon={<RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />}
                  >
                    Générer / Recalculer
                  </Button>
                  {role === 'ENSEIGNANT' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSoumettreClasse}
                      isLoading={submitting}
                      leftIcon={<Send className="w-4 h-4" />}
                    >
                      Soumettre tous
                    </Button>
                  )}
                </div>
              </div>

              {loadingBulletins ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mr-3" />
                  Chargement des bulletins...
                </div>
              ) : (
                <WorkflowBulletin
                  bulletins={bulletins.map(b => ({ ...b, term: { id: selectedTermId, name: termLabel } }))}
                  userRole={role}
                  onAction={fetchClassBulletins}
                  onViewBulletin={(studentId) => fetchStudentBulletin(studentId)}
                  termId={selectedTermId}
                  classId={selectedClassId}
                />
              )}
            </>
          )}
        </>
      )}

      {/* ─── VUE BULLETIN INDIVIDUEL (admin/directeur/éducateur) ──────────── */}
      {role !== 'APPRENANT' && viewMode === 'individual' && (
        <>
          {loadingBulletin && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mr-3" />
              Chargement du bulletin...
            </div>
          )}
          {!loadingBulletin && bulletinData && (
            <BulletinIndividuel
              data={bulletinData}
              onClose={() => setViewMode('bulletins')}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ReportCardsPage;
