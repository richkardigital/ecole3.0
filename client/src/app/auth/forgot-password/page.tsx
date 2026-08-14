import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Mail, ArrowLeft, CheckCircle2, ArrowRight, Key, Sparkles, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const ForgotPassword = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [step, setStep] = useState<'email' | 'sent' | 'reset-success'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Direct reset states
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const onSubmitEmail = async (data: any) => {
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setSubmittedEmail(data.email);
      setStep('sent');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors de l\'envoi. Vérifiez votre email.';
      setError(typeof message === 'string' ? message : 'Erreur inattendue.');
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', {
        email: submittedEmail,
        newPassword
      });
      setResetSuccess(true);
      setStep('reset-success');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors de la réinitialisation.';
      setError(typeof message === 'string' ? message : 'Erreur inattendue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden px-4 py-12">
      
      {/* Ambient background */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Back link */}
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-6 group font-semibold">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour à la page de connexion
        </Link>

        <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-xl">
          {/* Gradient top line */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-600" />

          <div className="p-8 sm:p-10">
            {/* Logo Header */}
            <div className="flex items-center gap-3.5 mb-8 pb-6 border-b border-slate-100">
              <img 
                src="/logo.png" 
                alt="Logo École 3.0" 
                className="h-12 w-auto max-w-[140px] object-contain" 
              />
              <div>
                <span className="text-2xl font-black text-slate-900 tracking-tight leading-none block">ÉCOLE 3.0</span>
                <span className="text-[10px] font-bold tracking-[0.22em] text-emerald-600 uppercase flex items-center gap-1.5 mt-1">
                  <Sparkles className="w-3 h-3 text-emerald-500" /> SEEEC Platform
                </span>
              </div>
            </div>

            {step === 'email' && (
              <>
                <div className="mb-7">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-emerald-50 border border-emerald-200">
                    <Key className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                    Mot de passe oublié
                  </h1>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Saisissez votre adresse email associée à votre compte SEEEC pour recevoir les instructions de réinitialisation.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 px-4 py-3.5 rounded-xl text-sm text-red-600 font-medium flex items-start gap-3 bg-red-50 border border-red-200">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmitEmail)} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Adresse Email
                    </label>
                    <div className="relative">
                      <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${focusedField === 'email' ? 'text-emerald-600' : 'text-slate-400'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                      <input
                        {...register('email', { required: 'Email requis', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Format email invalide' } })}
                        type="email"
                        autoComplete="email"
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="nom@domaine.ci"
                        className="w-full pl-11 pr-4 py-3.5 text-sm text-slate-900 outline-none transition-all rounded-xl bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
                      />
                    </div>
                    {errors.email && <p className="mt-1.5 text-xs text-red-600 font-medium">{String(errors.email.message)}</p>}
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="glow" size="lg" isLoading={isLoading} className="w-full" rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}>
                      {isLoading ? 'Envoi en cours...' : 'Envoyer les instructions'}
                    </Button>
                  </div>
                </form>
              </>
            )}

            {step === 'sent' && (
              <div className="py-2">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-50 border-2 border-emerald-200">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                    Instructions envoyées !
                  </h2>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Un email a été envoyé à{' '}
                    <span className="font-bold text-emerald-700">{submittedEmail}</span>.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2 bg-red-50 border border-red-200">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Quick direct password update card */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Définir un nouveau mot de passe</span>
                  </div>
                  <form onSubmit={onResetPassword} className="space-y-3">
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nouveau mot de passe (min. 6 car.)"
                        className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 rounded-xl bg-white border border-slate-250 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
                      Mettre à jour le mot de passe
                    </Button>
                  </form>
                </div>
                
                <div className="space-y-2.5">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => { setStep('email'); setError(''); }}
                    className="w-full"
                  >
                    Essayer avec un autre email
                  </Button>
                  <Link to="/login" className="block">
                    <Button variant="ghost" size="md" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                      Retour à la connexion
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {step === 'reset-success' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-emerald-50 border-2 border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                  Mot de passe mis à jour !
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                  Votre mot de passe a été modifié avec succès. Vous pouvez dès maintenant vous connecter.
                </p>

                <Link to="/login" className="block">
                  <Button variant="glow" size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Se connecter maintenant
                  </Button>
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
