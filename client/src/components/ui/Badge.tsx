interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent' | 'violet';
  size?: 'sm' | 'md';
  dot?: boolean;
  glow?: boolean;
}

const variants: Record<string, { base: string; dot: string }> = {
  success:  { base: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  warning:  { base: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  danger:   { base: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-400' },
  info:     { base: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-400' },
  neutral:  { base: 'bg-white/5 text-brand-text-muted border-white/10', dot: 'bg-brand-text-muted' },
  accent:   { base: 'bg-brand-accent/10 text-brand-accent border-brand-accent/20', dot: 'bg-brand-accent' },
  violet:   { base: 'bg-violet-500/10 text-violet-400 border-violet-500/20', dot: 'bg-violet-400' },
};

const glowMap: Record<string, string> = {
  success:  'shadow-[0_0_10px_rgba(16,185,129,0.15)]',
  warning:  'shadow-[0_0_10px_rgba(245,158,11,0.15)]',
  danger:   'shadow-[0_0_10px_rgba(239,68,68,0.15)]',
  info:     'shadow-[0_0_10px_rgba(59,130,246,0.15)]',
  neutral:  '',
  accent:   'shadow-[0_0_10px_rgba(34,197,94,0.2)]',
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
