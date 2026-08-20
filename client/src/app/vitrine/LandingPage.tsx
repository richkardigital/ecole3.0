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
    title: "Bulletins Automatisés",
    desc: "Calculs instantanés des moyennes pondérées par coefficient, rangs, moyennes de classe et appréciations. Export PDF officiel prêt à imprimer en 1 clic.",
    icon: FileText,
    iconColor: "text-[#189CD8]",
    iconBg: "bg-[#189CD8]/10 border-[#189CD8]/25",
    tag: "🏆 Conforme MENA",
  },
  {
    title: "Supervision des Classes",
    desc: "Création des structures de classes de la 6ème à la Terminale, suivi en temps réel des effectifs d'apprenants et affectation précise des enseignants par matière.",
    icon: GraduationCap,
    iconColor: "text-[#4D3E90]",
    iconBg: "bg-[#4D3E90]/10 border-[#4D3E90]/25",
    tag: "Multi-Filières",
  },
  {
    title: "Migration d'Apprenants",
    desc: "Transférez vos apprenants d'une classe à une autre pour l'année scolaire active sans doublon ni perte de notes. Données et historiques 100% préservés.",
    icon: ArrowRightLeft,
    iconColor: "text-[#189CD8]",
    iconBg: "bg-[#189CD8]/10 border-[#189CD8]/25",
    tag: "Sécurisé",
  },
  {
    title: "Gestion des Cours",
    desc: "Espace pédagogique multimédia structuré par niveau et matière : déposez et consultez cours textuels, documents PDF, vidéos et fiches synthétiques.",
    icon: BookOpen,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/10 border-indigo-500/25",
    tag: "Multimédia",
  },
  {
    title: "Évaluations & Devoirs",
    desc: "Devoirs de classe notés, devoirs maison, exercices d'entraînement et devoirs de niveau harmonisés par le Super Admin avec barèmes et corrections.",
    icon: Award,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/25",
    tag: "Pédagogie",
  },
  {
    title: "Cartes Scolaires QR Code",
    desc: "Génération et validation centralisée des cartes scolaires officielles par le Super Admin avec QR Code sécurisé et téléchargeables par les apprenants.",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/25",
    tag: "Officiel",
  },
  {
    title: "Registre des Absences",
    desc: "Pointage numérique en temps réel des présences, retards et justifications par heure de cours avec report automatique du cumul sur le bulletin trimestriel.",
    icon: Clock,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/25",
    tag: "Vie Scolaire",
  },
  {
    title: "Réseau Inter-Écoles 3.0",
    desc: "Mutualisez vos ressources pédagogiques avec plus de 150+ établissements partenaires : banques d'épreuves officielles, annales corrigées et forum national.",
    icon: Network,
    iconColor: "text-[#189CD8]",
    iconBg: "bg-[#189CD8]/10 border-[#189CD8]/25",
    tag: "SEEEC Network",
  },
];

const AUDIENCE_BENEFITS = [
  {
    role: "Directeurs & Fondateurs",
    subtitle: "Maîtrisez toute votre école d'un seul coup d'œil",
    badge: "Espace Direction",
    badgeClass: "chip-violet",
    icon: Building2,
    iconColor: "text-[#4D3E90]",
    iconBg: "bg-[#4D3E90]/10 border-[#4D3E90]/25",
    points: [
      "Édition et validation des bulletins trimestriels en 1 clic sans risque d'erreur de calcul",
      "Gestion des classes, effectifs d'apprenants et affectation des professeurs par matière",
      "Migration fluide des apprenants d'une classe à l'autre pour l'année académique active",
      "Tableau de bord de pilotage, validation des cartes et suivi des abonnements"
    ]
  },
  {
    role: "Enseignants",
    subtitle: "Gagnez des dizaines d'heures chaque trimestre",
    badge: "Espace Enseignant",
    badgeClass: "chip-brand",
    icon: BookOpen,
    iconColor: "text-[#189CD8]",
    iconBg: "bg-[#189CD8]/10 border-[#189CD8]/25",
    points: [
      "Saisie ultra-rapide des notes avec coefficients automatiques et calculs en temps réel",
      "Création de devoirs de classe notés, devoirs maison et exercices d'entraînement",
      "Aperçu et notation des devoirs de niveau et compositions créés par le Super Admin",
      "Accès à la Librairie 3.0 et aux épreuves partagées du réseau SEEEC"
    ]
  },
  {
    role: "Éducateurs",
    subtitle: "Discipline, présences et sérénité de l'établissement",
    badge: "Espace Vie Scolaire",
    badgeClass: "chip-cyan",
    icon: ShieldCheck,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50 border-sky-200",
    points: [
      "Registre numérique des absences et retards par cours ou par créneau",
      "Édition des bulletins de conduite, sanctions et mentions disciplinaires",
      "Supervision des classes affectées et consultation des registres des apprenants",
      "Diffusion instantanée des annonces de vie scolaire à toute l'école"
    ]
  },
  {
    role: "Parents d'Apprenants",
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
      "Suivi de plusieurs apprenants depuis un compte parent unique et centralisé"
    ]
  },
  {
    role: "Apprenants",
    subtitle: "Révisez, progressez et réussissez votre année",
    badge: "Espace Apprenant",
    badgeClass: "chip-violet",
    icon: GraduationCap,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50 border-indigo-200",
    points: [
      "Accès aux cours et chapitres officiels de votre niveau (6ème à Terminale)",
      "Remise des devoirs en ligne, quiz chronométrés et consultation des corrigés",
      "Carte scolaire numérique certifiée avec QR Code officiel téléchargeable",
      "Bibliothèque numérique, forum d'entraide et ressources partagées"
    ]
  },
  {
    role: "Super Admin",
    subtitle: "Gouvernance globale et interconnexion nationale",
    badge: "Espace Super Admin",
    badgeClass: "chip-rose",
    icon: Network,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50 border-rose-200",
    points: [
      "Administration multi-établissements (Général, Technique, Mixte)",
      "Création et harmonisation des devoirs de niveau et examens blancs nationaux",
      "Validation centralisée des cartes scolaires des apprenants pour tout le réseau",
      "Mutualisation sécurisée de banques d'épreuves et ressources entre 150+ écoles"
    ]
  }
];

const STATS = [
  { value: '25+', label: 'Établissements Connectés', icon: Building2, color: 'text-[#189CD8]' },
  { value: '15 000+', label: 'Apprenants Actifs', icon: Users, color: 'text-[#4D3E90]' },
  { value: '2 ans', label: "Années d'Innovation", icon: Sparkles, color: 'text-amber-600' },
  { value: '8', label: 'Villes Couvertes', icon: Globe, color: 'text-indigo-600' },
];

const STEPS = [
  { n: '01', title: 'Inscrivez votre école', desc: 'Créez votre compte Directeur en 2 minutes et sélectionnez votre type d\'enseignement (Général, Technique ou Mixte).' },
  { n: '02', title: 'Configurez vos classes & profs', desc: 'Créez vos classes (6ème A, 4ème B...), inscrivez vos apprenants et affectez vos enseignants avec leurs matières.' },
  { n: '03', title: 'Générez vos bulletins en 1 clic', desc: 'Saisissez les notes et générez automatiquement des bulletins officiels conformes, prêts pour l\'impression PDF.' },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] overflow-x-hidden">

      {/* ───────────────────────── HERO SECTION (2 COLUMNS RESPONSIVE) ───────────────────────── */}
      <section className="relative flex items-center justify-center pt-4 sm:pt-6 pb-0 lg:pt-8 lg:pb-0 overflow-hidden hero-bg">
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#4D3E90]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#189CD8]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-end">
            
            {/* ── LEFT COLUMN : Texte & Arguments & Call-to-Actions ── */}
            <div className="lg:col-span-6 xl:col-span-6 text-left py-4 sm:py-6 lg:py-8 self-center">
            

              {/* Main Headline */}
              <h1 className="text-2xl sm:text-3xl md:text-[2.2rem] lg:text-[2.4rem] xl:text-[2.75rem] font-black tracking-tight text-[#4D3E90] leading-[1.18] mb-4">
                <span className="block sm:whitespace-nowrap">École 3.0, Le LMS pour stimuler</span>
                <span className="gradient-text block sm:whitespace-nowrap">l'Excellence à l'école.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6 font-medium max-w-xl">
                Un LMS (Learning Management System) offre de nombreux avantages pour la formation et la gestion des connaissances au sein d’une école.<br className="hidden sm:block" />
                Un outil conçu pour les <strong>Directeurs d’étude</strong>, <strong>Enseignants</strong>, <strong>Parents</strong> et <strong>Apprenants</strong>. Bulletins automatisés, gestion complète des classes, banque des meilleurs sujets avec corrigés, accès aux ressources des écoles connectées.
              </p>

              {/* CTA Group */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                <Link to="/inscription">
                  <Button variant="glow" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />} className="w-full sm:w-auto">
                    Inscrire mon école
                  </Button>
                </Link>
                <Link to="/fonctionnalites">
                  <Button variant="outline" size="lg" leftIcon={<BookOpen className="w-5 h-5" />} className="w-full sm:w-auto bg-white hover:bg-slate-50">
                    Voir les fonctionnalités
                  </Button>
                </Link>
              </div>
 
            </div>

            {/* ── RIGHT COLUMN : Image Hero cover.gif épurée sans bordure ── */}
            <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center relative py-2 lg:py-4">
              <div className="w-full flex justify-center items-center">
                <img 
                  src="/images/banner.gif" 
                  alt="École 3.0 — LMS pour stimuler l'Excellence" 
                  className="w-full h-auto max-h-[520px] sm:max-h-[580px] lg:max-h-[620px] object-contain rounded-2xl select-none"
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
              <div key={i} className="text-center p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs hover:border-[#189CD8]/40 transition-all">
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
          <span className="chip chip-brand mb-3 inline-flex">
            <Users className="w-3.5 h-3.5" />
            Une Solution Taillée Pour Chaque Acteur
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#4D3E90] tracking-tight leading-tight">
            Pourquoi choisir <span className="gradient-text">École 3.0</span> dès aujourd'hui ?
          </h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base font-medium">
            Découvrez les bénéfices concrets pour l'ensemble de votre communauté scolaire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {AUDIENCE_BENEFITS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="h-full p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
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
                  <p className="text-xs font-semibold text-[#189CD8] mb-6">{item.subtitle}</p>

                  <div className="space-y-3">
                    {item.points.map((pt, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#189CD8]/10 text-[#189CD8] flex items-center justify-center shrink-0 mt-0.5 border border-[#189CD8]/25">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <Link to="/inscription" className="text-xs font-black text-[#189CD8] hover:text-[#1280B2] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Accéder à cet espace <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────── BENTO FEATURES (8 CARTES HARMONISÉES) ───────────────────────── */}
      <section className="py-12 sm:py-16 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-[#189CD8]/20 text-[#38bdf8] border border-[#189CD8]/30 mb-3 inline-flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              Fonctionnalités Clés & Récentes
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight text-white">
              Une technologie puissante au service de<br />
              <span className="text-[#38bdf8]">l'excellence académique</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
            {FEATURES_BENTO.map((f, i) => (
              <div 
                key={i} 
                className="h-full p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-[#189CD8]/50 hover:bg-slate-800 transition-all duration-300 flex flex-col justify-between group shadow-lg hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${f.iconBg}`}>
                      <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                    </div>
                    {f.tag && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-slate-300 border border-slate-700">
                        {f.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mb-2 tracking-tight">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">{f.desc}</p>
                </div>
                <div className="pt-4 mt-5 border-t border-slate-700/60 flex items-center text-xs font-bold text-[#38bdf8] hover:text-[#7dd3fc] cursor-pointer group">
                  <Link to="/fonctionnalites" className="flex items-center gap-1">
                    En savoir plus <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#4D3E90] tracking-tight leading-tight">
              Opérationnel en <span className="gradient-text">moins de 5 minutes</span>
            </h2>
            <p className="text-slate-600 mt-2 text-sm sm:text-base font-medium">
              Aucune installation complexe. Accédez à votre espace depuis n'importe quel ordinateur, tablette ou smartphone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-[#189CD8]/40 transition-colors relative">
                <div className="text-4xl sm:text-5xl font-black text-[#189CD8]/25 mb-4 font-mono">{s.n}</div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 tracking-tight">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

     
    </div>
  );
}
