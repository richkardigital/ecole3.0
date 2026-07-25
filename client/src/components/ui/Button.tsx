import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'glass' | 'glow';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center font-bold rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed select-none transition-all duration-200 active:scale-[0.97]';

  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5',
    secondary: 'bg-white text-slate-800 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    outline: 'bg-white border border-slate-250 text-slate-700 hover:border-slate-350 hover:bg-slate-50 hover:text-slate-900 shadow-xs',
    glass: 'bg-white/80 backdrop-blur-xl border border-slate-200 text-slate-800 hover:bg-white hover:border-slate-300 shadow-xs',
    glow: 'bg-emerald-600 text-white font-black shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_0_1px_rgba(16,185,129,0.6),0_8px_24px_rgba(16,185,129,0.45)] hover:-translate-y-0.5',
  };

  const sizes = {
    xs: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
    sm: 'text-xs px-3.5 py-2 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-sm px-6 py-3 gap-2.5',
    xl: 'text-base px-8 py-4 gap-3',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';
