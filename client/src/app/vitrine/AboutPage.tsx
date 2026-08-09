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
  { year: '2021', title: 'Naissance du Projet', desc: 'Constat du manque d\'outils numériques adaptés aux écoles ivoiriennes. Début des recherches et interviews auprès de 40 directeurs.' },
  { year: '2022', title: 'Premiers Prototypes', desc: 'Développement du module de calcul de bulletins et des premiers tests dans 5 établissements pilotes d\'Abidjan.' },
  { year: '2023', title: 'Lancement SEEEC Beta', desc: 'Ouverture du réseau SEEEC à 30 établissements partenaires avec le module de gestion des classes et des notes.' },
  { year: '2024', title: 'Réseau de 100 Écoles', desc: 'Cap des 100 établissements connectés. Lancement des fonctionnalités de messagerie et d\'agenda scolaire.' },
  { year: '2025', title: 'ÉCOLE 3.0 & 150+ Partenaires', desc: 'Refonte complète de la plateforme en ÉCOLE 3.0. Intégration des modules Quiz, Push SMS et réseau inter-lycées.' },
];

const STATS = [
  { value: '150+', label: 'Écoles Partenaires', icon: GraduationCap },
  { value: '45 000+', label: 'Élèves Gérés', icon: Users },
  { value: '4 ans', label: 'd\'Innovation', icon: Zap },
  { value: '3', label: 'Villes Couvertes', icon: Globe },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative pt-28 pb-28 overflow-hidden hero-bg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="chip chip-green mb-8 inline-flex">
            <Sparkles className="w-3 h-3" />
            Stimuler l'Excellence et l'Entrepreneuriat à l'Ecole Connectée
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-[0.95]">
            Moderniser l'éducation<br />
            <span className="gradient-text">ivoirienne.</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-10 font-medium">
            ÉCOLE 3.0 (SEEEC) est née d'une conviction simple : les établissements scolaires d'Afrique de l'Ouest méritent des outils numériques à la hauteur de leur ambition pédagogique.
          </p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-16 relative">
        <div className="divider mb-0" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <s.icon className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                <div className="text-4xl font-black text-slate-900 mb-1">{s.value}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="divider mt-0" />
      </section>

      {/* ── MISSION ── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <span className="chip chip-cyan mb-6 inline-flex">
              <BookOpen className="w-3 h-3" />
              Notre Mission
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[0.95] mb-6">
              Zéro bulletin<br />calculé à la main<br /><span className="gradient-text">d'ici 2027.</span>
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed mb-6 font-medium">
              Chaque année, des milliers d'enseignants ivoiriens passent des centaines d'heures à calculer manuellement des moyennes, trier des bulletins et coordonner des conseils de classe.
            </p>
            <p className="text-slate-600 text-base leading-relaxed font-medium">
              SEEEC est construit pour restituer ce temps aux professeurs — pour qu'ils se consacrent à ce qui compte vraiment : <strong className="text-slate-900">enseigner</strong>.
            </p>
          </div>

          {/* Values grid */}
          <div className="grid grid-cols-2 gap-4">
            {VALUES.map((v, i) => (
              <div key={i} className="feature-card p-6 bg-white border border-slate-200">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border mb-5 ${v.bg}`}>
                  <v.icon className={`w-5 h-5 ${v.color}`} />
                </div>
                <h3 className="text-sm font-black text-slate-900 mb-2 tracking-tight">{v.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className="py-24 relative overflow-hidden bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="chip chip-amber mb-6 inline-flex">
              <Award className="w-3 h-3" />
              Notre Histoire
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              5 ans pour changer<br /><span className="gradient-text">l'école africaine</span>
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-emerald-200" />

            <div className="space-y-8">
              {TIMELINE.map((t, i) => (
                <div key={i} className="flex gap-8">
                  <div className="flex-shrink-0 w-16 flex flex-col items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-100 relative z-10" />
                    <span className="text-[10px] font-black text-emerald-700">{t.year}</span>
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                      <h3 className="text-base font-black text-slate-900 mb-2 tracking-tight">{t.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">{t.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-6">
          Rejoignez le<br /><span className="gradient-text">mouvement SEEEC</span>
        </h2>
        <p className="text-xl text-slate-600 mb-10 leading-relaxed font-medium">
          Faites partie des 150+ établissements qui ont choisi de piloter leur école avec ÉCOLE 3.0.
        </p>
        <Link to="/inscription">
          <Button variant="glow" size="xl" rightIcon={<ArrowRight className="w-5 h-5" />}>
            Inscrire mon établissement
          </Button>
        </Link>
      </section>
    </div>
  );
}
