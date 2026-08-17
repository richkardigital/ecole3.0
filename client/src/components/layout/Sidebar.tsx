import { useAuth } from '@/context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogOut, School, BookOpen, GraduationCap, LayoutDashboard, 
  FileText, Megaphone, X, Calendar, MessageCircle, 
  ClipboardList, Network, Settings, User,
  Plus, FolderOpen, Library as LibraryIcon, Layers,
  PenTool, Zap, Users, CheckSquare, BarChart3, Sparkles, CreditCard
} from 'lucide-react';
import { useState, useEffect } from 'react';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { BrandLogo } from '@/components/common/BrandLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NavItem = ({ to, icon: Icon, children, isActive, badge }: {
  to: string; icon: any; children: React.ReactNode; isActive: boolean; badge?: number;
}) => (
  <Link
    to={to}
    className="relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[14px] font-bold tracking-tight transition-all duration-200 group select-none"
    style={isActive ? {
      background: 'rgba(24, 156, 216, 0.1)',
      border: '1px solid rgba(24, 156, 216, 0.28)',
      color: '#1280b2',
      fontWeight: 800,
    } : {
      background: 'transparent',
      border: '1px solid transparent',
      color: '#334155',
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
        e.currentTarget.style.color = '#334155';
      }
    }}
  >
    {isActive && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full"
        style={{ background: '#189CD8', boxShadow: '0 0 10px rgba(24,156,216,0.6)' }} />
    )}
    <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? 'text-[#189CD8] stroke-[2.5]' : 'text-slate-500 group-hover:scale-110'}`} />
    <span className="flex-1 truncate">{children}</span>
    {badge !== undefined && badge > 0 && (
      <span className="ml-auto px-2 py-0.5 text-[11px] font-black rounded-full text-white shrink-0"
        style={{ background: '#189CD8' }}>
        {badge}
      </span>
    )}
  </Link>
);

const NavSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-4">
    <div className="px-3.5 py-1.5 text-[10px] font-black tracking-widest text-slate-600 uppercase">
      {title}
    </div>
    <div className="space-y-0.5 mt-1">
      {children}
    </div>
  </div>
);

const ROLE_CONFIG: Record<string, { label: string; prefix: string; from: string; to: string; textColor: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', prefix: '/admin', from: '#6366F1', to: '#4F46E5', textColor: 'text-indigo-700' },
  DIRECTEUR:   { label: 'Directeur',   prefix: '/directeur', from: '#189CD8', to: '#1280B2', textColor: 'text-[#1280B2]' },
  EDUCATEUR:   { label: 'Éducateur',   prefix: '/educateur', from: '#F59E0B', to: '#D97706', textColor: 'text-amber-700' },
  ENSEIGNANT:  { label: 'Enseignant',  prefix: '/enseignant', from: '#4D3E90', to: '#3C2F73', textColor: 'text-[#4D3E90]' },
  APPRENANT:   { label: 'Élève',       prefix: '', from: '#8B5CF6', to: '#7C3AED', textColor: 'text-purple-700' },
  PARENT:      { label: 'Parent',      prefix: '/parent', from: '#EC4899', to: '#DB2777', textColor: 'text-pink-700' },
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    onClose();
  }, [location.pathname]);

  if (!user) return null;

  const roleConf = ROLE_CONFIG[user.role] ?? { label: user.role, prefix: '', from: '#189CD8', to: '#1280B2', textColor: 'text-[#1280B2]' };
  const p = location.pathname;

  return (
    <>
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter de votre espace ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        variant="danger"
      />

      {/* Backdrop mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          boxShadow: '4px 0 24px rgba(0,0,0,0.03)',
        }}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 py-5 shrink-0"
          style={{ borderBottom: '1px solid #F1F5F9' }}>
          <BrandLogo size="md" to={roleConf.prefix ? `${roleConf.prefix}/dashboard` : '/dashboard'} subtitle="SEEEC" />

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── NAV ── */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
          
          {/* SUPER_ADMIN */}
          {user.role === 'SUPER_ADMIN' && (
            <>
              <NavSection title="Principal">
                <NavItem to="/admin/dashboard" icon={LayoutDashboard} isActive={p === '/admin/dashboard'}>Accueil</NavItem>
                <NavItem to="/admin/agenda" icon={Calendar} isActive={p === '/admin/agenda'}>Agenda Scolaire</NavItem>
                <NavItem to="/admin/broadcast" icon={Zap} isActive={p === '/admin/broadcast'}>Flash News</NavItem>
              </NavSection>
              <NavSection title="Créations">
                <NavItem to="/admin/teaching-types" icon={Layers} isActive={p === '/admin/teaching-types'}>Types d'enseignement</NavItem>
                <NavItem to="/admin/school-types" icon={School} isActive={p === '/admin/school-types'}>Types d'établissement</NavItem>
                <NavItem to="/admin/academic-years" icon={Calendar} isActive={p === '/admin/academic-years'}>Années Scolaires</NavItem>
                <NavItem to="/admin/niveaux" icon={GraduationCap} isActive={p === '/admin/niveaux'}>Niveaux Scolaires</NavItem>
                <NavItem to="/admin/subjects" icon={BookOpen} isActive={p === '/admin/subjects'}>Matières</NavItem>
                <NavItem to="/admin/subscriptions" icon={CreditCard} isActive={p === '/admin/subscriptions'}>Abonnements</NavItem>
              </NavSection>
              <NavSection title="Académique">
                <NavItem to="/admin/courses" icon={BookOpen} isActive={p.startsWith('/admin/courses')}>Cours Académiques</NavItem>
                <NavItem to="/admin/report-cards" icon={FileText} isActive={p === '/admin/report-cards'}>Bulletins Scolaires</NavItem>
                <NavItem to="/admin/library" icon={FolderOpen} isActive={p === '/admin/library'}>Librairie 3.0</NavItem>
              </NavSection>
              <NavSection title="Effectifs">
                <NavItem to="/admin/schools" icon={School} isActive={p === '/admin/schools'}>Toutes les Écoles</NavItem>
                <NavItem to="/admin/classes" icon={School} isActive={p === '/admin/classes'}>Toutes les Classes</NavItem>
                <NavItem to="/admin/users" icon={Users} isActive={p === '/admin/users'}>Tous les Utilisateurs</NavItem>
              </NavSection>
              <NavSection title="Réseau">
                <NavItem to="/admin/seeec" icon={Network} isActive={p === '/admin/seeec'}>Réseau SEEEC</NavItem>
                <NavItem to="/admin/chat" icon={MessageCircle} isActive={p === '/admin/chat'}>Messagerie</NavItem>
                <NavItem to="/admin/forum" icon={MessageCircle} isActive={p === '/admin/forum'}>Forum d'entraide</NavItem>
              </NavSection>
              <div className="pt-2 space-y-1" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/admin/profile" icon={User} isActive={p === '/admin/profile'}>Mon Profil</NavItem>
                <NavItem to="/admin/settings" icon={Settings} isActive={p === '/admin/settings'}>Paramètres</NavItem>
              </div>
            </>
          )}

          {/* DIRECTEUR */}
          {user.role === 'DIRECTEUR' && (
            <>
              <NavSection title="Principal">
                <NavItem to="/directeur/dashboard" icon={LayoutDashboard} isActive={p === '/directeur/dashboard'}>Accueil</NavItem>
                <NavItem to="/directeur/agenda" icon={Calendar} isActive={p === '/directeur/agenda'}>Agenda Scolaire</NavItem>
              </NavSection>
              <NavSection title="Mon Établissement">
                <NavItem to="/directeur/classes" icon={School} isActive={p === '/directeur/classes'}>Classes & Effectifs</NavItem>
                <NavItem to="/directeur/users" icon={Users} isActive={p === '/directeur/users'}>Mes utilisateurs</NavItem>
              </NavSection>
              <NavSection title="Pédagogie">
                <NavItem to="/directeur/courses" icon={LibraryIcon} isActive={p.startsWith('/directeur/courses')}>Cours & Dossiers</NavItem>
                <NavItem to="/directeur/report-cards" icon={FileText} isActive={p === '/directeur/report-cards'}>Bulletins Trimestriels</NavItem>
                <NavItem to="/directeur/library" icon={FolderOpen} isActive={p === '/directeur/library'}>Librairie 3.0</NavItem>
              </NavSection>
              <NavSection title="Vie Scolaire">
                <NavItem to="/directeur/absences" icon={ClipboardList} isActive={p === '/directeur/absences'}>Registre Absences</NavItem>
                <NavItem to="/directeur/conduct" icon={ClipboardList} isActive={p === '/directeur/conduct'}>Discipline & Conduite</NavItem>
              </NavSection>
              <NavSection title="Communication">
                <NavItem to="/directeur/broadcast" icon={Megaphone} isActive={p === '/directeur/broadcast'}>Annonces Flash</NavItem>
                <NavItem to="/directeur/chat" icon={MessageCircle} isActive={p === '/directeur/chat'}>Messagerie</NavItem>
                <NavItem to="/directeur/forum" icon={MessageCircle} isActive={p === '/directeur/forum'}>Forum Écoles</NavItem>
                <NavItem to="/directeur/shared-resources" icon={Network} isActive={p.startsWith('/directeur/shared-resources')}>Réseau SEEEC</NavItem>
              </NavSection>
              <div className="pt-2 space-y-1" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/directeur/profile" icon={User} isActive={p === '/directeur/profile'}>Mon Profil</NavItem>
                <NavItem to="/directeur/settings" icon={Settings} isActive={p === '/directeur/settings'}>Paramètres</NavItem>
              </div>
            </>
          )}

          {/* EDUCATEUR */}
          {user.role === 'EDUCATEUR' && (
            <>
              <NavSection title="Principal">
                <NavItem to="/educateur/dashboard" icon={LayoutDashboard} isActive={p === '/educateur/dashboard'}>Accueil</NavItem>
                <NavItem to="/educateur/agenda" icon={Calendar} isActive={p === '/educateur/agenda'}>Agenda Scolaire</NavItem>
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
                <NavItem to="/educateur/profile" icon={User} isActive={p === '/educateur/profile' || p === '/educateur/settings'}>Mon Profil</NavItem>
              </div>
            </>
          )}

          {/* ENSEIGNANT */}
          {user.role === 'ENSEIGNANT' && (
            <>
              <NavSection title="Principal">
                <NavItem to="/enseignant/dashboard" icon={LayoutDashboard} isActive={p === '/enseignant/dashboard'}>Accueil</NavItem>
                <NavItem to="/enseignant/agenda" icon={Calendar} isActive={p === '/enseignant/agenda'}>Agenda Scolaire</NavItem>
              </NavSection>
              <NavSection title="Pédagogie">
                <NavItem to="/enseignant/courses" icon={BookOpen} isActive={p.startsWith('/enseignant/courses')}>Mes Cours</NavItem>
                <NavItem to="/enseignant/library" icon={FolderOpen} isActive={p === '/enseignant/library'}>Librairie 3.0</NavItem>
              </NavSection>
              <NavSection title="Notes">
                <NavItem to="/enseignant/report-cards" icon={BarChart3} isActive={p === '/enseignant/report-cards'}>Saisie Notes & Bulletins</NavItem>
              </NavSection>
              <NavSection title="Communication">
                <NavItem to="/enseignant/chat" icon={MessageCircle} isActive={p === '/enseignant/chat'}>Messagerie</NavItem>
                <NavItem to="/enseignant/forum" icon={MessageCircle} isActive={p === '/enseignant/forum'}>Forum Enseignants</NavItem>
                <NavItem to="/enseignant/shared-resources" icon={Network} isActive={p.startsWith('/enseignant/shared-resources')}>Réseau SEEEC</NavItem>
              </NavSection>
              <div className="pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/enseignant/profile" icon={User} isActive={p === '/enseignant/profile' || p === '/enseignant/settings'}>Mon Profil</NavItem>
              </div>
            </>
          )}

          {/* APPRENANT */}
          {user.role === 'APPRENANT' && (
            <>
              <NavSection title="Mon Espace">
                <NavItem to="/dashboard" icon={LayoutDashboard} isActive={p === '/dashboard'}>Accueil</NavItem>
                <NavItem to="/agenda" icon={Calendar} isActive={p === '/agenda'}>Agenda Scolaire</NavItem>
              </NavSection>
              <NavSection title="Cours & Exercices">
                <NavItem to="/courses" icon={BookOpen} isActive={p.startsWith('/courses')}>Mes Cours</NavItem>
                <NavItem to="/library" icon={FolderOpen} isActive={p === '/library'}>Librairie 3.0</NavItem>
              </NavSection>
              <NavSection title="Résultats">
                <NavItem to="/report-cards" icon={BarChart3} isActive={p === '/report-cards'}>Notes & Bulletins</NavItem>
              </NavSection>
              <NavSection title="Entraide">
                <NavItem to="/chat" icon={MessageCircle} isActive={p === '/chat'}>Messagerie</NavItem>
                <NavItem to="/forum" icon={MessageCircle} isActive={p === '/forum'}>Forum d'entraide</NavItem>
                <NavItem to="/shared-resources" icon={Network} isActive={p.startsWith('/shared-resources')}>Réseau SEEEC</NavItem>
              </NavSection>
              <div className="pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/profile" icon={User} isActive={p === '/profile' || p === '/settings'}>Mon Profil</NavItem>
              </div>
            </>
          )}

          {/* PARENT */}
          {user.role === 'PARENT' && (
            <>
              <NavSection title="Espace Parent">
                <NavItem to="/parent/dashboard" icon={LayoutDashboard} isActive={p === '/parent/dashboard'}>Suivi des Enfants</NavItem>
              </NavSection>
              <NavSection title="Communication">
                <NavItem to="/chat" icon={MessageCircle} isActive={p === '/chat'}>Messagerie</NavItem>
                <NavItem to="/news" icon={Megaphone} isActive={p === '/news'}>Actualités de l'École</NavItem>
              </NavSection>
              <div className="pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                <NavItem to="/parent/profile" icon={User} isActive={p === '/parent/profile' || p === '/parent/settings'}>Mon Profil</NavItem>
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
            onClick={() => navigate(roleConf.prefix ? `${roleConf.prefix}/profile` : '/profile')}>
            
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
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 text-red-600 hover:bg-red-100 cursor-pointer"
            style={{ background: '#FEF2F2', border: '1px solid #FECDD3' }}
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
