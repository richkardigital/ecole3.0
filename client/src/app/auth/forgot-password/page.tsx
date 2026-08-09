import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Mail, ArrowLeft, CheckCircle2, GraduationCap, ArrowRight, Key } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const ForgotPassword = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [focusedField, setFocusedField] = useState(false);

  const onSubmit = async (data: any) => {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] relative overflow-hidden">
      
      {/* Ambient background */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Back link */}
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-8 group font-medium">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour à la connexion
        </Link>

        <div className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-xl">
          {/* Gradient top line */}
          <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500" />

          <div className="px-8 py-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-black text-slate-900 leading-none block">ÉCOLE 3.0</span>
                <span className="text-[9px] font-bold tracking-[0.18em] text-emerald-600 uppercase">SEEEC Platform</span>
              </div>
            </div>

            {step === 'email' ? (
              <>
                <div className="mb-8">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-emerald-50 border border-emerald-200">
                    <Key className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                    Mot de passe oublié
                  </h1>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    Entrez votre adresse email. Si un compte SEEEC existe, vous recevrez un lien de réinitialisation.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 px-4 py-3.5 rounded-xl text-sm text-red-600 font-medium flex items-start gap-3 bg-red-50 border border-red-200">
                    <span className="shrink-0">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                      Adresse Email
                    </label>
                    <div className="relative">
                      <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${focusedField ? 'text-emerald-600' : 'text-slate-400'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                      <input
                        {...register('email', { required: 'Email requis', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Format email invalide' } })}
                        type="email"
                        autoComplete="email"
                        onFocus={() => setFocusedField(true)}
                        onBlur={() => setFocusedField(false)}
                        placeholder="vous@exemple.ci"
                        className="w-full pl-11 pr-4 py-3.5 text-sm text-slate-900 outline-none transition-all rounded-xl bg-slate-50 border border-slate-250 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10"
                      />
                    </div>
                    {errors.email && <p className="mt-1.5 text-xs text-red-600 font-medium">{String(errors.email.message)}</p>}
                  </div>

                  <Button type="submit" variant="glow" size="lg" isLoading={isLoading} className="w-full" rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}>
                    {isLoading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                  </Button>
                </form>
              </>
            ) : (
              /* Success step */
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-50 border-2 border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
                  Email envoyé !
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-2 font-medium">
                  Si un compte SEEEC existe pour{' '}
                  <span className="font-bold text-emerald-700">{submittedEmail}</span>,<br />
                  vous recevrez un email dans les prochaines minutes.
                </p>
                <p className="text-xs text-slate-400 mb-8">
                  Pensez à vérifier votre dossier spam.
                </p>
                
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setStep('email')}
                    className="w-full"
                  >
                    Modifier l'adresse email
                  </Button>
                  <Link to="/login" className="block">
                    <Button variant="ghost" size="md" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                      Retour à la connexion
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
