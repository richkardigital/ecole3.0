import { useAuth } from '@/context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut, School, BookOpen, GraduationCap, LayoutDashboard, 
  FileText, Megaphone, X, Calendar, MessageCircle, 
  ClipboardList, Network, Settings, 
  Plus, FolderOpen, Library as LibraryIcon, Layers,
  PenTool, Zap, Users, CheckSquare, BarChart3, Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';
import ConfirmationModal from '@/components/ui/ConfirmModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NavItem = ({ to, icon: Icon, children, isActive, badge }: {
  to: string; icon: any; children: React.ReactNode; isActive: boolean; badge?: number;
}) => (
  <Link
    to={to}
    className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group"
    style={isActive ? {
      background: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.25)',
      color: '#047857',
      fontWeight: 700,
    } : {
      background: 'transparent',
      border: '1px solid transparent',
      color: '#475569',
    }}
    onMouseEnter={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = '#F1F5F9';
        e.currentTarget.style.color = '#0F172A';
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive) {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#475569';
      }
    }}
  >
    {isActive && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
        style={{ background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
    )}
    
    <Icon className="w-4 h-4 shrink-0 transition-all duration-200"
      style={isActive ? { color: '#059669' } : { color: '#64748B' }} />
    
    <span className="truncate">{children}</span>
    
    {badge !== undefined && badge > 0 && (
      <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
        style={{ background: 'rgba(16,185,129,0.12)', color: '#047857', border: '1px solid rgba(16,185,129,0.25)' }}>
        {badge}
      </span>
    )}
  </Link>
);

const NavSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <p className="px-3 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">{title}</p>
    <div className="space-y-0.5">{children}</div>
  </div>
);

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', from: '#ef4444', to: '#dc2626', textColor: 'text-red-600', prefix: '/admin' },
  DIRECTEUR:   { label: 'Directeur', from: '#10b981', to: '#059669', textColor: 'text-emerald-700', prefix: '/directeur' },
  EDUCATEUR:   { label: 'Éducateur', from: '#f59e0b', to: '#d97706', textColor: 'text-amber-700', prefix: '/educateur' },
  ENSEIGNANT:  { label: 'Enseignant', from: '#06b6d4', to: '#0891b2', textColor: 'text-cyan-700', prefix: '/enseignant' },
  APPRENANT:   { label: 'Apprenant', from: '#8b5cf6', to: '#7c3aed', textColor: 'text-violet-700', prefix: '' },
} as const;

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => { onClose(); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;
  const p = location.pathname;
  const roleConf = ROLE_CONFIG[user.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.DIRECTEUR;
  const homePath = roleConf.prefix ? `${roleConf.prefix}/dashboard` : '/dashboard';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`w-64 h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ease-in-out custom-scrollbar ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          boxShadow: '4px 0 24px rgba(15, 23, 42, 0.04)',
        }}
      >
        {/* Top border accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #10B981, #06B6D4, transparent)' }} />

        {/* ── LOGO ── */}
        <div className="px-5 py-4 shrink-0 relative flex items-center justify-between"
          style={{ borderBottom: '1px solid #F1F5F9' }}>
          <Link to={homePath} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight leading-none block text-slate-900">
                ÉCOLE 3.0
              </span>
              <span className="text-[9px] font-bold tracking-[0.15em] uppercase flex items-center gap-1 text-emerald-600 mt-0.5">
                <Sparkles className="w-2.5 h-2.5" /> SEEC Platform
              </span>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── NAV ── */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
          
          {/* SUPER_ADMIN (/admin/...) */}
          {user.role === 'SUPER_ADMIN' && (
            <>
              <NavSection title="Principal">
                <NavItem to="/admin/dashboard" icon={LayoutDashboard} isActive={p === '/admin/dashboard' || p === '/dashboard'}>Accueil</NavItem>
                <NavItem to="/admin/agenda" icon={Calendar} isActive={p === '/admin/agenda'}>Agenda Scolaire</NavItem>
                <NavItem to="/admin/broadcast" icon={Zap} isActive={p === '/admin/broadcast'}>Flash News</NavItem>
              </NavSection>
              <NavSection title="Créations">
                <NavItem to="/admin/teaching-types" icon={Layers} isActive={p === '/admin/teaching-types'}>Types d'enseignement</NavItem>
                <NavItem to="/admin/school-types" icon={School} isActive={p === '/admin/school-types'}>Types d'établissement</NavItem>
                <NavItem to="/admin/academic-years" icon={Calendar} isActive={p === '/admin/academic-years'}>Années Scolaires</NavItem>
                <NavItem to="/admin/niveaux" icon={GraduationCap} isActive={p === '/admin/niveaux'}>Niveaux Scolaires</NavItem>
              </NavSection>
              <NavSection title="Académique">
                <NavItem to="/admin/courses" icon={BookOpen} isActive={p.startsWith('/admin/courses')}>Cours & Chapitres</NavItem>
                <NavItem to="/admin/assignments" icon={PenTool} isActive={p === '/admin/assignments'}>Devoirs & Projets</NavItem>
                <NavItem to="/admin/report-cards" icon={FileText} isActive={p === '/admin/report-cards'}>Bulletins Scolaires</NavItem>
                <NavItem to="/admin/library" icon={FolderOpen} isActive={p === '/admin/library'}>Bibliothèque Globale</NavItem>
              </NavSection>
              <NavSection title="Effectifs">
                <NavItem to="/admin/schools" icon={School} isActive={p === '/admin/schools'}>Toutes les Écoles</NavItem>
                <NavItem to="/admin/classes" icon={School} isActive={p === '/admin/classes'}>Toutes les Classes</NavItem>
                <NavItem to="/admin/users" icon={Users} isActive={p === '/admin/users'}>Tous les Utilisateurs</NavItem>
              </NavSection>
              <NavSection title="Réseau">
                <NavItem to="/admin/seec" icon={Network} isActive={p === '/admin/seec'}>Réseau SEEC</NavItem>
                <NavItem to="/admin/chat" icon={MessageCircle} isActive={p === '/admin/chat'}>Messagerie</NavItem>
                <NavItem to="/admin/forum" icon={MessageCircle} isActive={p === '/admin/forum'}>Forum d'entraide</NavItem>
              </NavSection>
              <div className="pt-2 space-y-1" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/admin/settings" icon={Settings} isActive={p === '/admin/settings'}>Paramètres Système</NavItem>
              </div>
            </>
          )}

          {/* DIRECTEUR (/directeur/...) */}
          {user.role === 'DIRECTEUR' && (
            <>
              <NavSection title="Principal">
                <NavItem to="/directeur/dashboard" icon={LayoutDashboard} isActive={p === '/directeur/dashboard' || p === '/dashboard'}>Accueil</NavItem>
                <NavItem to="/directeur/agenda" icon={Calendar} isActive={p === '/directeur/agenda'}>Agenda Établissement</NavItem>
              </NavSection>
              <NavSection title="Mon Établissement">
                <NavItem to="/directeur/classes" icon={School} isActive={p === '/directeur/classes'}>Classes & Effectifs</NavItem>
                <NavItem to="/directeur/users" icon={Users} isActive={p === '/directeur/users'}>Mes utilisateurs</NavItem>
                <NavItem to="/directeur/subjects" icon={BookOpen} isActive={p === '/directeur/subjects'}>Matières & Coefs</NavItem>
              </NavSection>
              <NavSection title="Pédagogie">
                <NavItem to="/directeur/courses" icon={LibraryIcon} isActive={p.startsWith('/directeur/courses')}>Cours & Dossiers</NavItem>
                <NavItem to="/directeur/report-cards" icon={FileText} isActive={p === '/directeur/report-cards'}>Bulletins Trimestriels</NavItem>
                <NavItem to="/directeur/library" icon={FolderOpen} isActive={p === '/directeur/library'}>Bibliothèque Globale</NavItem>
              </NavSection>
              <NavSection title="Vie Scolaire">
                <NavItem to="/directeur/absences" icon={ClipboardList} isActive={p === '/directeur/absences'}>Registre Absences</NavItem>
                <NavItem to="/directeur/conduct" icon={ClipboardList} isActive={p === '/directeur/conduct'}>Discipline & Conduite</NavItem>
              </NavSection>
              <NavSection title="Communication">
                <NavItem to="/directeur/broadcast" icon={Megaphone} isActive={p === '/directeur/broadcast'}>Annonces Flash</NavItem>
                <NavItem to="/directeur/chat" icon={MessageCircle} isActive={p === '/directeur/chat'}>Messagerie</NavItem>
                <NavItem to="/directeur/forum" icon={MessageCircle} isActive={p === '/directeur/forum'}>Forum Écoles</NavItem>
                <NavItem to="/directeur/shared-resources" icon={Network} isActive={p === '/directeur/shared-resources'}>Réseau SEEC</NavItem>
              </NavSection>
              <div className="pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/directeur/settings" icon={Settings} isActive={p === '/directeur/settings'}>Paramètres École</NavItem>
              </div>
            </>
          )}

          {/* EDUCATEUR (/educateur/...) */}
          {user.role === 'EDUCATEUR' && (
            <>
              <NavSection title="Principal">
                <NavItem to="/educateur/dashboard" icon={LayoutDashboard} isActive={p === '/educateur/dashboard' || p === '/dashboard'}>Accueil</NavItem>
                <NavItem to="/educateur/agenda" icon={Calendar} isActive={p === '/educateur/agenda'}>Agenda</NavItem>
              </NavSection>
              <NavSection title="Vie Scolaire">
                <NavItem to="/educateur/absences" icon={ClipboardList} isActive={p === '/educateur/absences'}>Absences Élèves</NavItem>
                <NavItem to="/educateur/conduct" icon={ClipboardList} isActive={p === '/educateur/conduct'}>Bulletins de Conduite</NavItem>
                <NavItem to="/educateur/classes" icon={School} isActive={p === '/educateur/classes'}>Classes Affectées</NavItem>
              </NavSection>
              <NavSection title="Pédagogie">
                <NavItem to="/educateur/users" icon={Users} isActive={p === '/educateur/users'}>Registre Élèves</NavItem>
                <NavItem to="/educateur/courses" icon={LibraryIcon} isActive={p.startsWith('/educateur/courses')}>Cours & Chapitres</NavItem>
                <NavItem to="/educateur/report-cards" icon={FileText} isActive={p === '/educateur/report-cards'}>Bulletins</NavItem>
              </NavSection>
              <NavSection title="Communication">
                <NavItem to="/educateur/chat" icon={MessageCircle} isActive={p === '/educateur/chat'}>Messagerie</NavItem>
                <NavItem to="/educateur/broadcast" icon={Megaphone} isActive={p === '/educateur/broadcast'}>Annonces</NavItem>
              </NavSection>
              <div className="pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/educateur/settings" icon={Settings} isActive={p === '/educateur/settings'}>Mon Profil</NavItem>
              </div>
            </>
          )}

          {/* ENSEIGNANT (/enseignant/...) */}
          {user.role === 'ENSEIGNANT' && (
            <>
              <NavSection title="Principal">
                <NavItem to="/enseignant/dashboard" icon={LayoutDashboard} isActive={p === '/enseignant/dashboard' || p === '/dashboard'}>Accueil</NavItem>
                <NavItem to="/enseignant/agenda" icon={Calendar} isActive={p === '/enseignant/agenda'}>Agenda</NavItem>
              </NavSection>
              <NavSection title="Pédagogie">
                <NavItem to="/enseignant/courses" icon={BookOpen} isActive={p.startsWith('/enseignant/courses')}>Mes Cours</NavItem>
                <NavItem to="/enseignant/assignments" icon={PenTool} isActive={p === '/enseignant/assignments'}>Devoirs de niveau</NavItem>
                <NavItem to="/enseignant/library" icon={FolderOpen} isActive={p === '/enseignant/library'}>Bibliothèque Globale</NavItem>
              </NavSection>
              <NavSection title="Notes">
                <NavItem to="/enseignant/report-cards" icon={BarChart3} isActive={p === '/enseignant/report-cards'}>Saisie Notes & Bulletins</NavItem>
              </NavSection>
              <NavSection title="Communication">
                <NavItem to="/enseignant/chat" icon={MessageCircle} isActive={p === '/enseignant/chat'}>Messagerie</NavItem>
                <NavItem to="/enseignant/forum" icon={MessageCircle} isActive={p === '/enseignant/forum'}>Forum Enseignants</NavItem>
                <NavItem to="/enseignant/shared-resources" icon={Network} isActive={p === '/enseignant/shared-resources'}>Réseau SEEC</NavItem>
              </NavSection>
              <div className="pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/enseignant/settings" icon={Settings} isActive={p === '/enseignant/settings'}>Mon Profil</NavItem>
              </div>
            </>
          )}

          {/* APPRENANT (Sans préfixe) */}
          {user.role === 'APPRENANT' && (
            <>
              <NavSection title="Mon Espace">
                <NavItem to="/dashboard" icon={LayoutDashboard} isActive={p === '/dashboard'}>Accueil</NavItem>
                <NavItem to="/agenda" icon={Calendar} isActive={p === '/agenda'}>Agenda & Devoirs</NavItem>
              </NavSection>
              <NavSection title="Cours & Exercices">
                <NavItem to="/courses" icon={BookOpen} isActive={p.startsWith('/courses')}>Mes Cours</NavItem>
                <NavItem to="/assignments" icon={PenTool} isActive={p === '/assignments'}>Devoirs à rendre</NavItem>
                <NavItem to="/library" icon={FolderOpen} isActive={p === '/library'}>Bibliothèque Globale</NavItem>
              </NavSection>
              <NavSection title="Résultats">
                <NavItem to="/report-cards" icon={BarChart3} isActive={p === '/report-cards'}>Notes & Bulletins</NavItem>
              </NavSection>
              <NavSection title="Entraide">
                <NavItem to="/chat" icon={MessageCircle} isActive={p === '/chat'}>Messagerie</NavItem>
                <NavItem to="/forum" icon={MessageCircle} isActive={p === '/forum'}>Forum d'entraide</NavItem>
                <NavItem to="/shared-resources" icon={Network} isActive={p === '/shared-resources'}>Ressources SEEC</NavItem>
              </NavSection>
              <div className="pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/settings" icon={Settings} isActive={p === '/settings'}>Mon Profil</NavItem>
              </div>
            </>
          )}
        </nav>

        {/* ── FOOTER ── */}
        <div className="px-4 py-4 shrink-0 relative"
          style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          
          {/* User card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl mb-3 transition-colors hover:bg-slate-100 cursor-pointer group"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
            onClick={() => navigate(roleConf.prefix ? `${roleConf.prefix}/settings` : '/settings')}>
            
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-white text-xs transition-transform duration-300 group-hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${roleConf.from}, ${roleConf.to})`, boxShadow: `0 2px 8px ${roleConf.from}40` }}>
              {user.firstName[0]}{user.lastName[0]}
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="font-black text-xs text-slate-900 truncate">{user.firstName} {user.lastName}</p>
              <p className={`text-[10px] font-bold truncate ${roleConf.textColor}`}>{roleConf.label}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 text-red-600 hover:bg-red-100"
            style={{ background: '#FEF2F2', border: '1px solid #FECDD3' }}
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>

        <ConfirmationModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleLogout}
          title="Déconnexion"
          message="Êtes-vous sûr de vouloir vous déconnecter de votre espace SEEC ?"
          confirmText="Me déconnecter"
          cancelText="Annuler"
          variant="danger"
        />
      </aside>
    </>
  );
};

export default Sidebar;
