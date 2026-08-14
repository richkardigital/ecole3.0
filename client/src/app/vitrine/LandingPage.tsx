import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  ArrowRight, Sparkles, BookOpen, Users, Shield, MessageCircle,
  BarChart3, CheckCircle2, Award, Zap, Building2, ChevronRight,
  FileText, Network, Clock, Star, GraduationCap, TrendingUp,
  UserCheck, UserPlus, HeartHandshake, ShieldCheck, Laptop,
  HelpCircle, ArrowRightLeft, Check, Layers, PhoneCall, Globe
} from 'lucide-react';

const FEATURES_BENTO = [
  {
    title: "Bulletins Automatisés & Zéro Erreur",
    desc: "Calculs instantanés des moyennes pondérées par coefficient, rangs, moyennes de classe et appréciations. Export PDF officiel prêt à imprimer en 1 clic.",
    icon: FileText,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 border-emerald-200",
    colSpan: "lg:col-span-2",
    tag: "🏆 Fonctionnalité #1",
    tagClass: "chip-green",
  },
  {
    title: "Supervision & Gestion des Classes",
    desc: "Création des classes (ex: 6ème A, 4ème B), suivi des effectifs en direct et affectation complète des enseignants avec toutes leurs matières enseignées.",
    icon: GraduationCap,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50 border-purple-200",
    colSpan: "",
    tag: "Nouveau",
    tagClass: "chip-violet",
  },
  {
    title: "Migration & Transfert d'Élèves Sécurisé",
    desc: "Transférez vos élèves d'une classe à une autre pour l'année scolaire sans doublon et sans suppression de compte. Données et historiques 100% préservés.",
    icon: ArrowRightLeft,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50 border-sky-200",
    colSpan: "",
  },
  {
    title: "Programmes & Cours Officiels par Niveau",
    desc: "Accédez aux cours structurés par niveau et matières, chapitres interactifs, devoirs et suivi de progression des apprenants.",
    icon: BookOpen,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50 border-indigo-200",
    colSpan: "",
  },
  {
    title: "Réseau Inter-Écoles SEEEC & Épreuves",
    desc: "Mutualisez vos ressources pédagogiques avec plus de 150+ établissements partenaires : banques d'épreuves, fiches de révision et forum national.",
    icon: Network,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 border-emerald-200",
    colSpan: "lg:col-span-2",
    tag: "🌐 SEEEC Platform",
    tagClass: "chip-green",
  },
  {
    title: "Espaces Dédiés & Permissions Sécurisées",
    desc: "Portails distincts et personnalisés pour Directeurs, Éducateurs, Enseignants, Élèves et Parents avec conformité stricte aux standards MENA.",
    icon: ShieldCheck,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50 border-amber-200",
    colSpan: "",
  },
];

const AUDIENCE_BENEFITS = [
  {
    role: "Directeurs & Fondateurs",
    subtitle: "Maîtrisez toute votre école d'un seul coup d'œil",
    badge: "Espace Direction",
    badgeClass: "chip-violet",
    icon: Building2,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50 border-purple-200",
    points: [
      "Édition et validation des bulletins trimestriels en 1 clic sans risque d'erreur de calcul",
      "Gestion des classes, effectifs d'élèves et affectation des professeurs par matière",
      "Migration fluide des élèves d'une classe à l'autre pour l'année académique active",
      "Tableau de bord de pilotage, annonces flash et suivi des abonnements"
    ]
  },
  {
    role: "Enseignants & Professeurs",
    subtitle: "Gagnez des dizaines d'heures chaque trimestre",
    badge: "Espace Enseignant",
    badgeClass: "chip-green",
    icon: BookOpen,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50 border-emerald-200",
    points: [
      "Saisie ultra-rapide des notes avec coefficients automatiques et calculs en temps réel",
      "Affichage clair de toutes vos classes et de toutes vos matières assignées",
      "Création de devoirs de niveau, exercices et corrections individualisées",
      "Accès à la Librairie 3.0 et aux épreuves partagées du réseau SEEEC"
    ]
  },
  {
    role: "Éducateurs & Vie Scolaire",
    subtitle: "Discipline, présences et sérénité de l'établissement",
    badge: "Espace Vie Scolaire",
    badgeClass: "chip-cyan",
    icon: ShieldCheck,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50 border-sky-200",
    points: [
      "Registre numérique des absences et retards par cours ou par créneau",
      "Édition des bulletins de conduite, sanctions et mentions disciplinaires",
      "Supervision des classes affectées et consultation des registres d'élèves",
      "Diffusion instantanée des annonces de vie scolaire à toute l'école"
    ]
  },
  {
    role: "Parents d'Élèves",
    subtitle: "Suivez la scolarité de vos enfants en toute sérénité",
    badge: "Espace Parents",
    badgeClass: "chip-amber",
    icon: Users,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50 border-amber-200",
    points: [
      "Consultation en direct des notes, moyennes et bulletins dès leur validation",
      "Alertes instantanées en cas d'absence ou de retard notifié par la vie scolaire",
      "Messagerie directe avec l'école et suivi des actualités & communiqués",
      "Suivi de plusieurs enfants depuis un compte parent unique et centralisé"
    ]
  },
  {
    role: "Élèves & Apprenants",
    subtitle: "Révisez, progressez et réussissez votre année",
    badge: "Espace Apprenant",
    badgeClass: "chip-violet",
    icon: GraduationCap,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50 border-indigo-200",
    points: [
      "Accès aux cours et chapitres officiels de votre niveau (6ème à Terminale)",
      "Remise des devoirs en ligne, quiz chronométrés et corrections immédiates",
      "Suivi de votre agenda scolaire, dates des compositions et examens",
      "Bibliothèque numérique, forum d'entraide et ressources partagées"
    ]
  },
  {
    role: "Super Admin & Réseau SEEEC",
    subtitle: "Gouvernance globale et interconnexion nationale",
    badge: "Espace Super Admin",
    badgeClass: "chip-rose",
    icon: Network,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50 border-rose-200",
    points: [
      "Administration multi-établissements (Général, Technique, Mixte)",
      "Paramétrage national des années académiques, niveaux et matières officielles",
      "Mutualisation sécurisée de banques d'épreuves et ressources entre 150+ écoles",
      "Reporting analytique global et gestion des licences du réseau"
    ]
  }
];

const STATS = [
  { value: '25+', label: 'Établissements Connectés', icon: Building2, color: 'text-emerald-600' },
  { value: '15 000+', label: 'Élèves & Apprenants', icon: Users, color: 'text-sky-600' },
  { value: '2 ans', label: "Années d'Innovation", icon: Sparkles, color: 'text-amber-600' },
  { value: '8', label: 'Villes Couvertes', icon: Globe, color: 'text-purple-600' },
];

const STEPS = [
  { n: '01', title: 'Inscrivez votre école', desc: 'Créez votre compte Directeur en 2 minutes et sélectionnez votre type d\'enseignement (Général, Technique ou Mixte).' },
  { n: '02', title: 'Configurez vos classes & profs', desc: 'Créez vos classes (6ème A, 4ème B...), inscrivez vos élèves et affectez vos enseignants avec leurs matières.' },
  { n: '03', title: 'Générez vos bulletins en 1 clic', desc: 'Saisissez les notes et générez automatiquement des bulletins officiels conformes, prêts pour l\'impression PDF.' },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] overflow-x-hidden">

      {/* ───────────────────────── HERO SECTION (2 COLUMNS RESPONSIVE) ───────────────────────── */}
      <section className="relative flex items-center justify-center pt-4 sm:pt-6 pb-0 lg:pt-8 lg:pb-0 overflow-hidden hero-bg">
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-end">
            
            {/* ── LEFT COLUMN : Texte & Arguments & Call-to-Actions ── */}
            <div className="lg:col-span-6 xl:col-span-6 text-left py-4 sm:py-6 lg:py-8 self-center">
              
              {/* Top Pill with SEEEC Platform */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-4 shadow-xs animate-fade-in bg-white border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  ÉCOLE 3.0 — SEEEC Platform
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.05] mb-4">
                Digitalisez votre école.<br />
                <span className="gradient-text">Pilotez sans erreur.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6 font-medium max-w-xl">
                La solution tout-en-un de référence conçue pour les <strong>Directeurs</strong>, <strong>Enseignants</strong>, <strong>Parents</strong> et <strong>Élèves</strong>. Bulletins automatiques certifiés, gestion complète des classes, affectations des professeurs et réseau national SEEEC Platform.
              </p>

              {/* CTA Group */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                <Link to="/inscription">
                  <Button variant="glow" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />} className="w-full sm:w-auto shadow-lg shadow-emerald-500/20">
                    Inscrire mon école
                  </Button>
                </Link>
                <Link to="/fonctionnalites">
                  <Button variant="outline" size="lg" leftIcon={<BookOpen className="w-5 h-5" />} className="w-full sm:w-auto bg-white hover:bg-slate-50">
                    Découvrir les fonctionnalités
                  </Button>
                </Link>
              </div>

              {/* Micro Trust Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Déploiement rapide & sans engagement</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Conforme aux normes MENA</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bulletins & calculs 100% certifiés</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Assistance WhatsApp & Téléphone</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN : Image Hero Intégrée & Fondu Épuré vers la Section Suivante ── */}
            <div className="lg:col-span-6 xl:col-span-6 flex items-end justify-center relative self-end pt-2">
              <div className="relative w-full max-w-xl lg:max-w-none flex justify-center items-end -mb-1">
                {/* Aura lumineuse subtile */}
                <div className="absolute bottom-6 w-96 h-96 bg-gradient-to-tr from-emerald-400/20 to-sky-400/20 rounded-full blur-3xl pointer-events-none" />

                {/* Badge flottant 1 : Zéro Erreur */}
                <div className="absolute top-6 left-2 sm:left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-900/5 flex items-center gap-2 animate-bounce-gentle">
                  <div className="w-6 h-6 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-[11px]">
                    100%
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black text-slate-900 leading-tight">Bulletins Conformes</p>
                    <p className="text-[9px] text-slate-500 font-semibold">Normes MENA certifiées</p>
                  </div>
                </div>

                {/* Badge flottant 2 : Réseau SEEEC */}
                <div className="absolute top-20 right-0 sm:right-2 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-900/5 items-center gap-2 animate-float hidden sm:flex">
                  <div className="w-6 h-6 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-black text-slate-900 leading-tight">Réseau Connecté</p>
                    <p className="text-[9px] text-slate-500 font-semibold">25+ Établissements</p>
                  </div>
                </div>

                {/* Image avec taille augmentée en hauteur, ancrage au bas et masque dégradé */}
                <img 
                  src="/images/hero-header.png" 
                  alt="École 3.0 — SEEEC Platform" 
                  className="w-full h-auto max-h-[580px] sm:max-h-[640px] lg:max-h-[700px] xl:max-h-[760px] object-contain drop-shadow-2xl select-none pointer-events-none transition-transform duration-500 hover:scale-[1.01]"
                  style={{
                    maskImage: 'linear-gradient(to bottom, black 0%, black 86%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 86%, transparent 100%)'
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ───────────────────────── STATS BAR ───────────────────────── */}
      <section className="py-8 sm:py-10 relative bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
                <s.icon className={`w-7 h-7 ${s.color} mx-auto mb-2`} />
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mb-1">{s.value}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── AUDIENCE VALUE PROPOSITIONS ───────────────────────── */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="chip chip-green mb-3 inline-flex">
            <Users className="w-3.5 h-3.5" />
            Une Solution Taillée Pour Chaque Acteur
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Pourquoi choisir <span className="gradient-text">École 3.0</span> dès aujourd'hui ?
          </h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base font-medium">
            Découvrez les bénéfices concrets pour l'ensemble de votre communauté scolaire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {AUDIENCE_BENEFITS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${item.iconBg}`}>
                      <Icon className={`w-6 h-6 ${item.iconColor}`} />
                    </div>
                    <span className={`chip ${item.badgeClass} text-xs font-bold`}>
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">{item.role}</h3>
                  <p className="text-xs font-semibold text-emerald-600 mb-6">{item.subtitle}</p>

                  <div className="space-y-3">
                    {item.points.map((pt, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <Link to="/inscription" className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Accéder à cet espace <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── BENTO FEATURES ───────────────────────── */}
      <section className="py-12 sm:py-16 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3 inline-flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              Fonctionnalités Clés & Récentes
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight text-white">
              Une technologie puissante au service de<br />
              <span className="text-emerald-400">l'excellence académique</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {FEATURES_BENTO.map((f, i) => (
              <div 
                key={i} 
                className={`p-6 sm:p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between ${f.colSpan}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900 border border-slate-700">
                      <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                    </div>
                    {f.tag && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {f.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mb-2 tracking-tight">{f.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">{f.desc}</p>
                </div>
                <div className="pt-5 mt-5 border-t border-slate-700/60 flex items-center text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer group">
                  <Link to="/fonctionnalites" className="flex items-center gap-1">
                    En savoir plus <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── HOW IT WORKS ───────────────────────── */}
      <section className="py-12 sm:py-16 relative overflow-hidden bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="chip chip-cyan mb-3 inline-flex">
              <Clock className="w-3 h-3" />
              Prise En Main Facile & Rapide
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Opérationnel en <span className="gradient-text">moins de 5 minutes</span>
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base font-medium">
              Aucune installation complexe. Accédez à votre espace depuis n'importe quel ordinateur, tablette ou smartphone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-colors relative">
                <div className="text-4xl sm:text-5xl font-black text-emerald-600/20 mb-4 font-mono">{s.n}</div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 tracking-tight">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── CTA SECTION ───────────────────────── */}
      <section className="py-10 sm:py-14 max-w-5xl mx-auto px-4 text-center relative">
        <div className="rounded-3xl p-8 sm:p-12 md:p-14 relative overflow-hidden bg-white border border-slate-200 shadow-2xl">
          <div className="relative z-10">
            <span className="chip chip-green mb-4 inline-flex">
              <Award className="w-3.5 h-3.5" />
              Rejoignez Plus De 25 Établissements Connectés
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.05] mb-4">
              Prêt à faire passer votre école à l'ère <span className="gradient-text">3.0 ?</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mb-8 max-w-2xl mx-auto font-medium leading-relaxed">
              Inscrivez votre établissement dès aujourd'hui et bénéficiez d'une mise en service immédiate avec accompagnement personnalisé.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/inscription">
                <Button variant="glow" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />} className="shadow-lg shadow-emerald-500/20">
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
