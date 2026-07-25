import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { Menu, ChevronRight, GraduationCap } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import { useAuth } from '@/context/AuthContext';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', accentFrom: '#ef4444', accentTo: '#dc2626', textColor: '#dc2626', bg: '#FEF2F2', border: '#FECDD3' },
  DIRECTEUR:   { label: 'Directeur', accentFrom: '#10b981', accentTo: '#059669', textColor: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
  EDUCATEUR:   { label: 'Éducateur', accentFrom: '#f59e0b', accentTo: '#d97706', textColor: '#b45309', bg: '#FFFBEB', border: '#FDE68A' },
  ENSEIGNANT:  { label: 'Enseignant', accentFrom: '#06b6d4', accentTo: '#0891b2', textColor: '#0369a1', bg: '#ECFEFF', border: '#A5F3FC' },
  APPRENANT:   { label: 'Apprenant', accentFrom: '#8b5cf6', accentTo: '#7c3aed', textColor: '#6d28d9', bg: '#F5F3FF', border: '#DDD6FE' },
} as const;

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Accueil',
  admin: 'Administration',
  directeur: 'Espace Directeur',
  enseignant: 'Espace Enseignant',
  educateur: 'Espace Éducateur',
  users: 'Utilisateurs',
  schools: 'Écoles',
  classes: 'Classes',
  courses: 'Cours',
  assignments: 'Devoirs',
  'report-cards': 'Bulletins',
  library: 'Bibliothèque',
  agenda: 'Agenda',
  chat: 'Messagerie',
  forum: 'Forum',
  settings: 'Paramètres',
  subjects: 'Matières',
  'academic-years': 'Années Scolaires',
  niveaux: 'Niveaux',
  'teaching-types': "Types d'enseignement",
  'audit-logs': "Logs d'Audit",
  seec: 'Réseau SEEC',
  broadcast: 'Flash News',
  absences: 'Absences',
  conduct: 'Conduite',
  'shared-resources': 'Ressources SEEC',
  corrections: 'Corrigés',
};

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const clock = useClock();

  const breadcrumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((seg, idx, arr) => ({
      name: ROUTE_LABELS[seg] || (seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')),
      path: '/' + arr.slice(0, idx + 1).join('/'),
    }));

  const roleConf = user ? (ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.DIRECTEUR) : null;

  return (
    <div className="flex min-h-screen text-slate-900 font-sans relative overflow-hidden"
      style={{ background: '#F8FAFC' }}>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden lg:ml-64 relative z-10">
        
        {/* ── TOPBAR ── */}
        <header
          className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-30"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          }}
        >
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile logo */}
            <Link to="/dashboard" className="lg:hidden flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-black text-slate-900">ÉCOLE 3.0</span>
            </Link>

            {/* Breadcrumb */}
            <nav className="hidden sm:flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider min-w-0">
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.path} className="flex items-center gap-1 min-w-0">
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                  <span
                    className="truncate transition-colors"
                    style={idx === breadcrumbs.length - 1 ? { color: '#047857', fontWeight: 800 } : { color: '#64748B' }}
                  >
                    {crumb.name}
                  </span>
                </div>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Clock */}
            <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600 px-3 py-1.5 rounded-lg shadow-xs"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce-gentle" />
              {clock}
            </div>

            {/* Role badge */}
            {roleConf && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg"
                style={{ background: roleConf.bg, border: `1px solid ${roleConf.border}`, color: roleConf.textColor }}>
                {roleConf.label}
              </div>
            )}

            {/* Notifications */}
            <NotificationCenter />

            {/* User avatar */}
            {user && (
              <Link to="/settings">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white cursor-pointer transition-transform duration-200 hover:scale-105"
                  style={{
                    background: roleConf ? `linear-gradient(135deg, ${roleConf.accentFrom}, ${roleConf.accentTo})` : 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: roleConf ? `0 2px 8px ${roleConf.accentFrom}30` : '0 2px 8px rgba(16,185,129,0.3)',
                  }}
                >
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              </Link>
            )}
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main
          className="flex-1 overflow-y-auto custom-scrollbar relative"
          style={{ background: '#F8FAFC' }}
        >
          {/* Dot grid */}
          <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-7 animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
