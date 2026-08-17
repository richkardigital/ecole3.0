import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sparkles, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/common/BrandLogo';

const NAV_LINKS = [
  { name: 'Accueil', path: '/' },
  { name: 'Fonctionnalités', path: '/fonctionnalites' },
  { name: 'À propos de nous', path: '/a-propos' },
  { name: 'Tarifs', path: '/tarifs' },
  { name: 'FAQ', path: '/faq' },
];

export const VitrineNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${scrolled ? '#CBD5E1' : '#E2E8F0'}`,
        boxShadow: scrolled ? '0 4px 20px -2px rgba(15, 23, 42, 0.05)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20" style={{ height: '5rem' }}>
          
          {/* Logo */}
          <BrandLogo size="md" to="/" subtitle="SEEEC" />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    color: isActive ? '#189CD8' : '#64748B',
                    background: isActive ? 'rgba(24,156,216,0.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(24,156,216,0.25)' : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#0F172A'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#64748B'; }}
                >
                  {link.name}
                  {isActive && (
                    <span
                      className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: '#189CD8', boxShadow: '0 0 6px rgba(24,156,216,0.8)' }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-bold text-slate-700 hover:text-slate-900">
                Se connecter
              </Button>
            </Link>
            <Link to="/inscription">
              <Button variant="glow" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                S'inscrire
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl transition-all duration-200 text-slate-500 hover:text-slate-900"
            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div
          className="md:hidden px-4 py-5 space-y-1 animate-fade-in-down"
          style={{ borderTop: '1px solid #E2E8F0', background: 'rgba(255, 255, 255, 0.98)' }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  color: isActive ? '#189CD8' : '#475569',
                  background: isActive ? 'rgba(24,156,216,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(24,156,216,0.25)' : '1px solid transparent',
                }}
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="pt-4 space-y-3">
            <Link to="/login" onClick={() => setIsOpen(false)}>
              <Button variant="outline" size="md" className="w-full">Se connecter</Button>
            </Link>
            <Link to="/inscription" onClick={() => setIsOpen(false)}>
              <Button variant="glow" size="md" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Inscrire mon école
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
