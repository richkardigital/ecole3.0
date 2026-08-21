import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Eye, EyeOff, GraduationCap, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, Mail, Lock, Users, BookOpen, Search, UserCheck, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { ExpressStudentLookupModal } from '@/components/parent/ExpressStudentLookupModal';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'superadmin@example.com', color: 'text-red-600', bg: 'bg-red-50 border-red-200 hover:border-red-300', dot: '#ef4444', initial: 'SA' },
  { label: 'Directeur', email: 'directeur@ecole1.com', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300', dot: '#10b981', initial: 'DI' },
  { label: 'Éducateur', email: 'educateur@ecole1.com', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200 hover:border-orange-300', dot: '#f97316', initial: 'ED' },
  { label: 'Enseignant', email: 'enseignant@ecole1.com', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200 hover:border-sky-300', dot: '#06b6d4', initial: 'EN' },
  { label: 'Élève', email: 'apprenant@ecole1.com', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200 hover:border-violet-300', dot: '#8b5cf6', initial: 'EL' },
  { label: 'Parent', email: 'parent@ecole1.com', color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200 hover:border-pink-300', dot: '#ec4899', initial: 'PA' },
];

const BRAND_POINTS = [
  { icon: BookOpen, label: 'Bulletins automatisés en 1 clic', color: 'text-emerald-600' },
  { icon: Users, label: 'Gestion multi-rôles & classes', color: 'text-sky-600' },
  { icon: ShieldCheck, label: 'Réseau inter-écoles certifié', color: 'text-violet-600' },
];

const Login = () => {
  const { settings } = useSystemSettings();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [isPendingNotice, setIsPendingNotice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);

  const registrationNotice = location.state?.message;
  const registeredEmail = location.state?.registeredEmail;

  useEffect(() => {
    if (registeredEmail) {
      setValue('email', registeredEmail);
    }
  }, [registeredEmail, setValue]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setError('');
    setIsPendingNotice(false);
    try {
      const response = await api.post('/auth/login', data);
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        setError('Erreur réseau : Le serveur est injoignable.');
      } else {
        const errorData = err.response?.data;
        const message = errorData?.message || errorData || 'Identifiants incorrects.';
        const status = errorData?.status;
        if (status === 'PENDING_ACTIVATION') {
          setIsPendingNotice(true);
        }
        setError(typeof message === 'string' ? message : JSON.stringify(message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (email: string) => { setValue('email', email); setValue('password', 'password123'); setError(''); };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 font-sans relative overflow-hidden">
      
      {/* ── LEFT PANEL — Branding ── */}
      <div className="hidden lg:flex flex-col w-[50%] relative overflow-hidden bg-white border-r border-slate-200">
        
        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between h-full px-12 xl:px-16 py-12">
          {/* Logo */}
          <BrandLogo size="lg" to="/" subtitle="SEEEC" />

          {/* Headline & Features */}
          <div className="my-auto py-10">
            <h1 className="text-5xl xl:text-6xl font-black tracking-tighter leading-[0.95] mb-8 text-slate-900">
              <span>Pilotez votre</span><br />
              <span className="gradient-text">école avec</span><br />
              <span>précision.</span>
            </h1>
            
            <p className="text-slate-600 text-lg leading-relaxed mb-10 max-w-md font-medium">
              {settings?.description || "La plateforme unifie la gestion pédagogique, administrative et communicationnelle de votre établissement."}
            </p>

            {/* Feature points */}
            <div className="space-y-4">
              {BRAND_POINTS.map((pt, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200 shadow-xs">
                    <pt.icon className={`w-5 h-5 ${pt.color}`} style={{ width: '1.25rem', height: '1.25rem' }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{pt.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} {settings?.platformName || 'École 3.0'} — Système Intégré de Gestion Scolaire
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-12 relative bg-[#F8FAFC]">
        
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <BrandLogo size="md" to="/" subtitle="SEEEC" />
        </div>

        {/* Back link */}
        <div className="w-full max-w-lg mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors group font-semibold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour à la page d'accueil
          </Link>
        </div>

        <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          
          {/* ── BANNIÈRE ACCÈS DIRECT PARENT ── */}
          <div 
            onClick={() => setIsLookupModalOpen(true)}
            className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-purple-50 to-sky-50 border border-pink-200/90 flex items-center justify-between gap-3 cursor-pointer hover:border-pink-300 hover:shadow-md transition-all group"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-pink-700 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-pink-600 group-hover:rotate-12 transition-transform" />
                Accès direct parent
              </div>
              <p className="text-sm font-black text-slate-900 tracking-tight">
                Parent d'élève • Suivez votre enfant
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLookupModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-600/25 transition-all shrink-0 flex items-center gap-1.5 group-hover:scale-105"
            >
              <span>Suivre mon enfant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Form header */}
          <div>
            <h2 className="text-3xl font-black text-[#4D3E90] tracking-tight mb-2">Connexion</h2>
            <p className="text-slate-600 text-sm font-medium">Connectez-vous à votre espace SEEEC.</p>
          </div>

          {/* Demo accounts */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Comptes démo — cliquez pour remplir</p>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => fillDemo(d.email)}
                  className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-200 ${d.bg}`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-xs"
                    style={{ background: d.dot }}>
                    {d.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${d.color}`}>{d.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notice post-inscription */}
          {registrationNotice && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300/80 text-amber-900 flex items-start gap-3 shadow-xs animate-fade-in">
              <div className="p-1.5 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Inscription enregistrée</p>
                <p className="text-xs text-amber-700 font-medium leading-relaxed">{registrationNotice}</p>
              </div>
            </div>
          )}

          {/* Error / Status */}
          {error && isPendingNotice ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-sm animate-fade-in">
              <div className="p-1.5 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Compte en cours d'activation</h4>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">{error}</p>
                <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                  📞 Dès validation par l'administration, vos accès seront automatiquement débloqués.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="px-4 py-3.5 rounded-xl text-sm text-red-600 font-medium flex items-start gap-3 bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Adresse Email</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${focusedField === 'email' ? 'text-[#189CD8]' : 'text-slate-400'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                <input
                  {...register('email', { required: 'Email requis' })}
                  type="email"
                  autoComplete="email"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="vous@exemple.ci"
                  className="w-full pl-11 pr-4 py-3.5 text-sm text-slate-900 outline-none transition-all rounded-xl bg-slate-50 border border-slate-250 focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/15"
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-600 font-medium">{String(errors.email.message)}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Mot de passe</label>
                <Link to="/mot-de-passe-oublie" className="text-xs text-[#189CD8] hover:text-[#1280B2] font-bold transition-colors">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${focusedField === 'password' ? 'text-[#189CD8]' : 'text-slate-400'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                <input
                  {...register('password', { required: 'Mot de passe requis' })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3.5 text-sm text-slate-900 outline-none transition-all rounded-xl bg-slate-50 border border-slate-250 focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600 font-medium">{String(errors.password.message)}</p>}
            </div>

            <div className="pt-2">
              <Button type="submit" variant="glow" size="lg" isLoading={isLoading} className="w-full" rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}>
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
            </div>
          </form>

          <div className="pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600 font-medium">
              Votre école n'est pas encore inscrite ?{' '}
              <Link to="/inscription" className="text-[#189CD8] font-bold hover:text-[#1280B2] hover:underline transition-colors whitespace-nowrap">
                Inscrire mon établissement →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Express Student Lookup Modal */}
      <ExpressStudentLookupModal
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
      />

    </div>
  );
};

export default Login;

