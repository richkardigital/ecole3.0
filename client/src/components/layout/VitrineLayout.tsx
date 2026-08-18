import { Outlet, Link } from 'react-router-dom';
import { VitrineNavbar } from './VitrineNavbar';
import { VitrineFloatingActions } from '../common/VitrineFloatingActions';
import { Mail, Phone, MapPin, Shield, Heart, ArrowRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/common/BrandLogo';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

export const VitrineLayout = () => {
  const { settings } = useSystemSettings();

  const platformName = settings?.platformName || 'ÉCOLE 3.0';
  const description = settings?.description || 'La plateforme de référence pour la transformation numérique des établissements scolaires d\'Afrique de l\'Ouest.';
  const email = settings?.email || 'contact@seeec-ecole30.ci';
  const phone = settings?.phone || '+225 07 00 00 00 00';
  const address = settings?.address || 'Abidjan, Côte d\'Ivoire';
  const postalAddress = settings?.postalAddress || 'Plateau, Imm. SEEEC';
  const websiteUrl = settings?.websiteUrl || 'https://ecole3-seeec.ci';

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
          style={{ background: 'radial-gradient(ellipse, rgba(24,156,216,0.18) 0%, transparent 70%)', filter: 'blur(50px)' }} 
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* CTA Banner inside footer */}
          <div className="rounded-3xl p-8 sm:p-10 mb-14 text-center relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-[#189CD8]/20 border border-slate-800 shadow-2xl">
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-widest text-[#38bdf8] mb-2">Rejoignez le réseau {platformName}</p>
              <h3 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight">
                Votre établissement mérite l'excellence numérique.
              </h3>
              <Link to="/inscription">
                <Button variant="glow" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Inscrire mon établissement
                </Button>
              </Link>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
            
            {/* Brand */}
            <div className="lg:col-span-1 space-y-5">
              <BrandLogo size="md" to="/" theme="light" />
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                {description}
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-950/80 text-[#38bdf8] border border-sky-800/60">
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
                  { label: 'Fonctionnalités', path: '/fonctionnalites' },
                  { label: 'À propos de nous', path: '/a-propos' },
                  { label: 'Tarifs & Abonnements', path: '/tarifs' },
                  { label: 'FAQ', path: '/faq' },
                ].map((l) => (
                  <li key={l.path}>
                    <Link to={l.path} className="text-sm text-slate-300 hover:text-[#38bdf8] transition-colors font-medium">
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
                  { label: "Suivi de l'enfant", path: '/suivi-enfant' },
                ].map((l) => (
                  <li key={l.path}>
                    <Link to={l.path} className="text-sm text-slate-300 hover:text-[#38bdf8] transition-colors font-medium">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-5">Coordonnées Officielles</h4>
              <ul className="space-y-3.5 text-sm text-slate-300 font-medium">
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
                  <span>{address}{postalAddress ? <><br /><span className="text-slate-400 text-xs">{postalAddress}</span></> : null}</span>
                </li>
                {phone && (
                  <li className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#38bdf8] shrink-0" />
                    <a href={`tel:${phone.replace(/\s+/g, '')}`} className="font-semibold text-slate-200 hover:text-[#38bdf8] transition-colors">
                      {phone}
                    </a>
                  </li>
                )}
                {email && (
                  <li className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#38bdf8] shrink-0" />
                    <a href={`mailto:${email}`} className="text-slate-200 hover:text-[#38bdf8] transition-colors">
                      {email}
                    </a>
                  </li>
                )}
                {websiteUrl && (
                  <li className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-[#38bdf8] shrink-0" />
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#38bdf8] transition-colors text-xs">
                      {websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom row / Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <span className="font-medium">© {new Date().getFullYear()} {platformName} — Tous droits réservés.</span>
            <span className="flex items-center gap-1.5 font-medium text-slate-400">
              Conçu avec <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> pour l'Éducation
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
