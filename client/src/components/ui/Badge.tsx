interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent' | 'violet';
  size?: 'sm' | 'md';
  dot?: boolean;
  glow?: boolean;
}

const variants: Record<string, { base: string; dot: string }> = {
  success:  { base: 'bg-[#189CD8]/10 text-[#1280B2] border-[#189CD8]/25', dot: 'bg-[#189CD8]' },
  warning:  { base: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500' },
  danger:   { base: 'bg-red-500/10 text-red-600 border-red-500/20', dot: 'bg-red-500' },
  info:     { base: 'bg-blue-500/10 text-blue-600 border-blue-500/20', dot: 'bg-blue-500' },
  neutral:  { base: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  accent:   { base: 'bg-[#189CD8]/10 text-[#1280B2] border-[#189CD8]/25', dot: 'bg-[#189CD8]' },
  violet:   { base: 'bg-violet-500/10 text-violet-600 border-violet-500/20', dot: 'bg-violet-500' },
};

const glowMap: Record<string, string> = {
  success:  'shadow-[0_0_10px_rgba(24,156,216,0.2)]',
  warning:  'shadow-[0_0_10px_rgba(245,158,11,0.15)]',
  danger:   'shadow-[0_0_10px_rgba(239,68,68,0.15)]',
  info:     'shadow-[0_0_10px_rgba(59,130,246,0.15)]',
  neutral:  '',
  accent:   'shadow-[0_0_10px_rgba(24,156,216,0.25)]',
  violet:   'shadow-[0_0_10px_rgba(139,92,246,0.15)]',
};

export const Badge = ({ children, variant = 'neutral', size = 'sm', dot = false, glow = false }: BadgeProps) => {
  const v = variants[variant];
  const glowClass = glow ? glowMap[variant] : '';
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 font-bold border rounded-full backdrop-blur-sm
      ${v.base} ${glowClass}
      ${size === 'sm' ? 'text-[10px] px-2.5 py-0.5 uppercase tracking-wider' : 'text-xs px-3 py-1 tracking-wide'}
    `}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${v.dot} ${glow ? 'shadow-[0_0_6px_currentColor]' : ''}`} />
      )}
      {children}
    </span>
  );
};

export const RoleBadge = ({ role }: { role: string }) => {
  const config: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    SUPER_ADMIN: { label: 'Super Admin', variant: 'danger' },
    DIRECTEUR:   { label: 'Directeur', variant: 'accent' },
    EDUCATEUR:   { label: 'Éducateur', variant: 'warning' },
    ENSEIGNANT:  { label: 'Enseignant', variant: 'info' },
    APPRENANT:   { label: 'Apprenant', variant: 'violet' },
  };
  const c = config[role] || { label: role, variant: 'neutral' as const };
  return <Badge variant={c.variant} dot glow>{c.label}</Badge>;
};

export const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    BROUILLON: { label: 'Brouillon', variant: 'neutral' },
    SOUMIS:    { label: 'Soumis', variant: 'warning' },
    VALIDE:    { label: 'Validé', variant: 'success' },
    ACTIF:     { label: 'Actif', variant: 'accent' },
    INACTIF:   { label: 'Inactif', variant: 'neutral' },
    PUBLIE:    { label: 'Publié', variant: 'info' },
  };
  const c = config[status] || { label: status, variant: 'neutral' as const };
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
};
