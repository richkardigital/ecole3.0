import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  ArrowLeft, Users, BookOpen, FileText, TrendingUp,
  CheckCircle2, Clock, XCircle, Award, School as SchoolIcon,
  Loader2, UserCheck, ShieldAlert, MapPin, Phone, Mail, User, Sparkles
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SchoolStatsData {
  school: {
    id: string;
    name: string;
    code: string;
    ville?: string;
    address?: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    createdAt: string;
    manager?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
    teachingType?: { id: string; name: string };
    schoolType?: { id: string; name: string };
  };
  overview: {
    nbClasses: number;
    nbStudents: number;
    nbTeachers: number;
    nbEducators: number;
    nbParents: number;
    totalUsers: number;
    nbCourses: number;
    nbAssignments: number;
    nbAbsences: number;
    gender: {
      girls: number;
      boys: number;
      other: number;
    };
  };
  performance: {
    schoolAverage: number | null;
    tauxReussite: number;
    tauxValidation: number;
    totalBulletins: number;
    bulletinsByStatus: Record<string, number>;
    totalEvalues: number;
    totalReussite: number;
  };
  levelDistribution: {
    niveauName: string;
    nbClasses: number;
    nbStudents: number;
  }[];
  classRankings: {
    classId: string;
    className: string;
    niveauName: string;
    nbStudents: number;
    nbCourses: number;
    averageMoyenne: number | null;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  BROUILLON: '#9ca3af',
  SOUMIS_ENSEIGNANT: '#3b82f6',
  VALIDE_EDUCATEUR: '#f97316',
  VALIDE_DIRECTEUR: '#8b5cf6',
  VALIDE_SUPER_ADMIN: '#10b981',
  REJETE: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS_ENSEIGNANT: 'Soumis Enseignant',
  VALIDE_EDUCATEUR: 'Validé Éducateur',
  VALIDE_DIRECTEUR: 'Validé Direction',
  VALIDE_SUPER_ADMIN: 'Validation Finale',
  REJETE: 'Rejeté',
};

const GENDER_COLORS = ['#ec4899', '#3b82f6', '#94a3b8'];

export default function SchoolStatsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SchoolStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchSchoolStats();
  }, [id]);

  const fetchSchoolStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/schools/${id}/stats`);
      setStats(res.data);
    } catch (err: any) {
      console.error('Error loading school stats:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement des statistiques de l\'établissement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
        <span className="text-sm font-bold">Calcul et chargement des statistiques globales de l'établissement...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-red-200 p-8">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-base font-bold text-red-600 mb-4">{error ?? 'Données introuvables'}</p>
        <Button variant="secondary" onClick={() => navigate('/admin/schools')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Retour aux établissements
        </Button>
      </div>
    );
  }

  const { school, overview, performance, levelDistribution, classRankings } = stats;

  // Données Graphique Genre
  const genderPieData = [
    { name: 'Filles', value: overview.gender.girls, color: '#ec4899' },
    { name: 'Garçons', value: overview.gender.boys, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  // Données Graphique Bulletins
  const bulletinPieData = Object.entries(performance.bulletinsByStatus)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key] ?? key,
      value,
      color: STATUS_COLORS[key] ?? '#9ca3af',
    }));

  // Données Graphique Classes
  const classBarData = classRankings.map(c => ({
    name: c.className.length > 9 ? c.className.substring(0, 9) + '…' : c.className,
    fullName: c.className,
    niveau: c.niveauName,
    moyenne: c.averageMoyenne ?? 0,
    nbStudents: c.nbStudents,
  }));

  // Données Graphique Niveaux
  const levelBarData = levelDistribution.map(l => ({
    name: l.niveauName,
    apprenants: l.nbStudents,
    classes: l.nbClasses,
  }));

  return (
    <div className="space-y-6">
      {/* ─── Header Principal ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/schools/${id}`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Fiche École
          </Button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-200 shrink-0">
              <SchoolIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">{school.name}</h1>
                <Badge variant={school.isActive ? 'success' : 'neutral'}>
                  {school.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Statistiques Globales & Tableau de Bord Académique · {school.ville || 'Abidjan'} · Code: {school.code}
              </p>
            </div>
          </div>
        </div>

        {school.manager && (
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
              {school.manager.firstName[0]}{school.manager.lastName[0]}
            </div>
            <div>
              <p className="font-extrabold text-slate-900">Directeur : {school.manager.firstName} {school.manager.lastName}</p>
              <p className="text-slate-500 font-mono text-[11px]">{school.manager.phone || school.manager.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── KPIs Majeurs Effectifs & Organisation ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: 'Apprenants', value: overview.nbStudents, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Enseignants', value: overview.nbTeachers, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Éducateurs', value: overview.nbEducators, icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Classes', value: overview.nbClasses, icon: SchoolIcon, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
          { label: 'Cours Actifs', value: overview.nbCourses, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
          { label: 'Devoirs créés', value: overview.nbAssignments, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`${kpi.bg} border rounded-2xl p-4 flex flex-col justify-between shadow-xs`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs font-bold text-slate-600 mt-0.5">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Cartes Performance & Répartition ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Taux de Réussite & Moyenne */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Moyenne & Réussite</h3>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="flex items-center gap-6 my-auto">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={performance.tauxReussite >= 50 ? '#10b981' : '#f59e0b'}
                  strokeWidth="3.2"
                  strokeDasharray={`${performance.tauxReussite} ${100 - performance.tauxReussite}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-900">{performance.tauxReussite}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Réussite</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Moyenne Générale</span>
                <span className="text-2xl font-black text-emerald-700">
                  {performance.schoolAverage !== null ? `${performance.schoolAverage}/20` : 'En attente'}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-semibold space-y-0.5">
                <p>Évalués : <strong className="text-slate-900">{performance.totalEvalues}</strong></p>
                <p>Admis (≥10) : <strong className="text-emerald-600">{performance.totalReussite}</strong></p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-semibold flex justify-between">
            <span>Validation bulletins</span>
            <strong className="text-emerald-700">{performance.tauxValidation}%</strong>
          </div>
        </div>

        {/* Répartition par Genre */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Parité & Effectifs Apprenants</h3>
            <Users className="w-4 h-4 text-blue-500" />
          </div>

          {genderPieData.length > 0 ? (
            <div className="flex items-center justify-center gap-4">
              <div className="w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {genderPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any, name: any) => [`${val} (${Math.round((val / overview.nbStudents) * 100)}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-pink-500 inline-block" />
                  <span className="text-slate-600">Filles : <strong>{overview.gender.girls}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                  <span className="text-slate-600">Garçons : <strong>{overview.gender.boys}</strong></span>
                </div>
                <div className="pt-2 border-t border-slate-100 text-slate-400 font-mono text-[11px]">
                  Total : {overview.nbStudents}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center my-auto">Aucun apprenant enregistré</p>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-semibold flex justify-between">
            <span>Membres communauté totale</span>
            <strong className="text-slate-900">{overview.totalUsers}</strong>
          </div>
        </div>

        {/* Workflow Bulletins */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Statut des Bulletins</h3>
            <Award className="w-4 h-4 text-purple-500" />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-36 pr-1">
            {Object.entries(performance.bulletinsByStatus).map(([key, value]) => {
              const pct = performance.totalBulletins > 0 ? Math.round((value / performance.totalBulletins) * 100) : 0;
              return (
                <div key={key} className="text-xs">
                  <div className="flex justify-between font-bold text-slate-700 mb-0.5">
                    <span>{STATUS_LABELS[key] || key}</span>
                    <span>{value} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[key] || '#cbd5e1' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-semibold flex justify-between">
            <span>Total bulletins générés</span>
            <strong className="text-purple-700">{performance.totalBulletins}</strong>
          </div>
        </div>

      </div>

      {/* ─── Graphiques Niveaux & Classes ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Effectifs par Niveau */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <SchoolIcon className="w-4 h-4 text-emerald-600" />
            Répartition des Apprenants par Niveau
          </h3>
          {levelBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={levelBarData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: any, name: any) => [
                    `${value} ${name === 'apprenants' ? 'apprenant(s)' : 'classe(s)'}`,
                    name === 'apprenants' ? 'Effectif' : 'Classes'
                  ]}
                />
                <Bar dataKey="apprenants" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-16">Aucun niveau configuré</p>
          )}
        </div>

        {/* Moyennes par Classe */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Moyennes par Classe
          </h3>
          {classBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={classBarData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: any, _, props: any) => [
                    `${value}/20 (${props.payload.nbStudents} apprenants)`,
                    props.payload.fullName
                  ]}
                />
                <Bar dataKey="moyenne" radius={[6, 6, 0, 0]}>
                  {classBarData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.moyenne >= 12 ? '#10b981' : entry.moyenne >= 10 ? '#3b82f6' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-16">Aucune classe disponible</p>
          )}
        </div>

      </div>

      {/* ─── Tableau Récapitulatif Détaillé des Classes ──────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Détail des Classes de l'Établissement ({classRankings.length})
          </h3>
          <span className="text-xs font-bold text-slate-500">Classées par nom</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Classe</th>
                <th className="px-5 py-3 text-left">Niveau</th>
                <th className="px-5 py-3 text-center">Apprenants</th>
                <th className="px-5 py-3 text-center">Cours</th>
                <th className="px-5 py-3 text-center">Moyenne Générale</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classRankings.map((cls) => (
                <tr key={cls.classId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-extrabold text-slate-900 flex items-center gap-2">
                    <SchoolIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    {cls.className}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-semibold">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px] font-bold">
                      {cls.niveauName}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-bold text-slate-700">
                    {cls.nbStudents}
                  </td>
                  <td className="px-5 py-3.5 text-center font-bold text-slate-700">
                    {cls.nbCourses}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {cls.averageMoyenne !== null ? (
                      <span className={`font-black text-sm ${
                        cls.averageMoyenne >= 12 ? 'text-emerald-700' :
                        cls.averageMoyenne >= 10 ? 'text-blue-700' : 'text-amber-600'
                      }`}>
                        {cls.averageMoyenne.toFixed(2)}<span className="text-[10px] text-slate-400 font-normal">/20</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Non calculée</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link to={`/admin/classes/${cls.classId}`}>
                      <Button variant="ghost" size="sm">
                        Voir la classe
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {classRankings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 italic">
                    Aucune classe enregistrée dans cet établissement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
