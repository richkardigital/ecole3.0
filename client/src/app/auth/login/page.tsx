import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Eye, EyeOff, GraduationCap, ArrowRight, ShieldCheck, Sparkles, Mail, Lock, Users, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'superadmin@example.com', color: 'text-red-600', bg: 'bg-red-50 border-red-200 hover:border-red-300', dot: '#ef4444', initial: 'SA' },
  { label: 'Directeur', email: 'directeur@ecole1.com', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300', dot: '#10b981', initial: 'DI' },
  { label: 'Enseignant', email: 'enseignant@ecole1.com', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200 hover:border-sky-300', dot: '#06b6d4', initial: 'EN' },
  { label: 'Élève', email: 'apprenant@ecole1.com', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200 hover:border-violet-300', dot: '#8b5cf6', initial: 'EL' },
];

const BRAND_POINTS = [
  { icon: BookOpen, label: 'Bulletins automatisés en 1 clic', color: 'text-emerald-600' },
  { icon: Users, label: 'Gestion multi-rôles & classes', color: 'text-sky-600' },
  { icon: ShieldCheck, label: 'Réseau inter-écoles SEEEC certifié', color: 'text-violet-600' },
];

const Login = () => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', data);
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        setError('Erreur réseau : Le serveur est injoignable.');
      } else {
        const message = err.response?.data?.message || err.response?.data || 'Identifiants incorrects.';
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
      <div className="hidden lg:flex flex-col w-[52%] relative overflow-hidden bg-white border-r border-slate-200">
        
        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full px-12 py-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group w-fit">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 tracking-tight leading-none block">ÉCOLE 3.0</span>
              <span className="text-[9px] font-bold tracking-[0.2em] text-emerald-600 uppercase flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> SEEEC Platform
              </span>
            </div>
          </Link>

          {/* Headline */}
          <div className="flex-1 flex flex-col justify-center mt-16">
            <h1 className="text-5xl xl:text-6xl font-black tracking-tighter leading-[0.95] mb-8 text-slate-900">
              <span>Pilotez votre</span><br />
              <span className="gradient-text">école avec</span><br />
              <span>précision.</span>
            </h1>
            
            <p className="text-slate-600 text-lg leading-relaxed mb-12 max-w-md font-medium">
              La plateforme SEEEC unifie la gestion pédagogique, administrative et communicationnelle de votre établissement.
            </p>

            {/* Feature points */}
            <div className="space-y-4">
              {BRAND_POINTS.map((pt, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200">
                    <pt.icon className={`w-4.5 h-4.5 ${pt.color}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{pt.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats footer */}
          <div className="grid grid-cols-3 gap-4 pt-10 border-t border-slate-100">
            {[['150+', 'Écoles'], ['45K+', 'Élèves'], ['99.2%', 'Satisfaction']].map(([val, label], i) => (
              <div key={i}>
                <div className="text-2xl font-black text-emerald-600 leading-none">{val}</div>
                <div className="text-xs text-slate-500 font-semibold mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative bg-[#F8FAFC]">
        
        {/* Mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-3 mb-12 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-slate-900">ÉCOLE 3.0</span>
        </Link>

        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl">
          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Bon retour 👋</h2>
            <p className="text-slate-600 text-sm font-medium">Connectez-vous à votre espace SEEEC.</p>
          </div>

          {/* Demo accounts */}
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Comptes démo — cliquez pour remplir</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => fillDemo(d.email)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200 ${d.bg}`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                    style={{ background: d.dot }}>
                    {d.initial}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${d.color}`}>{d.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3.5 rounded-xl text-sm text-red-600 font-medium flex items-start gap-3 bg-red-50 border border-red-200">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Adresse Email</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${focusedField === 'email' ? 'text-emerald-600' : 'text-slate-400'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                <input
                  {...register('email', { required: 'Email requis' })}
                  type="email"
                  autoComplete="email"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="vous@exemple.ci"
                  className="w-full pl-11 pr-4 py-3.5 text-sm text-slate-900 outline-none transition-all rounded-xl bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-600 font-medium">{String(errors.email.message)}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Mot de passe</label>
                <Link to="/mot-de-passe-oublie" className="text-xs text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${focusedField === 'password' ? 'text-emerald-600' : 'text-slate-400'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                <input
                  {...register('password', { required: 'Mot de passe requis' })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3.5 text-sm text-slate-900 outline-none transition-all rounded-xl bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
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

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Votre école n'est pas encore inscrite ?{' '}
            <Link to="/inscription" className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors">
              Inscrire mon établissement →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
