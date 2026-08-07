import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Sparkles, Zap, Building2, ShieldCheck, HelpCircle } from 'lucide-react';
import api from '@/lib/api';

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get('/subscriptions'); // Retrieves active plans only
        setPlans(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

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
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-slate-500 font-medium">Chargement des abonnements...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {plans.map((plan, i) => {
                // Dynamically determine popular status or variant
                const isPopular = plan.price > 0 && plan.price <= 50000;
                const ctaText = plan.price === 0 ? "Tester Gratuitement" : plan.price > 0 ? `Choisir ${plan.name}` : "Demander un Devis";
                
                return (
                  <div 
                    key={plan.id}
                    className={`relative rounded-3xl p-8 border ${
                      isPopular 
                        ? 'bg-slate-900 border-slate-900 shadow-2xl scale-105 z-10' 
                        : 'bg-white border-slate-200 shadow-xl'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-0 right-0 flex justify-center">
                        <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Le plus choisi
                        </span>
                      </div>
                    )}
  
                    <h3 className={`text-xl font-black mb-2 ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm mb-6 ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
                      {plan.description}
                    </p>
  
                    <div className="mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black ${isPopular ? 'text-white' : 'text-slate-900'}`}>
                          {plan.price === 0 ? "Gratuit" : `${plan.price} FCFA`}
                        </span>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${isPopular ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {plan.period}
                      </span>
                    </div>
  
                    <Link to={`/register-school?plan=${plan.planKey}&billing=${annual ? 'annuel' : 'trimestriel'}`} className="block w-full">
                      <Button 
                        variant={isPopular ? 'default' : 'outline'} 
                        className={`w-full ${isPopular ? '' : 'border-slate-200 text-slate-700 hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {ctaText}
                      </Button>
                    </Link>
  
                    <div className="mt-8 space-y-4">
                      <p className={`text-[10px] font-black uppercase tracking-wider ${isPopular ? 'text-slate-400' : 'text-slate-400'}`}>
                        Inclus dans ce plan
                      </p>
                      {plan.features.map((feat: string, j: number) => (
                        <div key={j} className="flex items-start gap-3">
                          <CheckCircle2 className={`w-5 h-5 shrink-0 ${isPopular ? 'text-emerald-400' : 'text-emerald-500'}`} />
                          <span className={`text-sm font-medium ${isPopular ? 'text-slate-300' : 'text-slate-600'}`}>
                            {feat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </section>
    </div>
  );
}
