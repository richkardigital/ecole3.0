import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import {
  FileText, Shield, GraduationCap, MessageCircle, Network, Users,
  CheckCircle2, ArrowRight, BookOpen, Clock, Calendar, BarChart3,
  Award, Sparkles, Building2, Lock, Zap, Search, ArrowRightLeft,
  PenTool, Check, Layers, FolderOpen, ShieldCheck, UserCheck,
  CheckSquare, HelpCircle, Laptop, Bell, Send
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'Toutes les fonctionnalités', icon: Sparkles },
  { id: 'DIRECTEUR', label: 'Directeurs & Administration', icon: Building2 },
  { id: 'ENSEIGNANT', label: 'Enseignants & Pédagogie', icon: BookOpen },
  { id: 'EDUCATEUR', label: 'Éducateurs & Vie Scolaire', icon: ShieldCheck },
  { id: 'PARENT', label: 'Parents d\'Élèves', icon: Users },
  { id: 'APPRENANT', label: 'Élèves & Apprenants', icon: GraduationCap },
  { id: 'SUPER_ADMIN', label: 'Super Admin & SEEEC', icon: Network },
];

const FEATURES = [
  {
    id: 'bulletins',
    roles: ['DIRECTEUR', 'ENSEIGNANT', 'EDUCATEUR', 'PARENT', 'APPRENANT'],
    category: 'PEDAGOGIE',
    title: 'Bulletins Automatisés & Calculs Certifiés MENA',
    desc: 'Génération instantanée des bulletins trimestriels avec calcul automatique des moyennes pondérées, coefficients, rangs et mentions.',
    details: [
      'Calculs stricts conformes aux normes du Ministère de l\'Éducation',
      'Tableaux récapitulatifs par matière avec appréciation de l\'enseignant',
      'Workflow de validation hiérarchique : Enseignant ➔ Éducateur ➔ Directeur',
      'Export PDF haute définition prêt à imprimer et archiver en 1 clic'
    ],
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: '🏆 #1 Conforme MENA',
    badgeClass: 'chip-green',
  },
  {
    id: 'classes',
    roles: ['DIRECTEUR', 'SUPER_ADMIN', 'EDUCATEUR'],
    category: 'ADMIN',
    title: 'Supervision des Classes & Affectations Matières',
    desc: 'Création des structures de classes de la 6ème à la Terminale, suivi des effectifs et attribution précise des professeurs par discipline.',
    details: [
      'Attribution multi-professeurs par matière avec coefficients personnalisables',
      'Suivi en temps réel des effectifs garçons/filles et statistiques par classe',
      'Création et gestion des filières Général, Technique et Mixte',
      'Synchronisation immédiate avec les emplois du temps et registres'
    ],
    icon: GraduationCap,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    badge: 'Direction',
    badgeClass: 'chip-violet',
  },
  {
    id: 'migration',
    roles: ['DIRECTEUR', 'SUPER_ADMIN'],
    category: 'ADMIN',
    title: 'Migration & Transfert d\'Élèves Sécurisé',
    desc: 'Transférez des apprenants d\'une classe à une autre pour l\'année académique active sans perte de données ni création de doublons.',
    details: [
      'Transfert individuel ou par cohorte en 2 clics',
      'Préservation intégrale des notes antérieures, évaluations et présences',
      'Maintien de l\'identifiant unique (Matricule) et du compte parent lié',
      'Historique complet des mouvements d\'élèves auditable'
    ],
    icon: ArrowRightLeft,
    color: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-200',
    badge: 'Nouveau',
    badgeClass: 'chip-cyan',
  },
  {
    id: 'saisie-notes',
    roles: ['ENSEIGNANT', 'DIRECTEUR'],
    category: 'PEDAGOGIE',
    title: 'Saisie Rapide des Notes & Évaluations',
    desc: 'Grille de saisie ultra-fluide optimisée pour les enseignants : devoirs sur table, compositions, interrogations et devoirs de niveau.',
    details: [
      'Saisie directe avec validation automatique au clavier',
      'Calcul immédiat des moyennes de classe et détection des écarts',
      'Verrouillage automatique après la clôture officielle du trimestre',
      'Commentaires et appréciations individualisés par élève'
    ],
    icon: BarChart3,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'Ultra Rapide',
    badgeClass: 'chip-green',
  },
  {
    id: 'cours-chapitres',
    roles: ['ENSEIGNANT', 'APPRENANT', 'EDUCATEUR'],
    category: 'PEDAGOGIE',
    title: 'Gestion des Cours & Chapitres par Niveau',
    desc: 'Espace pédagogique multimédia structuré par niveau et matière : déposez et consultez cours, fiches synthétiques et documents officiels.',
    details: [
      'Structure modulaire par chapitres et leçons interactives',
      'Support de fichiers PDF, vidéos, cours textuels et liens enrichis',
      'Visibilité ciblée selon la classe et le niveau de l\'apprenant',
      'Suivi de la progression de lecture et d\'apprentissage'
    ],
    icon: BookOpen,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
    badge: 'Multimédia',
    badgeClass: 'chip-violet',
  },
  {
    id: 'devoirs-corrections',
    roles: ['ENSEIGNANT', 'APPRENANT'],
    category: 'PEDAGOGIE',
    title: 'Devoirs en Ligne & Corrections Instantanées',
    desc: 'Assignation de devoirs individuels ou de niveau avec date limite, dépôt de copies numériques et retours correctifs personnalisés.',
    details: [
      'Création rapide de devoirs à rendre avec consignes et pièces jointes',
      'Dépôt numérique des devoirs par les apprenants avant la deadline',
      'Interface de correction enseignant avec barème et annotations',
      'Notification immédiate de la note et des commentaires à l\'élève'
    ],
    icon: PenTool,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'Interactif',
    badgeClass: 'chip-amber',
  },
  {
    id: 'absences-retards',
    roles: ['EDUCATEUR', 'DIRECTEUR', 'PARENT'],
    category: 'VIE_SCOLAIRE',
    title: 'Registre Numérique des Absences & Retards',
    desc: 'Pointage numérique en temps réel des présences, retards et justifications par heure de cours ou par journée.',
    details: [
      'Pointage rapide par classe ou par créneau horaire',
      'Gestion des motifs d\'absence et des justificatifs médicaux',
      'Cumul automatique d\'heures d\'absences reporté sur le bulletin',
      'Alerte automatique sur le tableau de bord parent'
    ],
    icon: Clock,
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
    badge: 'Vie Scolaire',
    badgeClass: 'chip-rose',
  },
  {
    id: 'conduite-discipline',
    roles: ['EDUCATEUR', 'DIRECTEUR'],
    category: 'VIE_SCOLAIRE',
    title: 'Bulletins de Conduite & Suivi Disciplinaire',
    desc: 'Suivi rigoureux du comportement scolaire : attribution des notes de conduite, avertissements, blâmes et tableaux d\'honneur.',
    details: [
      'Calcul transparent de la note de conduite trimestrielle',
      'Enregistrement des sanctions, exclusions temporaires et encouragements',
      'Rapport disciplinaire complet consultable par la direction',
      'Intégration directe de la note de conduite sur le bulletin officiel'
    ],
    icon: ShieldCheck,
    color: 'text-teal-600',
    bg: 'bg-teal-50 border-teal-200',
    badge: 'Discipline',
    badgeClass: 'chip-green',
  },
  {
    id: 'parent-dashboard',
    roles: ['PARENT'],
    category: 'PARENT',
    title: 'Tableau de Bord Parent Multi-Enfants',
    desc: 'Vue 360° pour les familles : suivez simultanément tous vos enfants scolarisés au sein d\'une interface claire et intuitive.',
    details: [
      'Accès centralisé à toutes les notes et moyennes dès publication',
      'Suivi en direct des absences et devoirs en attente de rendu',
      'Consultation et téléchargement des bulletins scolaires validés',
      'Messagerie directe avec l\'administration et les enseignants'
    ],
    icon: Users,
    color: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-200',
    badge: 'Familles',
    badgeClass: 'chip-cyan',
  },
  {
    id: 'reseau-seeec',
    roles: ['DIRECTEUR', 'ENSEIGNANT', 'SUPER_ADMIN'],
    category: 'RESEAU',
    title: 'Réseau National Inter-Écoles SEEEC',
    desc: 'Plateforme exclusive de partage pédagogique mutualisant les ressources, sujets d\'épreuves et bonnes pratiques entre 150+ écoles.',
    details: [
      'Banque nationale de sujets d\'examens blancs et devoirs partagés',
      'Fiches de révision et cours certifiés par les meilleurs pédagogues',
      'Forum national d\'entraide entre directeurs et enseignants',
      'Valorisation de l\'expertise pédagogique au sein du réseau'
    ],
    icon: Network,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'Exclusif SEEEC',
    badgeClass: 'chip-green',
  },
  {
    id: 'messagerie-chat',
    roles: ['DIRECTEUR', 'ENSEIGNANT', 'EDUCATEUR', 'PARENT', 'APPRENANT', 'SUPER_ADMIN'],
    category: 'COMMUNICATION',
    title: 'Messagerie Directe & Canaux de Discussion',
    desc: 'Système de chat instantané sécurisé permettant des échanges fluides entre tous les membres de la communauté éducative.',
    details: [
      'Canaux privés et discussions de groupe par classe ou par équipe',
      'Notifications en direct des nouveaux messages reçus',
      'Environnement sécurisé et modéré sans échanges de numéros personnels',
      'Historique des conversations accessible en permanence'
    ],
    icon: MessageCircle,
    color: 'text-teal-600',
    bg: 'bg-teal-50 border-teal-200',
    badge: 'Temps Réel',
    badgeClass: 'chip-cyan',
  },
  {
    id: 'annonces-flash',
    roles: ['DIRECTEUR', 'EDUCATEUR', 'SUPER_ADMIN'],
    category: 'COMMUNICATION',
    title: 'Annonces Flash & Communiqués Officiels',
    desc: 'Diffusion instantanée d\'informations urgentes, circulaires et alertes à l\'échelle de l\'école entière ou de classes ciblées.',
    details: [
      'Affichage prioritaire sur les tableaux de bord utilisateurs',
      'Ciblage précis : toute l\'école, enseignants, élèves ou parents',
      'Programmation des dates de publication et d\'expiration',
      'Confirmation de lecture et traçabilité des communications'
    ],
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    badge: 'Urgence & Flash',
    badgeClass: 'chip-amber',
  },
  {
    id: 'librairie',
    roles: ['DIRECTEUR', 'ENSEIGNANT', 'APPRENANT', 'SUPER_ADMIN'],
    category: 'PEDAGOGIE',
    title: 'Librairie 3.0 & Bibliothèque Numérique',
    desc: 'Espace de documentation numérique officiel regroupant manuels, annales, fascicules d\'exercices et documents administratifs.',
    details: [
      'Téléchargement sécurisé de documents pédagogiques PDF',
      'Recherche avancée par matière, niveau scolaire et auteur',
      'Espace de partage de documents certifiés par la direction',
      'Accès permanent 24h/24 y compris hors ligne via PWA'
    ],
    icon: FolderOpen,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
    badge: 'Bibliothèque',
    badgeClass: 'chip-violet',
  },
  {
    id: 'agenda-evaluations',
    roles: ['DIRECTEUR', 'ENSEIGNANT', 'EDUCATEUR', 'APPRENANT'],
    category: 'PEDAGOGIE',
    title: 'Agenda Scolaire & Calendrier des Évaluations',
    desc: 'Planification centralisée des compositions, devoirs surveillés, réunions pédagogiques et vacances scolaires.',
    details: [
      'Vue calendaire mensuelle, hebdomadaire et journalière',
      'Synchronisation automatique des dates limites de devoirs',
      'Anticipation des périodes d\'examens et fin de trimestre',
      'Filtre par classe pour éviter la surcharge des apprenants'
    ],
    icon: Calendar,
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
    badge: 'Organisation',
    badgeClass: 'chip-rose',
  },
  {
    id: 'multi-ecoles',
    roles: ['SUPER_ADMIN'],
    category: 'ADMIN',
    title: 'Gestion Multi-Établissements & Niveaux Nationaux',
    desc: 'Pilotage d\'un parc complet d\'établissements scolaires (Général, Technique, Mixte) avec configuration des référentiels nationaux.',
    details: [
      'Création et activation instantanée de nouveaux établissements',
      'Gestion unifiée des types d\'enseignement et filières',
      'Paramétrage global des matières officielles et années académiques',
      'Statistiques consolidées et surveillance de la performance réseau'
    ],
    icon: Building2,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    badge: 'Super Admin',
    badgeClass: 'chip-violet',
  },
  {
    id: 'securite-roles',
    roles: ['SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR', 'ENSEIGNANT', 'PARENT', 'APPRENANT'],
    category: 'ADMIN',
    title: 'Sécurité Maximale & Permissions Granulaires',
    desc: 'Protection des données scolaires avec authentification chiffrée JWT, isolation stricte par établissement et conformité RGPD/MENA.',
    details: [
      'Cloisonnement strict des données entre établissements scolaires',
      'Contrôle d\'accès basé sur les rôles (RBAC) ultra-sécurisé',
      'Sauvegardes automatiques quotidiennes et haute disponibilité',
      'Conformité stricte aux exigences légales de protection des mineurs'
    ],
    icon: Lock,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'Chiffrement 256-bit',
    badgeClass: 'chip-green',
  },
];

export default function FeaturesPage() {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFeatures = useMemo(() => {
    return FEATURES.filter((f) => {
      const matchesCategory = 
        activeCategory === 'ALL' || 
        f.roles.includes(activeCategory) || 
        f.category === activeCategory;

      const matchesSearch = 
        searchQuery.trim() === '' ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.details.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
      
      {/* ── HERO ── */}
      <section className="relative pt-8 sm:pt-12 pb-6 sm:pb-8 overflow-hidden hero-bg">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <span className="chip chip-green mb-4 inline-flex">
            <Sparkles className="w-3.5 h-3.5" />
            Catalogue Complet des Fonctionnalités
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter text-slate-900 mb-4 leading-[1.02]">
            Toutes les fonctionnalités de<br />
            <span className="gradient-text">votre succès scolaire.</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto mb-6 font-medium">
            Explorez l'ensemble des modules opérationnels conçus pour chaque acteur de votre communauté éducative : Directeurs, Enseignants, Éducateurs, Parents et Élèves.
          </p>

          {/* Search bar */}
          <div className="max-w-xl mx-auto mb-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une fonctionnalité (bulletins, notes, absences, réseau...)"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded-lg"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex justify-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── GRID ── */}
      <section className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm font-bold text-slate-500">
            Affichage de <span className="text-slate-900 font-black">{filteredFeatures.length}</span> module(s) disponible(s)
          </p>
          {searchQuery && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Résultats pour "{searchQuery}"
            </span>
          )}
        </div>

        {filteredFeatures.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 max-w-xl mx-auto my-8 shadow-sm">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-900 mb-2">Aucune fonctionnalité trouvée</h3>
            <p className="text-sm text-slate-500 mb-6">
              Essayez un autre mot-clé ou réinitialisez les filtres de recherche.
            </p>
            <Button 
              variant="outline" 
              onClick={() => { setActiveCategory('ALL'); setSearchQuery(''); }}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredFeatures.map((f) => (
              <div 
                key={f.id} 
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 p-7 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${f.bg}`}>
                      <f.icon className={`w-6 h-6 ${f.color}`} />
                    </div>
                    {f.badge && <span className={`chip ${f.badgeClass} text-xs font-bold`}>{f.badge}</span>}
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-2.5 tracking-tight group-hover:text-emerald-700 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium mb-6">
                    {f.desc}
                  </p>

                  <div className="space-y-2.5 pt-4 border-t border-slate-100 mb-6">
                    {f.details.map((detail, dIdx) => (
                      <div key={dIdx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className="text-xs text-slate-700 font-medium leading-relaxed">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link 
                    to="/inscription" 
                    className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    Activer pour mon école <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── PANORAMA DES ESPACES DÉDIÉS ── */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 inline-flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Espaces Utilisateurs Dédiés
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
              Une interface adaptée pour <span className="text-emerald-400">chaque métier</span>
            </h2>
            <p className="text-slate-300 mt-4 text-base font-medium">
              Chaque utilisateur accède uniquement aux outils nécessaires à sa mission, avec une ergonomie pensée pour son confort.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                role: 'Directeurs & Fondateurs',
                route: '/directeur/dashboard',
                badge: 'Direction',
                icon: Building2,
                color: 'text-purple-400',
                desc: 'Validation des bulletins en 1 clic, gestion des classes, affectations profs, migration d\'élèves et suivi financier.',
              },
              {
                role: 'Enseignants',
                route: '/enseignant/dashboard',
                badge: 'Corps Professoral',
                icon: BookOpen,
                color: 'text-emerald-400',
                desc: 'Saisie ultra-rapide des notes, devoirs de niveau, suivi des cours et accès à la bibliothèque de ressources SEEEC.',
              },
              {
                role: 'Éducateurs & Vie Scolaire',
                route: '/educateur/dashboard',
                badge: 'Vie Scolaire',
                icon: ShieldCheck,
                color: 'text-sky-400',
                desc: 'Pointage numérique des absences/retards, édition des bulletins de conduite et gestion de la discipline.',
              },
              {
                role: 'Parents d\'Élèves',
                route: '/parent/dashboard',
                badge: 'Familles',
                icon: Users,
                color: 'text-amber-400',
                desc: 'Suivi multi-enfants, consultation des moyennes en temps réel, alertes d\'absence et téléchargement des bulletins.',
              },
              {
                role: 'Élèves & Apprenants',
                route: '/dashboard',
                badge: 'Apprenants',
                icon: GraduationCap,
                color: 'text-indigo-400',
                desc: 'Cours officiels par niveau, remise des devoirs, passage de quiz chronométrés, agenda et forum d\'entraide.',
              },
              {
                role: 'Super Administrateurs',
                route: '/admin/dashboard',
                badge: 'Réseau SEEEC',
                icon: Network,
                color: 'text-rose-400',
                desc: 'Gestion multi-écoles (Général, Technique, Mixte), référentiel national des matières, années académiques et statistiques.',
              },
            ].map((space, i) => (
              <div 
                key={i} 
                className="p-7 rounded-3xl bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <space.icon className={`w-7 h-7 ${space.color}`} />
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-600">
                      {space.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">{space.role}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium mb-6">
                    {space.desc}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-700/60">
                  <Link 
                    to="/inscription" 
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    Découvrir l'espace <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-10 sm:py-14 max-w-5xl mx-auto px-4 text-center">
        <div className="rounded-3xl p-8 sm:p-12 bg-white border border-slate-200/90 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <span className="chip chip-green mb-4 inline-flex">
              <Zap className="w-3 h-3" />
              Déploiement Immédiat
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              Modernisez votre établissement dès aujourd'hui
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mb-6 max-w-2xl mx-auto font-medium">
              Rejoignez plus de 25+ écoles connectées et profitez de l'ensemble de ces fonctionnalités avec un accompagnement personnalisé.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/inscription">
                <Button variant="glow" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />} className="shadow-lg shadow-emerald-500/20">
                  Inscrire mon établissement
                </Button>
              </Link>
              <Link to="/connexion">
                <Button variant="outline" size="lg" className="bg-white hover:bg-slate-50">
                  Se connecter à mon espace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
