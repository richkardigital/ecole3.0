import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { GraduationCap, Award, ShieldCheck, HeartHandshake, Zap, Target, Users, ArrowRight, Sparkles, Globe, BookOpen } from 'lucide-react';

const VALUES = [
  { icon: Zap, title: 'Innovation Accessible', desc: 'Des outils technologiques de pointe adaptés aux réalités du système éducatif africain.', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { icon: ShieldCheck, title: 'Sécurité & Intégrité', desc: 'La protection des données des élèves et des bulletins est notre priorité absolue.', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  { icon: HeartHandshake, title: 'Inclusion & Équité', desc: 'Connecter enseignants, directeurs, parents et apprenants pour une transparence totale.', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  { icon: Target, title: 'Excellence Pédagogique', desc: 'Digitaliser sans altérer la rigueur des programmes officiels et des examens nationaux.', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
];

const TIMELINE = [
  { year: '2024', title: 'Naissance du Projet & R&D', desc: 'Recherche et développement auprès d\'enseignants et directeurs pour concevoir un moteur de bulletins 100% conforme MENA.' },
  { year: '2025', title: 'Déploiement ÉCOLE 3.0', desc: 'Lancement officiel de la plateforme unifiée, adoption par plus de 25 établissements et gestion de 15 000+ élèves.' },
  { year: '2026', title: 'Expansion SEEEC Platform', desc: 'Interconnexion inter-établissements, mutualisation de banques d\'épreuves et couverture de 8 villes.' },
];

const STATS = [
  { value: '25+', label: 'Écoles Partenaires', icon: GraduationCap },
  { value: '15 000+', label: 'Élèves & Apprenants', icon: Users },
  { value: '2 ans', label: "d'Innovation & R&D", icon: Zap },
  { value: '8', label: 'Villes Couvertes', icon: Globe },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative pt-8 sm:pt-12 pb-6 sm:pb-8 overflow-hidden hero-bg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="chip chip-green mb-4 inline-flex">
            <Sparkles className="w-3 h-3" />
            Stimuler l'Excellence et l'Entrepreneuriat à l'École Connectée
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter text-slate-900 mb-4 leading-[1.05]">
            Moderniser l'éducation<br />
            <span className="gradient-text">ivoirienne.</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-6 font-medium">
            ÉCOLE 3.0 (SEEEC) est née d'une conviction simple : les établissements scolaires méritent des outils numériques performants à la hauteur de leur ambition pédagogique.
          </p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-6 sm:py-8 relative bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
                <s.icon className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mb-1">{s.value}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <span className="chip chip-cyan mb-4 inline-flex">
              <BookOpen className="w-3 h-3" />
              Notre Mission
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-[1.05] mb-4">
              Zéro bulletin<br />calculé à la main<br /><span className="gradient-text">d'ici 2027.</span>
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4 font-medium">
              Chaque année, des milliers d'enseignants ivoiriens passent des centaines d'heures à calculer manuellement des moyennes, trier des bulletins et coordonner des conseils de classe.
            </p>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
              SEEEC est construit pour restituer ce temps aux professeurs — pour qu'ils se consacrent à ce qui compte vraiment : <strong className="text-slate-900">enseigner et transmettre</strong>.
            </p>
          </div>

          {/* Values grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUES.map((v, i) => (
              <div key={i} className="feature-card p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 ${v.bg}`}>
                  <v.icon className={`w-5 h-5 ${v.color}`} />
                </div>
                <h3 className="text-sm font-black text-slate-900 mb-1.5 tracking-tight">{v.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className="py-12 sm:py-16 relative overflow-hidden bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <span className="chip chip-amber mb-3 inline-flex">
              <Award className="w-3 h-3" />
              Notre Parcours
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              L'innovation continue au service de<br /><span className="gradient-text">l'école africaine</span>
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-emerald-200" />

            <div className="space-y-6">
              {TIMELINE.map((t, i) => (
                <div key={i} className="flex gap-6 sm:gap-8">
                  <div className="flex-shrink-0 w-16 flex flex-col items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-100 relative z-10" />
                    <span className="text-xs font-black text-emerald-700">{t.year}</span>
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1 tracking-tight">{t.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{t.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-10 sm:py-14 max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[1.05] mb-4">
          Rejoignez le<br /><span className="gradient-text">mouvement SEEEC</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mb-8 leading-relaxed font-medium max-w-xl mx-auto">
          Faites partie des 25+ établissements qui ont choisi de piloter leur école avec l'excellence ÉCOLE 3.0.
        </p>
        <Link to="/inscription">
          <Button variant="glow" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />} className="shadow-lg shadow-emerald-500/20">
            Inscrire mon établissement
          </Button>
        </Link>
      </section>
    </div>
  );
}

