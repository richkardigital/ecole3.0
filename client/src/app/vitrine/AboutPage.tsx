import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { 
  GraduationCap, 
  Award, 
  Zap, 
  Users, 
  Sparkles, 
  Globe, 
  ChevronRight
} from 'lucide-react';

const TIMELINE = [
  { 
    year: '2019', 
    title: 'INCUBATION & STRUCTURATION DU PROJET SEEEC',
    desc: 'Genèse de l\'initiative et structuration stratégique du projet.'
  },
  { 
    year: '2020', 
    title: 'INCUBATION SEEDSTARS',
    desc: 'Accompagnement et accélération du projet au sein du réseau international Seedstars.'
  },
  { 
    year: '2024', 
    title: 'FORMATION RÉFÉRENT DIGITAL IGS SIMPLON',
    desc: 'Spécialisation et renforcement de l\'expertise pédagogique et technologique.'
  },
  { 
    year: '2025', 
    title: 'CONCEPTION DU MVP',
    desc: 'Développement de la première version opérationnelle de la solution LMS École 3.0.'
  },
  { 
    year: '2026', 
    title: 'PHASE PILOTE',
    desc: 'Déploiement test et validation sur le terrain auprès d\'écoles partenaires.'
  },
  { 
    year: '2027', 
    title: 'MISE EN PRODUCTION APRÈS RETOUR PHASE PILOTE',
    desc: 'Lancement officiel à grande échelle pour tous les établissements connectés.'
  },
];

const STATS = [
  { value: '25+', label: 'Écoles Partenaires', icon: GraduationCap },
  { value: '15 000+', label: 'Apprenants Actifs', icon: Users },
  { value: 'Depuis 2019', label: "d'Innovation & R&D", icon: Zap },
  { value: '8', label: 'Villes Couvertes', icon: Globe },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">

      {/* ── HERO & PRÉSENTATION ── */}
      <section className="relative pt-8 sm:pt-12 pb-10 sm:pb-14 overflow-hidden hero-bg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="chip chip-brand mb-4 inline-flex">
            <Sparkles className="w-3.5 h-3.5" />
            ONG EDUTIC-CI • Stimuler l'Excellence & l'Entrepreneuriat
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#4D3E90] mb-6 leading-[1.05]">
            À Propos d'<span className="gradient-text">École 3.0</span>
          </h1>

          {/* Vision Callout Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#189CD8]/10 border border-[#189CD8]/30 shadow-sm max-w-4xl mx-auto mb-10 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#189CD8]/20 rounded-full blur-2xl pointer-events-none" />
            <p className="text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
              « Le projet SEEEC est née d'une vision : faire de toutes les écoles connectées des établissements d’excellence pour booster la productivité des apprenants ; l’Excellence pour nous n’est pas un luxe mais une obligation. »
            </p>
          </div>

          {/* Description Content */}
          <div className="max-w-4xl mx-auto text-left space-y-6 text-slate-700 bg-white p-7 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-sm sm:text-base md:text-lg leading-relaxed font-medium">
              Conçu pour répondre aux besoins éducatifs modernes, le LMS Ecole3.0 est un outil complet et intuitif développé par l'ONG EDUTIC-CI pour stimuler l’excellence et l’entrepreneuriat à l’école connectée, qui allie technologie de pointe et rigueur pour garantir une expérience utilisateur optimale.
            </p>

            <p className="text-sm sm:text-base leading-relaxed text-slate-600">
              Que vous soyez un éducateur, un apprenant, un enseignant, un professionnel de la formation, notre LMS vous offre les outils nécessaires pour créer, gérer et suivre des cours en ligne de manière efficace.
            </p>

            <p className="text-sm sm:text-base leading-relaxed text-slate-600">
              Avec le LMS Ecole3.0, vous pouvez accéder à des fonctionnalités telles que la diffusion de cours en direct, la création de contenus interactifs, la gestion des évaluations et bien plus encore. Notre objectif est de mesurer les connaissances de vos apprenants.
            </p>

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl">
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                Pour en savoir plus sur toutes les fonctionnalités du LMS Ecole3.0 et découvrir comment il peut répondre à vos besoins éducatifs ?
              </p>
              <Link to="/fonctionnalites" className="shrink-0">
                <Button variant="primary" size="md" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Consulter le menu Fonctionnalités
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="py-6 sm:py-8 relative bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:border-[#189CD8]/40 transition-all">
                <s.icon className="w-7 h-7 text-[#189CD8] mx-auto mb-2" />
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mb-1">{s.value}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOTRE PARCOURS DEPUIS 2019 ── */}
      <section className="py-12 sm:py-16 relative overflow-hidden bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-10">
            <span className="chip chip-amber mb-3 inline-flex">
              <Award className="w-3 h-3" />
              Historique du Projet
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#4D3E90] tracking-tight leading-tight uppercase">
              NOTRE PARCOURS <span className="gradient-text">DEPUIS 2019</span>
            </h2>
          </div>

          <div className="relative">
            {/* Timeline Vertical Line */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-[2px] bg-[#189CD8]/30" />

            <div className="space-y-6">
              {TIMELINE.map((t, i) => (
                <div key={i} className="flex gap-4 sm:gap-8 items-start">
                  <div className="flex-shrink-0 w-12 sm:w-16 flex flex-col items-center gap-1.5 pt-1">
                    <div className="w-4 h-4 rounded-full bg-[#189CD8] ring-4 ring-[#189CD8]/20 relative z-10" />
                    <span className="text-xs sm:text-sm font-black text-[#1280B2] font-mono">{t.year}</span>
                  </div>

                  <div className="flex-1 pb-2">
                    <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#189CD8]/40 hover:bg-[#189CD8]/5 transition-colors shadow-xs">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mb-1">
                        {t.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                        {t.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

