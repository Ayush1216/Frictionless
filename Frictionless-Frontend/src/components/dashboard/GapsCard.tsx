'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MissingItem {
  item: string;
  severity: 'high' | 'medium' | 'low';
  /** Optional task id to open when clicking this gap */
  taskId?: string;
}

interface GapsCardProps {
  missingData: MissingItem[];
  className?: string;
}

// Aligned with Active Tasks: red = high, yellow/orange = medium, green = low
const severityConfig = {
  high: {
    badge: 'bg-score-poor/15 text-score-poor border-score-poor/20',
    label: 'High',
  },
  medium: {
    badge: 'bg-score-fair/15 text-score-fair border-score-fair/20',
    label: 'Medium',
  },
  low: {
    badge: 'bg-score-excellent/15 text-score-excellent border-score-excellent/20',
    label: 'Low',
  },
};

export function GapsCard({ missingData, className }: GapsCardProps) {
  if (!missingData.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={cn('glass-card p-6', className)}
      >
        <h3 className="text-sm font-body font-medium text-muted-foreground mb-4">
          Biggest Gaps
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-score-excellent/10 flex items-center justify-center mb-3">
            <span className="text-lg">&#10003;</span>
          </div>
          <p className="text-sm text-muted-foreground">No missing data items!</p>
          <p className="text-xs text-muted-foreground mt-1">Your profile is complete.</p>
        </div>
      </motion.div>
    );
  }

  const items = missingData.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn('glass-card p-6 flex flex-col', className)}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-sm font-body font-medium text-muted-foreground">
          Biggest Gaps
        </h3>
        <AlertTriangle className="w-4 h-4 text-score-fair" />
      </div>
      <div className="flex flex-1 flex-col gap-3 min-h-[200px]">
        {items.map((item, i) => {
          const config = severityConfig[item.severity];
          const href = item.taskId
            ? `/startup/tasks?task=${encodeURIComponent(item.taskId)}`
            : '/startup/tasks';
          return (
            <Link
              key={`${item.item}-${i}`}
              href={href}
              className="flex-1 min-h-0 flex flex-col"
            >
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors group cursor-pointer h-full"
              >
                <span
                  className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0',
                    config.badge,
                  )}
                >
                  {config.label}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground truncate block">{item.item}</span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    Fix now
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
