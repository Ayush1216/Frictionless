'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissingItem {
  item: string;
  severity: 'high' | 'medium' | 'low';
}

interface MissingDataBannerProps {
  items: MissingItem[];
}

export function MissingDataBanner({ items }: MissingDataBannerProps) {
  if (items.length === 0) return null;

  const highCount = items.filter((i) => i.severity === 'high').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn(
        'glass-card border-l-4',
        highCount > 0 ? 'border-l-score-poor' : 'border-l-score-fair'
      )}
    >
      <div className="flex items-center gap-3 p-4 lg:px-6">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            highCount > 0 ? 'bg-score-poor/15 animate-pulse-glow' : 'bg-score-fair/15'
          )}
        >
          <AlertTriangle
            className={cn(
              'w-5 h-5',
              highCount > 0 ? 'text-score-poor' : 'text-score-fair'
            )}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            You have{' '}
            <span className={highCount > 0 ? 'text-score-poor' : 'text-score-fair'}>
              {items.length} missing item{items.length !== 1 ? 's' : ''}
            </span>{' '}
            affecting your score
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {highCount > 0 && `${highCount} high priority`}
            {highCount > 0 && items.length - highCount > 0 && ' · '}
            {items.length - highCount > 0 && `${items.length - highCount} other`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
