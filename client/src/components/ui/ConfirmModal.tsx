import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'success' | 'primary';
  confirmStyle?: string;
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'warning',
}: ConfirmationModalProps) => {
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <XCircle className="w-6 h-6 text-red-600" />,
          bg: 'bg-red-50 border border-red-200 text-red-600',
          btn: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 active:scale-[0.98]',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-[#189CD8]" />,
          bg: 'bg-[#189CD8]/10 border border-[#189CD8]/25 text-[#1280B2]',
          btn: 'bg-[#189CD8] hover:bg-[#1280B2] text-white shadow-lg shadow-[#189CD8]/25 active:scale-[0.98]',
        };
      case 'primary':
        return {
          icon: <Info className="w-6 h-6 text-[#4D3E90]" />,
          bg: 'bg-[#4D3E90]/10 border border-[#4D3E90]/25 text-[#4D3E90]',
          btn: 'bg-[#4D3E90] hover:bg-[#3C2F73] text-white shadow-lg shadow-[#4D3E90]/25 active:scale-[0.98]',
        };
      default: // warning
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          bg: 'bg-amber-50 border border-amber-200 text-amber-600',
          btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/25 active:scale-[0.98]',
        };
    }
  };

  const styles = getVariantStyles();

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Full screen backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Centered Modal card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 z-10 my-auto animate-in zoom-in-95 duration-200">
        {/* Top accent bar */}
        <div className={`h-1.5 w-full ${variant === 'danger' ? 'bg-red-500' : variant === 'success' ? 'bg-[#189CD8]' : variant === 'primary' ? 'bg-[#4D3E90]' : 'bg-amber-500'}`} />

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${styles.bg}`}>
              {styles.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-slate-900 mb-1.5">
                {title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {message}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${styles.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default ConfirmationModal;
