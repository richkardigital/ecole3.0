import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import {
  FileText, Shield, GraduationCap, MessageCircle, Network, Users,
  CheckCircle2, ArrowRight, BookOpen, Clock, Calendar, BarChart3,
  Award, Sparkles, Building2, Lock, Zap, Search
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'Toutes les fonctionnalités' },
  { id: 'ADMIN', label: 'Gestion & Administration' },
  { id: 'PEDAGOGIE', label: 'Pédagogie & Bulletins' },
  { id: 'COMMUNICATION', label: 'Communication & Réseau' },
];

const FEATURES = [
  {
    category: 'PEDAGOGIE',
    title: 'Génération Automatique de Bulletins',
    desc: 'Bulletins trimestriels avec calcul automatique des moyennes pondérées, rangs et appréciations. Prêts à imprimer en PDF.',
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'Populaire',
    badgeClass: 'chip-green',
  },
  {
    category: 'ADMIN',
    title: 'Espaces Dédiés par Rôle',
    desc: 'Interfaces personnalisées pour Directeur, Éducateur, Enseignant et Élève avec permissions granulaires.',
    icon: Shield,
    color: 'text-violet-600',
    bg: 'bg-violet-50 border-violet-200',
  },
  {
    category: 'ADMIN',
    title: 'Gestion des Classes & Affectations',
    desc: 'Affectation des professeurs par matière et par classe, suivi des effectifs et création des niveaux scolaires.',
    icon: GraduationCap,
    color: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-200',
  },
  {
    category: 'COMMUNICATION',
    title: 'Annonces Flash & Push SMS',
    desc: 'Diffusion immédiate d’informations urgentes à toute l’école ou par classe spécifique.',
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    category: 'COMMUNICATION',
    title: 'Réseau Inter-Écoles SEEC',
    desc: 'Partage sécurisé d’épreuves d’examens, de fiches de cours et de bonnes pratiques entre directeurs.',
    icon: Network,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    badge: 'Exclusif SEEC',
    badgeClass: 'chip-green',
  },
  {
    category: 'PEDAGOGIE',
    title: 'Agenda Scolaire & Évaluations',
    desc: 'Planification des devoirs sur table, des interrogations et suivi des dates clés du calendrier scolaire.',
    icon: Calendar,
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
  },
  {
    category: 'ADMIN',
    title: 'Registre Absences & Conduite',
    desc: 'Saisie rapide des absences et retards avec suivi de la conduite disciplinaire des apprenants.',
    icon: Clock,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
  },
  {
    category: 'COMMUNICATION',
    title: 'Messagerie Interne Sécurisée',
    desc: 'Discussions directes et sécurisées entre enseignants, éducateurs et directeurs.',
    icon: MessageCircle,
    color: 'text-teal-600',
    bg: 'bg-teal-50 border-teal-200',
  },
];

export default function FeaturesPage() {
  const [activeCategory, setActiveCategory] = useState('ALL');

  const filtered = activeCategory === 'ALL'
    ? FEATURES
    : FEATURES.filter(f => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
      
      {/* ── HERO ── */}
      <section className="relative pt-28 pb-20 overflow-hidden hero-bg">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <span className="chip chip-green mb-8 inline-flex">
            <Sparkles className="w-3 h-3" />
            Module Par Module
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-[0.95]">
            Les fonctionnalités de<br />
            <span className="gradient-text">votre succès.</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-12 font-medium">
            Découvrez tous les outils conçus sur-mesure pour moderniser la gestion de votre établissement scolaire.
          </p>

          {/* Category Filter Pills */}
          <div className="flex justify-center gap-3 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── GRID ── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((f, i) => (
            <div key={i} className="feature-card p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${f.bg}`}>
                    <f.icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                  {f.badge && <span className={`chip ${f.badgeClass}`}>{f.badge}</span>}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-24 max-w-4xl mx-auto px-4 text-center">
        <div className="rounded-3xl p-12 bg-white border border-slate-200 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
              Testez toutes ces fonctionnalités gratuitement
            </h2>
            <p className="text-sm text-slate-600 mb-8 font-medium">
              Créez votre espace école en 2 minutes sans engagement.
            </p>
            <Link to="/inscription">
              <Button variant="glow" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Commencer l'essai gratuit 14 jours
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
