import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles, Zap, Building2, ShieldCheck, HelpCircle } from 'lucide-react';

const PLANS = [
  {
    key: "decouverte",
    name: "Découverte",
    priceMonth: "0 FCFA",
    priceYear: "0 FCFA",
    period: "Essai 14 jours",
    desc: "Idéal pour tester toutes les fonctionnalités avec vos premiers enseignants.",
    features: [
      "Jusqu'à 100 élèves",
      "1 Directeur + 5 Enseignants",
      "Calcul des bulletins trimestriels",
      "Génération PDF officielle",
      "Support par email",
    ],
    cta: "Tester Gratuitement",
    variant: "outline" as const,
  },
  {
    key: "pro",
    name: "Établissement Pro",
    priceMonth: "45 000 FCFA",
    priceYear: "450 000 FCFA",
    period: "par trimestre",
    popular: true,
    desc: "La solution complète pour les écoles primaires, collèges et lycées.",
    features: [
      "Élèves illimités",
      "Professeurs & Éducateurs illimités",
      "Bulletins + Rang + Appréciations",
      "Espaces Enseignant & Élève distincts",
      "Annonces Flash & Messagerie",
      "Réseau Inter-Écoles SEEC",
      "Support Téléphone & WhatsApp prioritaire",
    ],
    cta: "Choisir le Plan Pro",
    variant: "glow" as const,
  },
  {
    key: "mixte",
    name: "Complexe Mixte",
    priceMonth: "Sur Devise",
    priceYear: "Sur Devise",
    period: "sur-mesure",
    desc: "Pour les grands groupes scolaires comprenant Général + Technique & Professionnel.",
    features: [
      "Multi-établissements & multi-sites",
      "Support des coefs modulaires du Technique",
      "Administrateurs multiples",
      "Formations personnalisées sur site",
      "Gestionnaire de compte dédié",
    ],
    cta: "Demander un Devis",
    variant: "outline" as const,
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
      
      {/* ── HERO ── */}
      <section className="relative pt-28 pb-20 overflow-hidden hero-bg">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <span className="chip chip-green mb-8 inline-flex">
            <Zap className="w-3 h-3" />
            Tarification Transparente
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-[0.95]">
            Un tarif adapté à la<br />
            <span className="gradient-text">taille de votre école.</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-10 font-medium">
            Aucun frais caché. Essai gratuit de 14 jours sans carte de crédit.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs mb-8">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                !annual ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Facturation Trimestrielle
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                annual ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Facturation Annuelle
              <span className="chip chip-green text-[9px] py-0 px-1.5">2 mois offerts</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── PRICING CARDS ── */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((p, i) => (
            <div
              key={i}
              className={`flex flex-col rounded-3xl p-8 bg-white border transition-all duration-300 relative ${
                p.popular
                  ? 'border-emerald-500 shadow-xl shadow-emerald-500/10'
                  : 'border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              {p.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 chip chip-green px-4 py-1 shadow-md">
                  ✨ Le Plus Prisé des Directeurs
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 mb-2">{p.name}</h3>
                <p className="text-xs text-slate-500 min-h-[36px] font-medium">{p.desc}</p>
              </div>

              <div className="mb-8 pt-4 border-t border-slate-100">
                <div className="text-4xl font-black text-slate-900 tracking-tight">
                  {annual ? p.priceYear : p.priceMonth}
                </div>
                <div className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">{p.period}</div>
              </div>

              <div className="space-y-3 flex-1 mb-8">
                {p.features.map((feat, j) => (
                  <div key={j} className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <Link to={`/inscription?plan=${p.key}&billing=${annual ? 'annuel' : 'trimestriel'}`}>
                <Button variant={p.variant} size="lg" className="w-full">
                  {p.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
