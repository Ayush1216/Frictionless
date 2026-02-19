'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {icon && (
        <div
          className="flex items-center justify-center w-14 h-14 rounded-full mb-4"
          style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-muted)' }}
        >
          {icon}
        </div>
      )}
      <h3
        className="text-base font-semibold mb-1"
        style={{ color: 'var(--fi-text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-sm max-w-sm mb-4"
          style={{ color: 'var(--fi-text-tertiary)' }}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
