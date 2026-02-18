'use client';

import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  todo: 'bg-border/50 text-muted-foreground border-muted-foreground/30',
  in_progress: 'bg-primary/15 text-primary border-primary/30',
  done: 'bg-score-excellent/15 text-score-excellent border-score-excellent/30',
  trash: 'bg-destructive/15 text-destructive border-destructive/30',
  // Generic statuses
  active: 'bg-score-excellent/15 text-score-excellent border-score-excellent/30',
  pending: 'bg-score-fair/15 text-score-fair border-score-fair/30',
  new: 'bg-accent/15 text-accent border-accent/30',
  viewed: 'bg-accent/15 text-accent border-accent/30',
  saved: 'bg-score-fair/15 text-score-fair border-score-fair/30',
  contacted: 'bg-score-excellent/15 text-score-excellent border-score-excellent/30',
  passed: 'bg-border/50 text-muted-foreground border-muted-foreground/30',
};

const statusLabels: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  trash: 'Trash',
};

interface StatusChipProps {
  status: string;
  variant?: 'default' | 'outline';
  className?: string;
}

export function StatusChip({ status, variant = 'default', className }: StatusChipProps) {
  const style = statusStyles[status] || statusStyles.pending;
  const label = statusLabels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors',
        variant === 'outline' ? 'bg-transparent' : '',
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
