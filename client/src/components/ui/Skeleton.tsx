interface SkeletonProps {
  className?: string;
  lines?: number;
  circle?: boolean;
}

export const Skeleton = ({ className = '', lines = 1, circle = false }: SkeletonProps) => {
  if (circle) {
    return (
      <div className={`rounded-full bg-brand-border/50 animate-pulse ${className}`} />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-brand-border/50 rounded-lg animate-pulse"
          style={{ width: i === lines - 1 && lines > 1 ? '75%' : '100%' }}
        />
      ))}
    </div>
  );
};

export const SkeletonCard = () => (
  <div className="bg-brand-card border border-brand-border/50 rounded-xl p-6 space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-brand-border/50" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-brand-border/50 rounded w-1/3" />
        <div className="h-3 bg-brand-border/50 rounded w-1/2" />
      </div>
    </div>
    <div className="h-8 bg-brand-border/50 rounded-lg w-1/4" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-brand-card border border-brand-border/50 rounded-xl overflow-hidden animate-pulse">
    <div className="border-b border-brand-border/50 p-4 flex gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-4 bg-brand-border/50 rounded flex-1" />
      ))}
    </div>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="border-b border-brand-border/30 p-4 flex gap-4">
        {[...Array(4)].map((_, j) => (
          <div key={j} className="h-4 bg-brand-border/30 rounded flex-1" />
        ))}
      </div>
    ))}
  </div>
);
