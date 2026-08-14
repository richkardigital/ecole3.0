import { useState } from 'react';
import { Star, Building2, Quote, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

const TESTIMONIALS = [
  {
    name: 'Jean-Marc Kouassi',
    role: 'Directeur Général',
    school: 'Groupe Scolaire Excellence (Abidjan)',
    type: 'DIRECTEUR',
    content: 'Avant ÉCOLE 3.0, la période des conseils de classe et l\'impression des bulletins était un vrai cauchemar. Désormais, tout le calcul de moyennes et le rang des 1 200 élèves se font automatiquement en 1-clic.',
    rating: 5,
    impact: 'Gain de 150h / trimestre',
    impactClass: 'chip-green',
    initials: 'JK',
    avatarFrom: '#10b981',
    avatarTo: '#059669',
  },
  {
    name: 'Marie-Louise Koné',
    role: 'Enseignante de Maths & PP 3ème',
    school: 'Collège Sainte-Marie (Yopougon)',
    type: 'ENSEIGNANT',
    content: 'La saisie des notes et le partage de supports de cours par chapitre ont révolutionné ma pratique. Les élèves reçoivent leurs devoirs directement sur l\'application.',
    rating: 5,
    impact: '+35% devoirs rendus à temps',
    impactClass: 'chip-cyan',
    initials: 'MK',
    avatarFrom: '#8B5CF6',
    avatarTo: '#06B6D4',
  },
  {
    name: 'Kouadio Brou',
    role: 'Fondateur & Directeur',
    school: 'Complexe Éducatif Avenir (Bouaké)',
    type: 'DIRECTEUR',
    content: 'Le réseau inter-écoles SEEEC nous permet de partager des banques d\'épreuves avec d\'autres établissements et d\'harmoniser nos standards pour les examens d\'État.',
    rating: 5,
    impact: 'Réseau SEEEC Certifié',
    impactClass: 'chip-green',
    initials: 'KB',
    avatarFrom: '#F59E0B',
    avatarTo: '#EF4444',
  },
  {
    name: 'Awa Diabaté',
    role: 'Professeur de Français',
    school: 'Lycée Moderne (San Pedro)',
    type: 'ENSEIGNANT',
    content: 'L\'interface est claire et ultra-rapide. Même sur mobile, je peux entrer mes appréciations de fin de trimestre en quelques clics sans aucune lenteur.',
    rating: 5,
    impact: 'Saisie 100% Mobile',
    impactClass: 'chip-amber',
    initials: 'AD',
    avatarFrom: '#06B6D4',
    avatarTo: '#8B5CF6',
  },
  {
    name: "Dr. Paul N'Dri",
    role: 'Directeur des Études',
    school: 'Institut Technique (Yamoussoukro)',
    type: 'DIRECTEUR',
    content: 'La prise en charge des spécificités de l\'enseignement technique ivoirien avec coefficients modulaires a fait toute la différence par rapport aux autres logiciels.',
    rating: 5,
    impact: 'Module Technique Inclus',
    impactClass: 'chip-violet',
    initials: 'PN',
    avatarFrom: '#8B5CF6',
    avatarTo: '#10b981',
  },
];

type FilterType = 'TOUS' | 'DIRECTEUR' | 'ENSEIGNANT';

export default function TestimonialsPage() {
  const [filter, setFilter] = useState<FilterType>('TOUS');
  const filtered = TESTIMONIALS.filter(t => filter === 'TOUS' || t.type === filter);

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
      
      {/* ── HERO ── */}
      <section className="relative pt-8 sm:pt-12 pb-6 sm:pb-8 overflow-hidden hero-bg">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <span className="chip chip-cyan mb-4 inline-flex">
            <MessageSquare className="w-3 h-3" />
            Retours d'Expérience du Terrain
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter text-slate-900 mb-4 leading-[1.02]">
            Ce que disent les<br />
            <span className="gradient-text">Chefs d'Établissement</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-6 font-medium">
            Plus de 25 établissements scolaires font confiance au Système SEEEC pour piloter leur gestion au quotidien.
          </p>

          {/* Filter tabs */}
          <div className="flex justify-center gap-2 flex-wrap">
            {([
              { key: 'TOUS', label: 'Tous les témoignages' },
              { key: 'DIRECTEUR', label: 'Directeurs & Fondateurs' },
              { key: 'ENSEIGNANT', label: 'Enseignants' },
            ] as { key: FilterType; label: string }[]).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                  filter === f.key
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS GRID ── */}
      <section className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t, i) => (
            <div
              key={i}
              className="flex flex-col rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="h-[3px] w-full"
                style={{ background: `linear-gradient(90deg, ${t.avatarFrom}, ${t.avatarTo})` }} />
              
              <div className="p-8 flex flex-col flex-1">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-5">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-slate-200 mb-3" />

                <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-6 font-medium">
                  "{t.content}"
                </p>

                <div className="mb-6">
                  <span className={`chip ${t.impactClass}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {t.impact}
                  </span>
                </div>

                <div className="flex items-center gap-4 pt-5 border-t border-slate-100">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${t.avatarFrom}, ${t.avatarTo})` }}>
                    {t.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">{t.name}</p>
                    <p className="text-xs text-emerald-700 font-bold truncate">{t.role}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate font-medium">
                      <Building2 className="w-3 h-3 shrink-0" /> {t.school}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
