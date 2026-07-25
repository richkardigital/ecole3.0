import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  accentColor?: 'green' | 'cyan' | 'violet' | 'amber';
}

const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

const accentMap = {
  green:  { from: '#10b981', to: '#059669' },
  cyan:   { from: '#06b6d4', to: '#0284c7' },
  violet: { from: '#8b5cf6', to: '#7c3aed' },
  amber:  { from: '#f59e0b', to: '#d97706' },
};

export const Modal = ({ isOpen, onClose, title, children, size = 'md', footer, accentColor = 'green' }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const accent = accentMap[accentColor];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 animate-fade-in transition-opacity"
        style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeMap[size]} animate-fade-in-up flex flex-col max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl z-10`}
        style={{
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 70px -10px rgba(15, 23, 42, 0.25)',
        }}
        role="dialog" aria-modal="true"
      >
        {/* Gradient top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl"
          style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
        />

        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-6 py-4.5 shrink-0 relative bg-white"
            style={{ borderBottom: '1px solid #F1F5F9' }}
          >
            <h2 className="text-lg font-black text-slate-900 tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-6 py-4 flex items-center justify-end gap-3 shrink-0 bg-slate-50"
            style={{ borderTop: '1px solid #E2E8F0' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
