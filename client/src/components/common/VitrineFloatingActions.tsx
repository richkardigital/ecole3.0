import React, { useState, useEffect } from 'react';
import { ChevronUp, MessageCircle } from 'lucide-react';

interface VitrineFloatingActionsProps {
  whatsappNumber?: string;
  whatsappMessage?: string;
}

export const VitrineFloatingActions: React.FC<VitrineFloatingActionsProps> = ({
  whatsappNumber = '2250700000000',
  whatsappMessage = "Bonjour SEEEC École 3.0, je souhaite avoir des informations sur la plateforme scolaire.",
}) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isHoveredWhatsapp, setIsHoveredWhatsapp] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <aside aria-label="Actions rapides" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      
      {/* ── BOUTON RETOUR EN HAUT (SCROLL TO TOP) ── */}
      <button
        onClick={scrollToTop}
        aria-label="Retourner en haut de la page"
        className={`pointer-events-auto w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-[#189CD8] hover:border-[#189CD8]/40 hover:bg-[#189CD8]/10 shadow-lg hover:shadow-xl group hover:-translate-y-1 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        title="Retourner en haut"
      >
        <ChevronUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
      </button>

      {/* ── BOUTON WHATSAPP FLOTTANT ── */}
      <div 
        className="pointer-events-auto relative flex items-center"
        onMouseEnter={() => setIsHoveredWhatsapp(true)}
        onMouseLeave={() => setIsHoveredWhatsapp(false)}
      >
        {/* Tooltip / Message flottant */}
        <div
          className={`absolute right-16 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold whitespace-nowrap shadow-xl border border-slate-800 transition-all duration-200 pointer-events-none flex items-center gap-2 ${
            isHoveredWhatsapp ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Discuter sur WhatsApp</span>
          <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-slate-900 rotate-45 border-t border-r border-slate-800" />
        </div>

        {/* Bouton principal WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactez l'équipe SEEEC École 3.0 sur WhatsApp"
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
          }}
        >
          {/* Pulsing ring */}
          <span 
            className="absolute inset-0 rounded-2xl animate-ping opacity-25 pointer-events-none"
            style={{ background: '#25D366' }}
          />

          {/* WhatsApp SVG Icon */}
          <svg
            className="w-7 h-7 fill-current drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>

          {/* Badge "En ligne" */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white" />
          </span>
        </a>
      </div>
    </aside>
  );
};
