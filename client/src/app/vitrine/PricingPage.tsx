import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles, Zap, Building2, ShieldCheck, HelpCircle, Award, Check, PhoneCall, HeartHandshake, Layers, Crown } from 'lucide-react';
import api from '@/lib/api';

const DEFAULT_PLANS = [
  {
    id: 'plan-standard',
    name: 'Pack Standard',
    planKey: 'standard',
    description: "Idéal pour les collèges et établissements de proximité (jusqu'à 500 élèves)",
    price: 75000,
    features: [
      "Gestion complète des élèves & classes",
      "Notes, évaluations & relevés officiels",
      "Bulletins automatisés certifiés SEEEC",
      "Agenda scolaire & planning synchronisé",
      "Cahier de texte numérique sécurisé",
      "Support technique par email & assistance"
    ]
  },
  {
    id: 'plan-pro',
    name: 'Pack Pro Établissement',
    planKey: 'pro',
    description: "La solution complète pour tout le secondaire (collèges & lycées d'excellence)",
    price: 150000,
    features: [
      "Tous les avantages du Pack Standard",
      "Collèges & Lycées (1er et 2nd cycles complets)",
      "Effectifs élèves & professeurs illimités",
      "Bulletins officiels SEEEC + Registre de Conduite",
      "Messagerie directe & Annonces Flash News",
      "Librairie numérique 3.0 (Manuels & Annales)",
      "Accompagnement & Support prioritaire dédié"
    ]
  },
  {
    id: 'plan-elite',
    name: 'Pack Élite Complexe',
    planKey: 'elite',
    description: "Pour les grands groupes scolaires, complexes mixtes et réseaux multi-établissements",
    price: 250000,
    features: [
      "Tous les avantages du Pack Pro",
      "Multi-établissements & Gestion centralisée",
      "Enseignement Général, Technique & Mixte",
      "Module Examens Blancs & Statistiques avancées",
      "Personnalisation & Intégration SEEEC sur-mesure",
      "Formation des équipes pédagogiques sur site",
      "Chef de projet dédié & Support direct 24/7"
    ]
  }
];

export default function PricingPage() {
  const [plans, setPlans] = useState<any[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/subscriptions');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setPlans(res.data);
        }
      } catch (err) {
        console.error('Utilisation des plans de secours:', err);
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
      
      {/* ── HERO ── */}
      <section className="relative pt-10 sm:pt-14 pb-8 sm:pb-10 overflow-hidden hero-bg">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <span className="chip chip-brand mb-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-[#189CD8]" />
            Tarifs & Formules LMS École 3.0
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#4D3E90] mb-6 leading-[1.08]">
            Choisissez votre formule et <span className="gradient-text">commencez immédiatement.</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto mb-6 font-medium">
            Profitez du meilleur rapport qualité-prix ! Toutes les formules sont dotées des fonctionnalités LMS standard. Personnalisez votre formule en fonction de votre école et enrichissez-la d'options supplémentaires pour simplifier votre quotidien. Profitez d'un tarif fixe qui vous permet de mieux contrôler votre budget.
          </p>

          {/* Unified Annual Billing Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-amber-950 tracking-tight">
              Facturation Annuelle — <span className="text-amber-800 underline decoration-amber-400 decoration-2">Économisez jusqu'à 50%</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── PRICING CARDS ── */}
      <section className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isPro = plan.planKey === 'pro' || plan.name?.toLowerCase().includes('pro');
            const isElite = plan.planKey === 'elite' || plan.name?.toLowerCase().includes('élite') || plan.name?.toLowerCase().includes('complexe');
            const displayPrice = plan.price;
            const displayPeriod = 'par an (année scolaire complète)';

            // Styling variants per plan
            let cardClasses = 'bg-white text-slate-900 border-2 border-slate-200 shadow-md hover:shadow-xl hover:border-[#189CD8]/40';
            let badgeComponent = (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 mb-3">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                Collèges & Écoles
              </span>
            );
            let priceBoxClasses = 'bg-slate-100/80 border border-slate-200 text-slate-900';
            let priceTextColor = 'text-slate-950';
            let currencyColor = 'text-[#189CD8] font-extrabold';
            let buttonClasses = 'bg-slate-900 hover:bg-[#189CD8] text-white font-black shadow-md';
            let checkIconColor = 'text-[#189CD8]';
            let featureTextColor = 'text-slate-800 font-semibold';
            let featureHeaderColor = 'text-slate-500 font-black';

            if (isPro) {
              cardClasses = 'bg-slate-950 text-white border-2 border-[#189CD8] shadow-2xl scale-[1.03] z-10 ring-4 ring-[#189CD8]/20';
              badgeComponent = (
                <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                  <span className="bg-gradient-to-r from-[#4D3E90] to-[#189CD8] text-white text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Recommandé Établissements
                  </span>
                </div>
              );
              priceBoxClasses = 'bg-slate-900/90 border border-[#189CD8]/40 text-white shadow-inner';
              priceTextColor = 'text-white';
              currencyColor = 'text-[#38bdf8] font-black';
              buttonClasses = 'bg-gradient-to-r from-[#4D3E90] to-[#189CD8] hover:from-[#3C2F73] hover:to-[#1280B2] text-white font-black shadow-lg shadow-[#189CD8]/30';
              checkIconColor = 'text-[#38bdf8]';
              featureTextColor = 'text-slate-100 font-semibold';
              featureHeaderColor = 'text-[#38bdf8] font-black';
            } else if (isElite) {
              cardClasses = 'bg-gradient-to-b from-indigo-50/40 via-white to-white text-slate-900 border-2 border-indigo-200 shadow-md hover:shadow-xl hover:border-indigo-400';
              badgeComponent = (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 mb-3">
                  <Crown className="w-3.5 h-3.5 text-indigo-600" />
                  Complexes & Groupes
                </span>
              );
              priceBoxClasses = 'bg-indigo-50/70 border border-indigo-200 text-slate-900';
              priceTextColor = 'text-indigo-950';
              currencyColor = 'text-indigo-600 font-extrabold';
              buttonClasses = 'bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-500/20';
              checkIconColor = 'text-indigo-600';
              featureTextColor = 'text-slate-800 font-semibold';
              featureHeaderColor = 'text-indigo-600 font-black';
            }

            return (
              <div 
                key={plan.id || plan.planKey}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${cardClasses}`}
              >
                {badgeComponent}

                <div className={isPro ? 'pt-2' : ''}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-xl sm:text-2xl font-black ${isPro ? 'text-white' : 'text-slate-950'}`}>
                      {plan.name}
                    </h3>
                  </div>
                  
                  <p className={`text-xs sm:text-sm mb-5 min-h-[38px] leading-relaxed font-medium ${isPro ? 'text-slate-300' : 'text-slate-600'}`}>
                    {plan.description}
                  </p>

                  <div className={`mb-6 p-4 rounded-2xl ${priceBoxClasses}`}>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-3xl sm:text-4xl font-black tracking-tight ${priceTextColor}`}>
                        {displayPrice.toLocaleString('fr-FR')}
                      </span>
                      <span className={`text-xs sm:text-sm ${currencyColor}`}>
                        FCFA
                      </span>
                    </div>
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider block mt-1 ${isPro ? 'text-slate-400' : 'text-slate-500'}`}>
                      {displayPeriod}
                    </span>
                  </div>

                  <Link 
                    to={`/inscription?plan=${plan.planKey}&billing=annuel`} 
                    className="block w-full mb-6"
                  >
                    <button 
                      className={`w-full py-4 px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${buttonClasses}`}
                    >
                      <span>Souscrire au {plan.name}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </Link>

                  <div className={`space-y-3 pt-4 border-t ${isPro ? 'border-slate-800' : 'border-slate-200'}`}>
                    <p className={`text-[10px] sm:text-[11px] uppercase tracking-wider ${featureHeaderColor}`}>
                      Fonctionnalités incluses
                    </p>
                    {plan.features?.map((feat: string, j: number) => (
                      <div key={j} className="flex items-start gap-2.5">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${checkIconColor}`} />
                        <span className={`text-xs sm:text-sm leading-snug ${featureTextColor}`}>
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}


