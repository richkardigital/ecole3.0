import { Outlet, Link } from 'react-router-dom';
import { VitrineNavbar } from './VitrineNavbar';
import { GraduationCap, Mail, Phone, MapPin, Sparkles, Shield, Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const VitrineLayout = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col relative overflow-x-hidden">

      <VitrineNavbar />

      <main className="flex-1 relative z-10">
        <Outlet />
      </main>

      {/* ── PREMIUM FOOTER ── */}
      <footer className="relative z-10 pt-20 pb-10"
        style={{
          background: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
        }}>
        
        {/* Footer ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* CTA Banner inside footer */}
          <div className="rounded-3xl p-10 mb-16 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(14,165,233,0.04))',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3">Rejoignez le réseau SEEC</p>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 tracking-tight">
                Votre école mérite le meilleur.
              </h3>
              <Link to="/inscription">
                <Button variant="glow" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Inscrire mon établissement — Gratuit 14 jours
                </Button>
              </Link>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12"
            style={{ borderBottom: '1px solid #F1F5F9' }}>
            
            {/* Brand */}
            <div className="lg:col-span-1 space-y-5">
              <Link to="/" className="flex items-center gap-3 group w-fit">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-black text-slate-900 leading-none block">ÉCOLE 3.0</span>
                  <span className="text-[9px] font-black tracking-[0.18em] text-emerald-600 uppercase flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-2 h-2" /> Signé SEEC
                  </span>
                </div>
              </Link>
              <p className="text-sm text-slate-600 leading-relaxed">
                La plateforme de référence pour la transformation numérique des établissements scolaires d'Afrique de l'Ouest.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg chip-green">
                <Shield className="w-3.5 h-3.5" />
                Données Sécurisées & MENA Compliant
              </div>
            </div>

            {/* Plateforme */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-5">Plateforme</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Accueil', path: '/' },
                  { label: 'À propos', path: '/a-propos' },
                  { label: 'Fonctionnalités', path: '/fonctionnalites' },
                  { label: 'Tarifs & Abonnements', path: '/tarifs' },
                  { label: 'Témoignages', path: '/temoignages' },
                ].map((l) => (
                  <li key={l.path}>
                    <Link to={l.path} className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Portails */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-5">Accès & Portails</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Se connecter', path: '/login' },
                  { label: 'Inscrire mon école', path: '/inscription' },
                  { label: 'Mot de passe oublié', path: '/mot-de-passe-oublie' },
                  { label: 'FAQ', path: '/faq' },
                ].map((l) => (
                  <li key={l.path}>
                    <Link to={l.path} className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-5">Contact SEEC</h4>
              <ul className="space-y-3.5 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Abidjan, Côte d'Ivoire<br />Plateau, Imm. SEEC</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>+225 07 00 00 00 00</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>contact@seec-ecole30.ci</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom row */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} SEEC — Système Éducatif d'Écoles Connectées. Tous droits réservés.</span>
            <span className="flex items-center gap-1.5 font-medium">
              Conçu avec <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> pour l'Éducation Africaine
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
