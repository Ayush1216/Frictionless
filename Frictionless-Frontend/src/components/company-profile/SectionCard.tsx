'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
  /** Minimum height in rem for grid alignment */
  minHeightRem?: number;
  className?: string;
  headerAction?: React.ReactNode;
}

/**
 * Consistent section card: balanced padding, radius, borders.
 * Use for Overview, Contact, AI Insights, etc. for visual alignment.
 */
export function SectionCard({
  title,
  icon: Icon,
  iconClassName = 'text-primary',
  children,
  minHeightRem,
  className,
  headerAction,
}: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-2xl border border-border/50 bg-background/40 overflow-hidden flex flex-col',
        'transition-shadow hover:shadow-lg hover:shadow-black/10',
        className
      )}
      style={minHeightRem != null ? { minHeight: `${minHeightRem}rem` } : undefined}
    >
      <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-border/30">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 truncate">
          {Icon && <Icon className={cn('w-5 h-5 shrink-0', iconClassName)} />}
          {title}
        </h3>
        {headerAction}
      </div>
      <div className="p-6 pt-4 flex-1 flex flex-col min-w-0">{children}</div>
    </motion.div>
  );
}
