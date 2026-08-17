import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string | React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string;
  badgeVariant?: 'brand' | 'green' | 'cyan' | 'violet' | 'amber' | 'rose';
}

export function PageHeader({ title, description, subtitle, action, children, icon, badge, badgeVariant = 'brand' }: PageHeaderProps) {
  const desc = description || subtitle;
  
  const badgeColors = {
    brand: 'chip-brand',
    green: 'chip-brand',
    cyan: 'chip-cyan',
    violet: 'chip-violet',
    amber: 'chip-amber',
    rose: 'chip-rose',
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-accent/10 border border-brand-accent/20 shadow-[0_0_20px_rgba(24,156,216,0.15)] text-brand-accent shrink-0">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight gradient-text-white leading-none">{title}</h1>
            {badge && (
              <span className={`chip ${badgeColors[badgeVariant]} hidden sm:inline-flex`}>
                {badge}
              </span>
            )}
          </div>
          {desc && (
            <p className="text-sm text-brand-text-muted font-medium leading-relaxed mt-1.5">
              {desc}
            </p>
          )}
        </div>
      </div>
      {(action || children) && (
        <div className="flex-shrink-0 flex items-center gap-2.5 w-full sm:w-auto">
          {children}
          {action}
        </div>
      )}
    </div>
  );
}
