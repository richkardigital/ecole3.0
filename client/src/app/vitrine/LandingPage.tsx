import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  ArrowRight, Sparkles, BookOpen, Users, Shield, MessageCircle,
  BarChart3, CheckCircle2, Award, Zap, Building2, ChevronRight,
  FileText, Network, Clock, Star, GraduationCap, TrendingUp
} from 'lucide-react';

const FEATURES_BENTO = [
  {
    title: "Bulletins Automatisés",
    desc: "Calculs de moyennes pondérées, rangs et appréciations générés automatiquement. Export PDF officiel prêt à imprimer en 1 clic.",
    icon: FileText,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 border-emerald-200",
    colSpan: "lg:col-span-2",
    tag: "🏆 Fonctionnalité #1",
    tagClass: "chip-green",
  },
  {
    title: "Rôles & Sécurité",
    desc: "Portails distincts pour Directeur, Éducateur, Enseignant et Élève avec permissions granulaires et audit complet.",
    icon: Shield,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50 border-violet-200",
    colSpan: "",
  },
  {
    title: "Gestion des Classes",
    desc: "Créez vos niveaux, affectez vos enseignants et suivez vos effectifs en temps réel.",
    icon: GraduationCap,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50 border-sky-200",
    colSpan: "",
  },
  {
    title: "Messagerie & Annonces Flash",
    desc: "Messagerie interne sécurisée et diffusion d'annonces instantanées à toute l'école ou par niveau.",
    icon: MessageCircle,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50 border-amber-200",
    colSpan: "",
  },
  {
    title: "Réseau Inter-Écoles SEEEC",
    desc: "Connectez-vous au réseau des 150+ établissements partenaires pour partager épreuves, ressources et bonnes pratiques.",
    icon: Network,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 border-emerald-200",
    colSpan: "lg:col-span-2",
    tag: "🌐 Exclusif SEEEC",
    tagClass: "chip-green",
  },
];

const STATS = [
  { value: '150+', label: 'Écoles partenaires', icon: Building2, color: 'text-emerald-600' },
  { value: '45 000+', label: 'Élèves gérés', icon: Users, color: 'text-sky-600' },
  { value: '120h', label: 'Gagnées / trimestre', icon: Clock, color: 'text-amber-600' },
  { value: '99.2%', label: 'Satisfaction directeurs', icon: Star, color: 'text-violet-600' },
];

const STEPS = [
  { n: '01', title: 'Inscrivez votre école', desc: 'Créez votre compte Directeur en 2 minutes et sélectionnez votre type d\'enseignement.' },
  { n: '02', title: 'Configurez vos classes', desc: 'Importez ou créez vos niveaux (CM2, 6ème, Tle...) et affectez vos enseignants.' },
  { n: '03', title: 'Pilotez & Éditez', desc: 'Suivez vos effectifs et générez des bulletins officiels sans aucune erreur.' },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] overflow-x-hidden">

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden hero-bg">
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 shadow-xs animate-fade-in"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              ÉCOLE 3.0 — Plateforme Éducative SEEEC
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-slate-900 leading-[0.95] mb-8">
            Digitalisez votre école.<br />
            <span className="gradient-text">Sans effort.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-12 font-medium">
            La solution tout-en-un conçue pour les directeurs et enseignants d'Afrique de l'Ouest. Bulletins automatiques, gestion des classes et réseau inter-écoles SEEEC.
          </p>

          {/* CTA Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/inscription">
              <Button variant="glow" size="xl" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Inscrire mon établissement
              </Button>
            </Link>
            <Link to="/fonctionnalites">
              <Button variant="outline" size="xl" leftIcon={<BookOpen className="w-5 h-5" />}>
                Découvrir les fonctionnalités
              </Button>
            </Link>
          </div>

          {/* Micro Trust Badge */}
          <div className="flex items-center justify-center gap-6 text-xs font-bold text-slate-500 flex-wrap">
            {['14 jours d\'essai gratuit', 'Conforme aux standards MENA', 'Support WhatsApp & Téléphone'].map((item, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── MOCKUP APP PREVIEW ── */}
        <div className="mt-16 w-full max-w-6xl mx-auto px-4 relative z-10">
          <div className="rounded-3xl p-3 sm:p-4"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 24px 60px -10px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.05)',
            }}>
            {/* Top browser bar */}
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl mb-4"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="text-[11px] font-bold text-slate-500 px-4 py-1 rounded-lg"
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                🔒 app.ecole3-seeec.ci/dashboard
              </div>
              <div className="chip chip-green text-[10px]">🟢 Direct & Connecté</div>
            </div>

            {/* Mockup content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl" style={{ background: '#F8FAFC' }}>
              
              {/* Stat Card 1 */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Effectif Total</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">1248</div>
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">1 248</div>
                <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +12% cette année
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bulletins T1</span>
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">100%</div>
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">100%</div>
                <div className="text-xs text-sky-600 font-bold">Générés & Validés</div>
              </div>

              {/* Stat Card 3 */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Réseau SEEEC</span>
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs">150+</div>
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">150+</div>
                <div className="text-xs text-violet-600 font-bold">Écoles Interconnectées</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── STATS BAR ───────────────────────── */}
      <section className="py-16 relative">
        <div className="divider mb-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <s.icon className={`w-8 h-8 ${s.color} mx-auto mb-3`} />
                <div className="text-4xl font-black text-slate-900 mb-1">{s.value}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="divider mt-0" />
      </section>

      {/* ───────────────────────── BENTO FEATURES ───────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="chip chip-green mb-4 inline-flex">
            <Zap className="w-3 h-3" />
            Tout Ce Dont Votre École A Besoin
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Pensé pour simplifier la vie de<br />
            <span className="gradient-text">toute l'équipe éducative</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES_BENTO.map((f, i) => (
            <div key={i} className={`feature-card p-8 flex flex-col justify-between ${f.colSpan}`}>
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${f.iconBg}`}>
                    <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                  </div>
                  {f.tag && <span className={`chip ${f.tagClass}`}>{f.tag}</span>}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{f.desc}</p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer group">
                En savoir plus <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── HOW IT WORKS ───────────────────────── */}
      <section className="py-24 relative overflow-hidden bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="chip chip-cyan mb-4 inline-flex">
              <Clock className="w-3 h-3" />
              Prise En Main En 3 Étapes
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Opérationnel en <span className="gradient-text">moins de 5 minutes</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors">
                <div className="text-5xl font-black text-emerald-600/30 mb-6 font-mono">{s.n}</div>
                <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── CTA SECTION ───────────────────────── */}
      <section className="py-28 max-w-5xl mx-auto px-4 text-center relative">
        <div className="rounded-3xl p-12 md:p-16 relative overflow-hidden bg-white border border-slate-200 shadow-xl">
          <div className="relative z-10">
            <span className="chip chip-green mb-6 inline-flex">
              <Award className="w-3 h-3" />
              Rejoignez Les 150+ Écoles Partenaires
            </span>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-6">
              Prêt à faire passer votre<br />
              <span className="gradient-text">école à l'ère 3.0 ?</span>
            </h2>
            <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto font-medium">
              Inscrivez votre établissement aujourd'hui. Aucune carte bancaire requise. Configuration immédiate.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/inscription">
                <Button variant="glow" size="xl" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Créer le compte de mon école
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
