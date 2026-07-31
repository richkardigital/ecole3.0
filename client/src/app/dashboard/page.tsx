import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import {
  Users, School, BookOpen, GraduationCap, ClipboardList, MessageSquare,
  Library, Calendar, TrendingUp, Sparkles, ArrowRight, Zap, 
  FileText, BarChart3, Network
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

interface DashboardStats {
  schools?: number; users?: number; classes?: number; teachers?: number;
  students?: number; courses?: number; ungradedSubmissions?: number;
  enrolledCourses?: number; pendingAssignments?: number;
  effectifsData?: { name: string; v: number }[];
  boys?: number; girls?: number;
}

const ROLE_CONFIG = {
  SUPER_ADMIN: {
    greeting: 'Plateforme SEEC',
    tagline: 'Vue d\'ensemble de tout le réseau des écoles connectées.',
    accentFrom: '#ef4444', accentTo: '#dc2626',
    tagClass: 'chip-rose',
  },
  DIRECTEUR: {
    greeting: 'Tableau de Bord',
    tagline: 'Pilotez votre établissement avec précision et efficacité.',
    accentFrom: '#10b981', accentTo: '#059669',
    tagClass: 'chip-green',
  },
  EDUCATEUR: {
    greeting: 'Espace Éducateur',
    tagline: 'Gérez la discipline, les absences et la vie scolaire.',
    accentFrom: '#f59e0b', accentTo: '#d97706',
    tagClass: 'chip-amber',
  },
  ENSEIGNANT: {
    greeting: 'Espace Enseignant',
    tagline: 'Gérez vos cours, notes et relations avec vos élèves.',
    accentFrom: '#06b6d4', accentTo: '#0891b2',
    tagClass: 'chip-cyan',
  },
  APPRENANT: {
    greeting: 'Espace Élève',
    tagline: 'Consultez vos cours, devoirs et résultats scolaires.',
    accentFrom: '#8b5cf6', accentTo: '#7c3aed',
    tagClass: 'chip-violet',
  },
} as const;

const QuickAction = ({ icon: Icon, label, to, color }: { icon: any; label: string; to: string; color: string }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all duration-200 hover:-translate-y-1 group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors text-center leading-tight">{label}</span>
    </button>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    const fetchYears = async () => {
      try {
        const res = await api.get('/academic/years');
        const activeYears = res.data.filter((y: any) => y.isActive);
        setAcademicYears(activeYears);
        const current = activeYears.find((y: any) => y.isCurrent);
        if (current && !selectedYear) setSelectedYear(current.id);
      } catch (err) { console.error(err); }
    };
    if (user.role === 'SUPER_ADMIN' || user.role === 'DIRECTEUR') {
      fetchYears();
    }
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const fetchStats = async () => {
      setLoading(true);
      try {
        const url = selectedYear ? `/dashboard/stats?yearId=${selectedYear}` : `/dashboard/stats?yearId=ALL`;
        const res = await api.get(url);
        setStats(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, [user, navigate, selectedYear]);

  if (!user) return null;
  const roleConf = ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.DIRECTEUR;

  return (
    <div className="space-y-7">

      {/* ── WELCOME BANNER ── */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-xs">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: `linear-gradient(90deg, ${roleConf.accentFrom}, ${roleConf.accentTo})` }} />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-7">
          <div>
            <span className={`chip ${roleConf.tagClass} mb-4 inline-flex`}>
              <Sparkles className="w-3 h-3" />
              {roleConf.greeting}
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 leading-tight text-slate-900">
              Bonjour,{' '}
              <span style={{ color: roleConf.accentFrom }}>
                {user.firstName}
              </span>{' '}👋
            </h1>
            <p className="text-slate-600 text-base font-medium">{roleConf.tagline}</p>
          </div>

          {/* Year selector */}
          {(user.role === 'SUPER_ADMIN' || user.role === 'DIRECTEUR') && (
            <div className="flex-shrink-0">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Année académique</label>
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer"
                >
                  <option value="" className="bg-white text-slate-900">Toutes les années</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id} className="bg-white text-slate-900">{y.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl shimmer-bg" />
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI CARDS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

            {user.role === 'SUPER_ADMIN' && (<>
              <StatCard title="Écoles" count={stats?.schools ?? '—'} label="Établissements actifs" icon={<School className="w-5 h-5" />} iconColor="text-blue-600" badgeColor="bg-blue-50 border-blue-200" onClick={() => navigate('/admin/schools')} trend={{ value: 12, isPositive: true }} />
              <StatCard title="Utilisateurs" count={stats?.users ?? '—'} label="Réseau global" icon={<Users className="w-5 h-5" />} iconColor="text-emerald-600" badgeColor="bg-emerald-50 border-emerald-200" onClick={() => navigate('/admin/users')} trend={{ value: 5, isPositive: true }} />
              <StatCard title="Élèves" count={stats?.students ?? '—'} label={selectedYear ? "Inscrits cette année" : "Total inscrits"} icon={<GraduationCap className="w-5 h-5" />} iconColor="text-purple-600" badgeColor="bg-purple-50 border-purple-200" onClick={() => navigate('/admin/users')} />
            </>)}

            {(user.role === 'DIRECTEUR') && (<>
              <StatCard title="Classes" count={stats?.classes ?? '—'} label="Classes actives" icon={<School className="w-5 h-5" />} iconColor="text-purple-600" badgeColor="bg-purple-50 border-purple-200" onClick={() => navigate('/directeur/classes')} />
              <StatCard title="Enseignants" count={stats?.teachers ?? '—'} label="Personnel enseignant" icon={<Users className="w-5 h-5" />} iconColor="text-amber-600" badgeColor="bg-amber-50 border-amber-200" onClick={() => navigate('/directeur/users')} />
              <StatCard title="Élèves" count={stats?.students ?? '—'} label="Inscrits" icon={<GraduationCap className="w-5 h-5" />} iconColor="text-emerald-600" badgeColor="bg-emerald-50 border-emerald-200" onClick={() => navigate('/directeur/users')} trend={{ value: 3, isPositive: true }} />
              <StatCard title="Bulletin T." count="Trimestre 1" label="En cours" icon={<FileText className="w-5 h-5" />} iconColor="text-sky-600" badgeColor="bg-sky-50 border-sky-200" onClick={() => navigate('/directeur/report-cards')} />
            </>)}

            {user.role === 'EDUCATEUR' && (<>
              <StatCard title="Classes" count={stats?.classes ?? '—'} label="Classes actives" icon={<School className="w-5 h-5" />} iconColor="text-purple-600" badgeColor="bg-purple-50 border-purple-200" onClick={() => navigate('/educateur/classes')} />
              <StatCard title="Élèves" count={stats?.students ?? '—'} label="Inscrits" icon={<GraduationCap className="w-5 h-5" />} iconColor="text-emerald-600" badgeColor="bg-emerald-50 border-emerald-200" onClick={() => navigate('/educateur/users')} />
            </>)}

            {user.role === 'ENSEIGNANT' && (<>
              <StatCard title="Mes Cours" count={stats?.courses ?? '—'} label="Cours assignés" icon={<BookOpen className="w-5 h-5" />} iconColor="text-indigo-600" badgeColor="bg-indigo-50 border-indigo-200" onClick={() => navigate('/enseignant/courses')} />
              <StatCard title="À Corriger" count={stats?.ungradedSubmissions ?? '—'} label="Devoirs en attente" icon={<ClipboardList className="w-5 h-5" />} iconColor="text-rose-600" badgeColor="bg-rose-50 border-rose-200" onClick={() => navigate('/enseignant/agenda')} />
              <StatCard title="Mes Classes" count={stats?.classes ?? '—'} label="Classes affectées" icon={<School className="w-5 h-5" />} iconColor="text-purple-600" badgeColor="bg-purple-50 border-purple-200" onClick={() => navigate('/enseignant/courses')} />
            </>)}

            {user.role === 'APPRENANT' && (<>
              <StatCard title="Matières" count={stats?.enrolledCourses ?? '—'} label="Cours en cours" icon={<BookOpen className="w-5 h-5" />} iconColor="text-teal-600" badgeColor="bg-teal-50 border-teal-200" onClick={() => navigate('/courses')} />
              <StatCard title="Devoirs" count={stats?.pendingAssignments ?? '—'} label="À rendre" icon={<ClipboardList className="w-5 h-5" />} iconColor="text-orange-600" badgeColor="bg-orange-50 border-orange-200" onClick={() => navigate('/agenda')} />
              <StatCard title="Bibliothèque" count="Accès" label="Toutes mes ressources" icon={<Library className="w-5 h-5" />} iconColor="text-blue-600" badgeColor="bg-blue-50 border-blue-200" onClick={() => navigate('/library')} />
            </>)}

            <StatCard title="Forum" count="SEEC" label="Réseau inter-écoles" icon={<Network className="w-5 h-5" />} iconColor="text-sky-600" badgeColor="bg-sky-50 border-sky-200" onClick={() => navigate(user.role === 'SUPER_ADMIN' ? '/admin/forum' : user.role === 'DIRECTEUR' ? '/directeur/forum' : user.role === 'ENSEIGNANT' ? '/enseignant/forum' : user.role === 'EDUCATEUR' ? '/educateur/forum' : '/forum')} />
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" /> Actions Rapides
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {user.role === 'SUPER_ADMIN' && (<>
                <QuickAction icon={School} label="Écoles" to="/admin/schools" color="bg-blue-50 border border-blue-200 text-blue-600" />
                <QuickAction icon={Users} label="Utilisateurs" to="/admin/users" color="bg-emerald-50 border border-emerald-200 text-emerald-600" />
                <QuickAction icon={Calendar} label="Années" to="/admin/academic-years" color="bg-amber-50 border border-amber-200 text-amber-600" />
                <QuickAction icon={BarChart3} label="Audit" to="/admin/audit-logs" color="bg-violet-50 border border-violet-200 text-violet-600" />
                <QuickAction icon={Calendar} label="Agenda" to="/admin/agenda" color="bg-sky-50 border border-sky-200 text-sky-600" />
                <QuickAction icon={MessageSquare} label="Forum" to="/admin/forum" color="bg-indigo-50 border border-indigo-200 text-indigo-600" />
              </>)}
              {user.role === 'DIRECTEUR' && (<>
                <QuickAction icon={School} label="Classes" to="/directeur/classes" color="bg-purple-50 border border-purple-200 text-purple-600" />
                <QuickAction icon={FileText} label="Bulletins" to="/directeur/report-cards" color="bg-emerald-50 border border-emerald-200 text-emerald-600" />
                <QuickAction icon={Users} label="Personnel" to="/directeur/users" color="bg-amber-50 border border-amber-200 text-amber-600" />
                <QuickAction icon={Zap} label="Annonces" to="/directeur/broadcast" color="bg-sky-50 border border-sky-200 text-sky-600" />
                <QuickAction icon={Calendar} label="Agenda" to="/directeur/agenda" color="bg-sky-50 border border-sky-200 text-sky-600" />
                <QuickAction icon={MessageSquare} label="Forum" to="/directeur/forum" color="bg-indigo-50 border border-indigo-200 text-indigo-600" />
              </>)}
              {user.role === 'ENSEIGNANT' && (<>
                <QuickAction icon={BookOpen} label="Mes Cours" to="/enseignant/courses" color="bg-indigo-50 border border-indigo-200 text-indigo-600" />
                <QuickAction icon={Calendar} label="Agenda" to="/enseignant/agenda" color="bg-sky-50 border border-sky-200 text-sky-600" />
                <QuickAction icon={Library} label="Bibliothèque" to="/enseignant/library" color="bg-blue-50 border border-blue-200 text-blue-600" />
                <QuickAction icon={MessageSquare} label="Forum" to="/enseignant/forum" color="bg-purple-50 border border-purple-200 text-purple-600" />
              </>)}
              {user.role === 'EDUCATEUR' && (<>
                <QuickAction icon={School} label="Classes" to="/educateur/classes" color="bg-purple-50 border border-purple-200 text-purple-600" />
                <QuickAction icon={Users} label="Registre Élèves" to="/educateur/users" color="bg-amber-50 border border-amber-200 text-amber-600" />
                <QuickAction icon={Calendar} label="Agenda" to="/educateur/agenda" color="bg-sky-50 border border-sky-200 text-sky-600" />
                <QuickAction icon={MessageSquare} label="Forum" to="/educateur/forum" color="bg-indigo-50 border border-indigo-200 text-indigo-600" />
              </>)}
              {user.role === 'APPRENANT' && (<>
                <QuickAction icon={BookOpen} label="Mes Cours" to="/courses" color="bg-teal-50 border border-teal-200 text-teal-600" />
                <QuickAction icon={Calendar} label="Agenda" to="/agenda" color="bg-sky-50 border border-sky-200 text-sky-600" />
                <QuickAction icon={Library} label="Bibliothèque" to="/library" color="bg-blue-50 border border-blue-200 text-blue-600" />
                <QuickAction icon={MessageSquare} label="Forum" to="/forum" color="bg-indigo-50 border border-indigo-200 text-indigo-600" />
              </>)}
            </div>
          </div>

          {/* ── CHARTS — Admins only ── */}
          {(user.role === 'SUPER_ADMIN' || user.role === 'DIRECTEUR') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Bar chart */}
              <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 border border-emerald-200">
                    <TrendingUp className="w-4.5 h-4.5 text-emerald-600" style={{ width: '1.125rem', height: '1.125rem' }} />
                  </div>
                  <h3 className="font-black text-slate-900 tracking-tight">
                    {user.role === 'SUPER_ADMIN' ? 'Effectifs par établissement' : 'Effectifs par niveau'}
                  </h3>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={user.role === 'SUPER_ADMIN' ? (stats?.effectifsData || []) : [
                      { name: 'CP', v: 120 }, { name: 'CE1', v: 135 }, { name: 'CE2', v: 108 },
                      { name: 'CM1', v: 95 }, { name: 'CM2', v: 112 }, { name: '6ème', v: 88 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}
                        itemStyle={{ color: '#047857', fontWeight: 700 }}
                      />
                      <Bar dataKey="v" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gender split + summary */}
              <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-50 border border-sky-200">
                    <Users className="w-4.5 h-4.5 text-sky-600" style={{ width: '1.125rem', height: '1.125rem' }} />
                  </div>
                  <h3 className="font-black text-slate-900 tracking-tight">Répartition Filles / Garçons</h3>
                </div>
                
                {/* Gender Pie Chart */}
                <div className="flex flex-col items-center justify-center mb-6 h-48">
                  {stats?.boys === 0 && stats?.girls === 0 ? (
                    <div className="text-sm text-slate-400 italic">Aucune donnée disponible</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Garçons', value: stats?.boys || 0 },
                            { name: 'Filles', value: stats?.girls || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#0ea5e9" />
                          <Cell fill="#ec4899" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}
                          itemStyle={{ fontWeight: 700 }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Bulletins T1 validés', value: '98.4%', color: '#047857' },
                    { label: 'Taux de présence', value: '94.2%', color: '#0369a1' },
                    { label: 'Devoirs notés', value: '1 248', color: '#6d28d9' },
                    { label: 'Annonces envoyées', value: '34', color: '#b45309' },
                  ].map((s, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-1 leading-snug">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
