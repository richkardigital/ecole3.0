import { Outlet, Link } from 'react-router-dom';
import { VitrineNavbar } from './VitrineNavbar';
import { VitrineFloatingActions } from '../common/VitrineFloatingActions';
import { GraduationCap, Mail, Phone, MapPin, Sparkles, Shield, Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const VitrineLayout = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col relative overflow-x-hidden">

      <VitrineNavbar />

      <main className="flex-1 relative z-10">
        <Outlet />
      </main>

      {/* ── BOUTONS FLOTTANTS (WHATSAPP & RETOUR EN HAUT) ── */}
      <VitrineFloatingActions />

      {/* ── FOOTER OBSIDIEN NOIR PREMIUM ── */}
      <footer className="relative z-10 pt-16 pb-10 bg-slate-950 text-white border-t border-slate-800">
        
        {/* Footer ambient light */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.18) 0%, transparent 70%)', filter: 'blur(50px)' }} 
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* CTA Banner inside footer */}
          <div className="rounded-3xl p-8 sm:p-10 mb-14 text-center relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 border border-slate-800 shadow-2xl">
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">Rejoignez le réseau SEEEC</p>
              <h3 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">
                Votre école mérite le meilleur.
              </h3>
              <Link to="/inscription">
                <Button variant="glow" size="md" rightIcon={<ArrowRight className="w-4 h-4" />} className="shadow-lg shadow-emerald-500/25">
                  Inscrire mon établissement
                </Button>
              </Link>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
            
            {/* Brand */}
            <div className="lg:col-span-1 space-y-5">
              <Link to="/" className="flex items-center gap-3 group w-fit">
                <img 
                  src="/logo.png" 
                  alt="Logo École 3.0" 
                  className="h-10 w-auto max-w-[130px] object-contain drop-shadow-xs" 
                />
                <div>
                  <span className="text-lg font-black text-white leading-none block">ÉCOLE 3.0</span>
                  <span className="text-[10px] font-black tracking-[0.16em] text-emerald-400 uppercase flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> SEEEC Platform
                  </span>
                </div>
              </Link>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                La plateforme de référence pour la transformation numérique des établissements scolaires d'Afrique de l'Ouest.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <Shield className="w-3.5 h-3.5" />
                Données Sécurisées & MENA Compliant
              </div>
            </div>

            {/* Plateforme */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-5">Plateforme</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Accueil', path: '/' },
                  { label: 'À propos', path: '/a-propos' },
                  { label: 'Fonctionnalités', path: '/fonctionnalites' },
                  { label: 'Tarifs & Abonnements', path: '/tarifs' },
                  { label: 'Témoignages', path: '/temoignages' },
                ].map((l) => (
                  <li key={l.path}>
                    <Link to={l.path} className="text-sm text-slate-300 hover:text-emerald-400 transition-colors font-medium">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Portails */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-5">Accès & Portails</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Se connecter', path: '/login' },
                  { label: 'Inscrire mon école', path: '/inscription' },
                  { label: 'Mot de passe oublié', path: '/mot-de-passe-oublie' },
                  { label: 'FAQ', path: '/faq' },
                ].map((l) => (
                  <li key={l.path}>
                    <Link to={l.path} className="text-sm text-slate-300 hover:text-emerald-400 transition-colors font-medium">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-5">Contact SEEEC</h4>
              <ul className="space-y-3.5 text-sm text-slate-300 font-medium">
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Abidjan, Côte d'Ivoire<br /><span className="text-slate-400 text-xs">Plateau, Imm. SEEEC</span></span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-slate-200">+225 07 00 00 00 00</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-200">contact@seeec-ecole30.ci</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom row / Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <span className="font-medium">© {new Date().getFullYear()} SEEEC — Stimuler l'Excellence et l'Entrepreneuriat à l'Ecole Connectée. Tous droits réservés.</span>
            <span className="flex items-center gap-1.5 font-medium text-slate-400">
              Conçu avec <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> pour l'Éducation Africaine
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

