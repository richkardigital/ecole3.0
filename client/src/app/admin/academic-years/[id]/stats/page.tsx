import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  ArrowLeft, Users, BookOpen, FileText, TrendingUp,
  CheckCircle2, Clock, XCircle, Award, School, Loader2
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface YearStats {
  year: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    isCurrent: boolean;
    schools: { id: string; name: string }[];
  };
  overview: {
    nbClasses: number;
    nbStudents: number;
    nbCourses: number;
    nbAssignments: number;
    nbTerms: number;
  };
  bulletins: {
    total: number;
    byStatus: Record<string, number>;
    tauxValidation: number;
  };
  performance: {
    tauxReussite: number;
    totalEvalues: number;
    totalReussite: number;
  };
  termEvolution: {
    termId: string;
    termName: string;
    averageMoyenne: number | null;
    nbEleves: number;
    bulletinStats: Record<string, number>;
  }[];
  classRankings: {
    classId: string;
    className: string;
    nbStudents: number;
    averageMoyenne: number | null;
  }[];
}

// ─── Couleurs ────────────────────────────────────────────────────────────────

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
  SOUMIS_ENSEIGNANT: 'Soumis',
  VALIDE_EDUCATEUR: 'Éducateur ✓',
  VALIDE_DIRECTEUR: 'Directeur ✓',
  VALIDE_SUPER_ADMIN: 'Validé Final',
  REJETE: 'Rejeté',
};

// ─── Composant ───────────────────────────────────────────────────────────────

export default function AcademicYearStatsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchStats();
  }, [id]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/academic/years/${id}/stats`);
      setStats(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <Loader2 className="w-8 h-8 animate-spin mr-3" />
      Chargement des statistiques...
    </div>
  );

  if (error || !stats) return (
    <div className="text-center py-16 text-red-500">{error ?? 'Données introuvables'}</div>
  );

  const { year, overview, bulletins, performance, termEvolution, classRankings } = stats;

  // Préparer données graphiques
  const termChartData = termEvolution.map(t => ({
    name: t.termName,
    moyenne: t.averageMoyenne ?? 0,
    nbEleves: t.nbEleves,
  }));

  const bulletinPieData = Object.entries(bulletins.byStatus)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key] ?? key,
      value,
      color: STATUS_COLORS[key] ?? '#9ca3af',
    }));

  const classBarData = classRankings.slice(0, 10).map(c => ({
    name: c.className.length > 8 ? c.className.substring(0, 8) + '…' : c.className,
    fullName: c.className,
    moyenne: c.averageMoyenne ?? 0,
    nbStudents: c.nbStudents,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Retour
        </Button>
        <PageHeader
          title={`Statistiques — ${year.name}`}
          subtitle={`${year.status === 'EN_COURS' ? '🟢 En cours' : year.status === 'ACHEVE' ? '✅ Terminée' : '🔵 Créée'} · ${year.schools.map(s => s.name).join(', ')}`}
        />
      </div>

      {/* ─── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Classes', value: overview.nbClasses, icon: School, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Élèves', value: overview.nbStudents, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Cours', value: overview.nbCourses, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
          { label: 'Devoirs', value: overview.nbAssignments, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
          { label: 'Bulletins', value: bulletins.total, icon: Award, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`${kpi.bg} border rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <p className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* ─── Performance & Validation ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Taux de réussite */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Performance</h3>
          <div className="flex items-center gap-8">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={performance.tauxReussite >= 50 ? '#10b981' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${performance.tauxReussite} ${100 - performance.tauxReussite}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-black ${performance.tauxReussite >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {performance.tauxReussite}%
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Taux de réussite</p>
                <p className="text-2xl font-black text-gray-900">{performance.tauxReussite}%</p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-gray-500">Évalués</p>
                  <p className="font-bold text-gray-900">{performance.totalEvalues}</p>
                </div>
                <div>
                  <p className="text-emerald-600">Réussis</p>
                  <p className="font-bold text-emerald-700">{performance.totalReussite}</p>
                </div>
                <div>
                  <p className="text-red-500">En dessous</p>
                  <p className="font-bold text-red-600">{performance.totalEvalues - performance.totalReussite}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progression bulletins */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Bulletins</h3>
            <span className="text-xs text-gray-500">
              Validés: <strong className="text-green-600">{bulletins.tauxValidation}%</strong>
            </span>
          </div>
          <div className="space-y-2">
            {Object.entries(bulletins.byStatus)
              .filter(([, v]) => v > 0)
              .map(([key, value]) => {
                const pct = bulletins.total > 0 ? Math.round((value / bulletins.total) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">{STATUS_LABELS[key]}</span>
                      <span className="font-bold">{value} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[key] }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ─── Graphiques ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Évolution des moyennes par trimestre */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
            Évolution des moyennes par trimestre
          </h3>
          {termChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={termChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  formatter={(value: any) => [`${value}/20`, 'Moyenne']}
                />
                <Line
                  type="monotone"
                  dataKey="moyenne"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Aucune donnée disponible</p>
          )}
        </div>

        {/* Répartition des bulletins (Pie) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
            Répartition des bulletins
          </h3>
          {bulletinPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={bulletinPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {bulletinPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                  formatter={(value: any, name: any) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">Aucun bulletin trouvé</p>
          )}
        </div>
      </div>

      {/* ─── Classement des classes ─────────────────────────────────────────── */}
      {classBarData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
            Classement des classes par moyenne
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={classBarData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                interval={0}
              />
              <YAxis domain={[0, 20]} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
                formatter={(value: any, _, props: any) => [
                  `${value}/20 — ${props.payload.nbStudents} élèves`,
                  props.payload.fullName,
                ]}
              />
              <Bar dataKey="moyenne" radius={[6, 6, 0, 0]}>
                {classBarData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.moyenne >= 12 ? '#10b981' : entry.moyenne >= 10 ? '#3b82f6' : '#f97316'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-end mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> ≥ 12</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> ≥ 10</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> &lt; 10</span>
          </div>
        </div>
      )}

      {/* ─── Tableau classes ────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Détail par classe</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Classe</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Élèves</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Moyenne</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classRankings.map((cls, idx) => (
                <tr key={cls.classId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' : 'text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{cls.className}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{cls.nbStudents}</td>
                  <td className="px-4 py-3 text-center">
                    {cls.averageMoyenne !== null ? (
                      <span className={`font-bold text-base ${
                        cls.averageMoyenne >= 12 ? 'text-emerald-600' :
                        cls.averageMoyenne >= 10 ? 'text-blue-600' : 'text-orange-500'
                      }`}>
                        {cls.averageMoyenne.toFixed(2)}<span className="text-xs text-gray-400">/20</span>
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {cls.averageMoyenne !== null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(cls.averageMoyenne / 20) * 100}%`,
                              backgroundColor: cls.averageMoyenne >= 12 ? '#10b981' : cls.averageMoyenne >= 10 ? '#3b82f6' : '#f97316',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 min-w-[35px]">{((cls.averageMoyenne / 20) * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {classRankings.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucune classe trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
