import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ icon, title, description, actionLabel, onAction }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-16 h-16 rounded-2xl bg-brand-card border border-brand-border/50 flex items-center justify-center mb-5 shadow-lg">
      {icon || <FolderOpen className="w-8 h-8 text-brand-text-muted" />}
    </div>
    <h3 className="text-lg font-semibold text-brand-text mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-brand-text-muted max-w-md mb-6 leading-relaxed">{description}</p>
    )}
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
