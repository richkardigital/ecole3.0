import { useState } from 'react';
import { ChevronDown, Search, HelpCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

const FAQS = [
  { category: 'INSCRIPTION', q: "Comment s'inscrire en tant que Directeur d'établissement ?", a: "Accédez à la page d'inscription, remplissez les informations de votre profil directeur et de votre école. Votre espace administrateur sera créé instantanément." },
  { category: 'INSCRIPTION', q: "Quels types d'enseignements sont pris en charge ?", a: "ÉCOLE 3.0 gère l'Enseignement Général (Primaire, Collège, Lycée) et Technique & Professionnel. Vous pouvez également configurer des types personnalisés." },
  { category: 'BULLETINS', q: "Comment fonctionne la génération des bulletins trimestriels ?", a: "Dès que les enseignants saisissent les notes, la plateforme calcule automatiquement les moyennes coefficées, rangs et appréciations. Le directeur clique ensuite sur 'Imprimer les bulletins PDF'." },
  { category: 'BULLETINS', q: "Le système respecte-t-il le calendrier scolaire ivoirien ?", a: "Oui ! Découpage en 3 Trimestres (Octobre-Décembre, Janvier-Mars, Avril-Juin) avec verrouillage des périodes pour sécuriser les notes." },
  { category: 'SECURITE', q: "Où sont stockées les données des élèves ?", a: "Sur des serveurs sécurisés avec sauvegardes quotidiennes chiffrées. Les mots de passe sont hachés (Bcrypt) et les sessions protégées par JWT." },
  { category: 'SECURITE', q: "Qu'est-ce que le Réseau SEEC ?", a: "Le Réseau SEEC réunit les établissements partenaires pour le partage sécurisé d'épreuves et de ressources. Seuls les comptes authentifiés d'écoles actives ont accès." },
  { category: 'INSCRIPTION', q: "Puis-je réinitialiser mon mot de passe ?", a: "Oui, cliquez sur 'Mot de passe oublié' sur la page de connexion et suivez les étapes pour définir un nouveau mot de passe." },
];

const CATEGORIES = [
  { key: 'TOUS', label: 'Toutes' },
  { key: 'INSCRIPTION', label: 'Inscription & Écoles' },
  { key: 'BULLETINS', label: 'Bulletins & Notes' },
  { key: 'SECURITE', label: 'Sécurité & SEEC' },
] as const;

type CatKey = typeof CATEGORIES[number]['key'];

export default function FaqPage() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<CatKey>('TOUS');
  const [open, setOpen] = useState<number | null>(0);

  const filtered = FAQS.filter(f => {
    const matchCat = cat === 'TOUS' || f.category === cat;
    const q = search.toLowerCase();
    const matchSearch = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
      
      {/* ── HERO ── */}
      <section className="relative pt-28 pb-20 overflow-hidden hero-bg">
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <span className="chip chip-violet mb-8 inline-flex">
            <HelpCircle className="w-3 h-3" />
            Foire Aux Questions
          </span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 mb-6 leading-[0.95]">
            Comment pouvons-nous<br />
            <span className="gradient-text">vous aider ?</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed mb-12 font-medium">
            Retrouvez les réponses aux questions les plus fréquentes des directeurs, professeurs et parents.
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (ex: bulletins, inscription, sécurité...)"
              className="w-full pl-12 pr-4 py-4 text-slate-900 text-sm placeholder:text-slate-400 outline-none transition-all rounded-2xl bg-white border border-slate-200 shadow-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>
        </div>
      </section>

      {/* ── FAQ BODY ── */}
      <section className="py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category tabs */}
        <div className="flex justify-center flex-wrap gap-2 mb-12">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                cat === c.key
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500 bg-white border border-slate-200 rounded-2xl">
              <HelpCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-bold">Aucun résultat pour « {search} »</p>
            </div>
          ) : (
            filtered.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden bg-white border transition-all duration-300"
                style={{
                  borderColor: open === i ? '#10B981' : '#E2E8F0',
                  boxShadow: open === i ? '0 4px 20px -2px rgba(16,185,129,0.1)' : '0 1px 3px rgba(15,23,42,0.03)',
                }}
              >
                <button
                  className="w-full px-7 py-5 text-left flex justify-between items-center focus:outline-none gap-4 group"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className={`font-bold text-base transition-colors ${open === i ? 'text-emerald-700' : 'text-slate-900 group-hover:text-emerald-600'}`}>
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                    open === i ? 'bg-emerald-50 text-emerald-600 rotate-180' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open === i ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-7 pb-6 border-t border-slate-100">
                    <p className="text-slate-600 leading-relaxed text-sm pt-4 font-medium">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
