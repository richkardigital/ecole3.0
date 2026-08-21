import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  School, User, Lock, Mail, Phone, MapPin, Building2, ShieldCheck, ArrowRight,
  CheckCircle2, ChevronLeft, Sparkles, GraduationCap, Eye, EyeOff, Tag, AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { BrandLogo } from '@/components/common/BrandLogo';

// We now fetch plans dynamically

export default function RegisterSchoolPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanInfo, setSelectedPlanInfo] = useState<any>(null);
  
  const billingKey = searchParams.get('billing') || 'trimestriel';

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [teachingTypes, setTeachingTypes] = useState<any[]>([]);
  const [schoolTypes, setSchoolTypes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    schoolName: '',
    schoolVille: '',
    schoolAddress: '',
    teachingTypeId: '',
    schoolTypeId: '',
    selectedPlan: '',
    billingPeriod: billingKey,
  });

  const FALLBACK_TEACHING_TYPES = [
    { id: 'general-prim', name: 'Enseignement Général (Primaire)' },
    { id: 'general-sec', name: 'Enseignement Général (Secondaire)' },
    { id: 'technique', name: 'Enseignement Technique & Professionnel' },
    { id: 'mixte', name: 'Complexe Mixte (Général & Technique)' },
  ];

  const FALLBACK_SCHOOL_TYPES = [
    { id: 'prim', name: 'Primaire' },
    { id: 'col', name: 'Collège' },
    { id: 'lyc', name: 'Lycée' },
    { id: 'cs', name: 'Complexe Scolaire (Primaire & Secondaire)' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ttRes, stRes, planRes] = await Promise.all([
          api.get('/teaching-types'),
          api.get('/school-types'),
          api.get('/subscriptions')
        ]);
        
        const activeTt = ttRes.data?.filter((t: any) => t.isActive);
        setTeachingTypes(activeTt?.length > 0 ? activeTt : FALLBACK_TEACHING_TYPES);

        const activeSt = stRes.data?.filter((t: any) => t.isActive);
        setSchoolTypes(activeSt?.length > 0 ? activeSt : FALLBACK_SCHOOL_TYPES);

        const fetchedPlans = planRes.data;
        setPlans(fetchedPlans);
        
        const pKey = searchParams.get('plan') || 'pro';
        const foundPlan = fetchedPlans.find((p: any) => p.planKey === pKey) || fetchedPlans.find((p: any) => p.planKey === 'pro') || fetchedPlans[0];
        setSelectedPlanInfo(foundPlan);
        
        setFormData(prev => ({ ...prev, selectedPlan: foundPlan?.planKey || '' }));
      } catch {
        setTeachingTypes(FALLBACK_TEACHING_TYPES);
        setSchoolTypes(FALLBACK_SCHOOL_TYPES);
        // Fallback minimal pour éviter le crash complet
        const fallbackPlan = { name: "Établissement Pro", price: 45000, period: "par trimestre", color: "bg-[#189CD8]/10 text-[#1280B2] border-[#189CD8]/25", planKey: "pro" };
        setSelectedPlanInfo(fallbackPlan);
        setFormData(prev => ({ ...prev, selectedPlan: "pro" }));
      }
    };
    fetchData();
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password) {
      setError('Veuillez remplir tous les champs obligatoires du Directeur.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.schoolName.trim() || !formData.schoolVille.trim()) {
      setError("Veuillez renseigner au moins le nom de l'établissement et la ville.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register-school', formData);
      navigate('/login', {
        state: { 
          message: `Demande d'inscription enregistrée avec succès pour l'établissement "${formData.schoolName}" ! Votre compte est actuellement en cours de vérification par nos administrateurs. Vous pourrez vous connecter dès son activation.`,
          isPendingActivation: true,
          registeredEmail: formData.email
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Une erreur est survenue lors de l'enregistrement de l'école.");
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeName = teachingTypes.find(t => t.id === formData.teachingTypeId)?.name || 'Non spécifié (Général par défaut)';

  const STEPS = [
    { n: 1, title: 'Profil Directeur', desc: 'Vos identifiants d\'accès' },
    { n: 2, title: 'Établissement', desc: 'Informations de l\'école' },
    { n: 3, title: 'Validation', desc: 'Formule & Activation' },
  ];

  if (!selectedPlanInfo) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <GraduationCap className="w-12 h-12 text-[#189CD8] mb-4 opacity-50" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      
      {/* Ambient grid */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10">
        
        {/* Back link */}
        <Link to="/tarifs" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-6 group font-medium">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour aux tarifs & abonnements
        </Link>

        <div className="rounded-3xl overflow-hidden flex flex-col md:flex-row bg-white border border-slate-200 shadow-xl">
          
          {/* ── LEFT PANEL: BRANDING & STEPPER ── */}
          <div className="md:w-5/12 flex flex-col justify-between p-8 md:p-10 bg-slate-50 border-r border-slate-200 hidden md:flex">
            <div>
              {/* Logo */}
              <div className="mb-8">
                <BrandLogo size="md" to="/" subtitle="SEEEC" />
              </div>

              <h2 className="text-2xl font-black text-[#4D3E90] tracking-tight mb-3 leading-tight">
                Enregistrez votre<br />Établissement
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-8 font-medium">
                Activez l'espace administrateur de votre école et bénéficiez de toutes les fonctionnalités SEEEC.
              </p>

              {/* Selected Plan Summary Badge */}
              <div className={`p-4 rounded-2xl border mb-8 ${selectedPlanInfo.color}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Formule choisie
                  </span>
                  <Link to="/tarifs" className="text-[10px] font-bold underline hover:opacity-80">
                    Changer
                  </Link>
                </div>
                <p className="font-black text-sm text-slate-900">{selectedPlanInfo.name}</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {typeof selectedPlanInfo.price === 'number' 
                    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(selectedPlanInfo.price)
                    : selectedPlanInfo.price} <span className="text-[10px]">({billingKey === 'annuel' ? 'Annuel' : selectedPlanInfo.period})</span>
                </p>
              </div>

              {/* Vertical Stepper */}
              <div className="space-y-4">
                {STEPS.map((s) => {
                  const isActive = currentStep === s.n;
                  const isDone = currentStep > s.n;
                  return (
                    <div
                      key={s.n}
                      onClick={() => { if (isDone) setCurrentStep(s.n as any); }}
                      className={`flex items-start gap-4 ${isDone ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300"
                          style={
                            isDone ? { background: '#189CD8', color: 'white' }
                            : isActive ? { background: 'rgba(24,156,216,0.1)', border: '1px solid rgba(24,156,216,0.3)', color: '#1280B2' }
                            : { background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#94A3B8' }
                          }
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                        </div>
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-xs font-black ${isActive || isDone ? 'text-slate-900' : 'text-slate-400'}`}>{s.title}</p>
                        <p className="text-[11px] text-slate-500 font-medium">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Badges */}
            <div className="pt-6 space-y-2 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#189CD8] shrink-0" />
                <span>Données chiffrées & sécurisées</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Essai sans engagement</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL: FORM INPUTS ── */}
          <div className="flex-1 p-8 md:p-10">
            
            {/* Selected Plan Top Banner for Mobile */}
            <div className={`p-3.5 rounded-2xl border mb-6 flex items-center justify-between ${selectedPlanInfo.color}`}>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-black text-slate-900 block leading-tight">{selectedPlanInfo.name}</span>
                  <span className="text-[10px] font-semibold text-slate-600">{selectedPlanInfo.price} ({billingKey})</span>
                </div>
              </div>
              <Link to="/tarifs" className="text-xs font-bold text-emerald-700 hover:underline">
                Changer
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 px-4 py-3.5 rounded-2xl text-xs text-red-600 font-bold flex items-start gap-2.5 bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* ── STEP 1: Profil Directeur ── */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in-up">
                  <div>
                    <h3 className="text-xl font-black text-[#4D3E90] tracking-tight">1. Identifiants du Directeur</h3>
                    <p className="text-xs text-slate-500 font-medium">Informations du responsable principal de l'établissement.</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Prénom <span className="text-[#189CD8]">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="Jean-Marc"
                          className="w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Nom de famille <span className="text-[#189CD8]">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Kouassi"
                          className="w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Adresse Email <span className="text-[#189CD8]">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="directeur@ecole.ci"
                        className="w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Téléphone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+225 07 00 00 00 00"
                        className="w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/10"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Mot de passe <span className="text-[#189CD8]">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Minimum 6 caractères"
                          className="w-full pl-10 pr-10 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/10"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Confirmer le mot de passe <span className="text-[#189CD8]">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Répétez votre mot de passe"
                          className="w-full pl-10 pr-10 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/10"
                          required
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {formData.confirmPassword && formData.confirmPassword === formData.password && (
                    <div className="p-2.5 rounded-xl bg-[#189CD8]/10 border border-[#189CD8]/25 text-xs font-bold text-[#1280B2] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#189CD8]" /> Mots de passe identiques
                    </div>
                  )}

                  <Button type="button" onClick={handleNext} variant="glow" size="lg" className="w-full mt-4" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Étape suivante — Informations de l'École
                  </Button>
                </div>
              )}

              {/* ── STEP 2: Informations de l'Établissement ── */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in-up">
                  <div>
                    <h3 className="text-xl font-black text-[#4D3E90] tracking-tight">2. Votre Établissement</h3>
                    <p className="text-xs text-slate-500 font-medium">Informations officielles de votre école en Côte d'Ivoire.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      Nom officiel de l'école <span className="text-[#189CD8]">*</span>
                    </label>
                    <div className="relative">
                      <School className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleChange}
                        placeholder="Ex: Groupe Scolaire Excellence"
                        className="w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Ville <span className="text-[#189CD8]">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          name="schoolVille"
                          value={formData.schoolVille}
                          onChange={handleChange}
                          placeholder="Ex: Abidjan, Bouaké..."
                          className="w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/10"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Adresse / Quartier
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          name="schoolAddress"
                          value={formData.schoolAddress}
                          onChange={handleChange}
                          placeholder="Ex: Cocody Riviera 3"
                          className="w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] focus:bg-white focus:ring-2 focus:ring-[#189CD8]/10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Type d'enseignement
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          name="teachingTypeId"
                          value={formData.teachingTypeId}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] font-bold cursor-pointer"
                        >
                          <option value="">Sélectionnez le type d'enseignement...</option>
                          {teachingTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Type d'établissement (Niveau)
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          name="schoolTypeId"
                          value={formData.schoolTypeId}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-[#189CD8] font-bold cursor-pointer"
                        >
                          <option value="">Sélectionnez le type d'école...</option>
                          {schoolTypes.map((st) => (
                            <option key={st.id} value={st.id}>{st.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => setCurrentStep(1)}>
                      ← Retour
                    </Button>
                    <Button type="button" onClick={handleNext} variant="glow" size="lg" className="flex-1" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Vérifier & Confirmer
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Récapitulatif & Choix Période ── */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in-up">
                  <div>
                    <h3 className="text-xl font-black text-[#4D3E90] tracking-tight">3. Récapitulatif & Facturation</h3>
                    <p className="text-xs text-slate-500 font-medium">Vérifiez vos informations et choisissez votre cycle de facturation.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 text-xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#1280B2] mb-1">Directeur / Gérant</p>
                      <p className="font-black text-slate-900 text-sm">{formData.firstName} {formData.lastName}</p>
                      <p className="text-slate-600 font-medium">{formData.email} {formData.phone && `• ${formData.phone}`}</p>
                    </div>

                    <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 text-xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-sky-700 mb-1">Établissement</p>
                      <p className="font-black text-slate-900 text-sm">{formData.schoolName}</p>
                      <p className="text-slate-600 font-medium">{formData.schoolVille} {formData.schoolAddress && `(${formData.schoolAddress})`}</p>
                      <p className="text-slate-500 text-[11px] mt-1 font-semibold">Type : {selectedTypeName}</p>
                    </div>

                    {/* Billing Period Selector in Step 3 */}
                    <div className="rounded-2xl p-4 bg-white border-2 border-indigo-200 shadow-sm">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#4D3E90] mb-2.5">
                        Cycle de Facturation pour {selectedPlanInfo?.name}
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div
                          onClick={() => setFormData(prev => ({ ...prev, billingPeriod: 'trimestriel' }))}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.billingPeriod === 'trimestriel'
                              ? 'border-[#189CD8] bg-[#189CD8]/10 text-slate-900 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs">Trimestriel</span>
                            {formData.billingPeriod === 'trimestriel' && <CheckCircle2 className="w-4 h-4 text-[#189CD8]" />}
                          </div>
                          <p className="text-xs font-black text-slate-900">
                            {selectedPlanInfo?.price ? Math.round(selectedPlanInfo.price / 2.5).toLocaleString('fr-FR') : '65 000'} FCFA
                          </p>
                          <span className="text-[10px] text-slate-500 font-semibold block">Par trimestre</span>
                        </div>

                        <div
                          onClick={() => setFormData(prev => ({ ...prev, billingPeriod: 'annuel' }))}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.billingPeriod === 'annuel'
                              ? 'border-indigo-600 bg-indigo-50 text-slate-900 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs">Annuel</span>
                            <span className="text-[9px] uppercase font-black px-1 rounded bg-amber-400 text-slate-950">-30%</span>
                          </div>
                          <p className="text-xs font-black text-slate-900">
                            {selectedPlanInfo?.price ? selectedPlanInfo.price.toLocaleString('fr-FR') : '150 000'} FCFA
                          </p>
                          <span className="text-[10px] text-slate-500 font-semibold block">Année scolaire complète</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => setCurrentStep(2)}>
                      ← Modifier
                    </Button>
                    <Button type="submit" variant="glow" size="lg" isLoading={loading} className="flex-1" rightIcon={!loading ? <ShieldCheck className="w-4 h-4" /> : undefined}>
                      {loading ? "Création en cours..." : "Valider mon Inscription"}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <p className="mt-8 text-center text-xs text-slate-500 font-medium">
              Déjà inscrit ?{' '}
              <Link to="/login" className="text-[#189CD8] font-bold hover:text-[#1280B2] transition-colors">
                Se connecter →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
