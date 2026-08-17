import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { Menu, ChevronRight, GraduationCap } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import { useAuth } from '@/context/AuthContext';
import FlashNewsBanner from '@/components/layout/FlashNewsBanner';
import { BrandLogo } from '@/components/common/BrandLogo';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', accentFrom: '#ef4444', accentTo: '#dc2626', textColor: '#dc2626', bg: '#FEF2F2', border: '#FECDD3' },
  DIRECTEUR:   { label: 'Directeur', accentFrom: '#189CD8', accentTo: '#1280B2', textColor: '#1280B2', bg: '#F0F9FF', border: '#BAE6FD' },
  EDUCATEUR:   { label: 'Éducateur', accentFrom: '#f59e0b', accentTo: '#d97706', textColor: '#b45309', bg: '#FFFBEB', border: '#FDE68A' },
  ENSEIGNANT:  { label: 'Enseignant', accentFrom: '#4D3E90', accentTo: '#3C2F73', textColor: '#4D3E90', bg: '#F3F1FB', border: '#DDD6FE' },
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
  agenda: 'Agenda Scolaire',
  chat: 'Messagerie',
  forum: 'Forum',
  settings: 'Paramètres',
  subjects: 'Matières',
  'academic-years': 'Années Scolaires',
  niveaux: 'Niveaux',
  'teaching-types': "Types d'enseignement",
  'audit-logs': "Logs d'Audit",
  seeec: 'Réseau SEEEC',
  broadcast: 'Flash News',
  absences: 'Absences',
  conduct: 'Conduite',
  'shared-resources': 'Ressources SEEEC',
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

  // Redirect or block if subscription is expired
  if (user?.role !== 'SUPER_ADMIN' && user?.subscriptionStatus === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Abonnement Expiré</h2>
          <p className="text-slate-500 mb-8 font-medium">
            L'abonnement de votre établissement est arrivé à expiration. L'accès à la plateforme a été restreint. Veuillez contacter le support ou renouveler votre abonnement pour restaurer l'accès.
          </p>
          <div className="space-y-3">
            <button className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">
              Contacter le Support
            </button>
            <Link to="/login" className="block w-full py-3 text-slate-600 font-bold hover:text-slate-900 transition-colors">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate if subscription is expiring soon (less than 7 days)
  const isExpiringSoon = user?.role !== 'SUPER_ADMIN' && user?.subscriptionStatus === 'ACTIVE' && user?.subscriptionEndDate && 
    (new Date(user.subscriptionEndDate).getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000;

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

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden lg:ml-72 relative z-10">
        
        <FlashNewsBanner />

        {/* ── TOPBAR ── */}
        <header
          className="flex flex-col sticky top-0 z-30"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          }}
        >
          {isExpiringSoon && (
            <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center justify-center gap-2">
              <span className="flex w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <p className="text-xs font-bold text-orange-800">
                Attention : Votre abonnement expire bientôt (le {new Date(user!.subscriptionEndDate!).toLocaleDateString('fr-FR')}). Pensez à le renouveler.
              </p>
            </div>
          )}
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4 min-w-0">
              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Mobile logo */}
              <div className="lg:hidden">
                <BrandLogo size="sm" to="/dashboard" subtitle="" />
              </div>

              {/* Breadcrumb */}
              <nav className="hidden sm:flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider min-w-0">
                {breadcrumbs.map((crumb, idx) => (
                  <div key={crumb.path} className="flex items-center gap-1 min-w-0">
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                    <span
                      className="truncate transition-colors"
                      style={idx === breadcrumbs.length - 1 ? { color: '#189CD8', fontWeight: 800 } : { color: '#64748B' }}
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#189CD8] animate-bounce-gentle" />
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
                    background: roleConf ? `linear-gradient(135deg, ${roleConf.accentFrom}, ${roleConf.accentTo})` : 'linear-gradient(135deg, #189cd8, #1280b2)',
                    boxShadow: roleConf ? `0 2px 8px ${roleConf.accentFrom}30` : '0 2px 8px rgba(24,156,216,0.3)',
                  }}
                >
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              </Link>
            )}
          </div>
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
