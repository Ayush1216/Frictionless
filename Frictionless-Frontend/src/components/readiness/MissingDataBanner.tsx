'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissingItem {
  item: string;
  severity: 'high' | 'medium' | 'low';
}

interface MissingDataBannerProps {
  items: MissingItem[];
}

const severityConfig = {
  high: {
    color: 'bg-score-poor/20 text-score-poor border-score-poor/30',
    label: 'High',
  },
  medium: {
    color: 'bg-score-fair/20 text-score-fair border-score-fair/30',
    label: 'Medium',
  },
  low: {
    color: 'bg-obsidian-600/50 text-obsidian-300 border-obsidian-500/30',
    label: 'Low',
  },
};

export function MissingDataBanner({ items }: MissingDataBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const highCount = items.filter((i) => i.severity === 'high').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn(
        'glass-card overflow-hidden border-l-4',
        highCount > 0 ? 'border-l-score-poor' : 'border-l-score-fair'
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 lg:px-6 text-left hover:bg-obsidian-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            highCount > 0
              ? 'bg-score-poor/15 animate-pulse-glow'
              : 'bg-score-fair/15'
          )}>
            <AlertTriangle className={cn(
              'w-5 h-5',
              highCount > 0 ? 'text-score-poor' : 'text-score-fair'
            )} />
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
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 lg:px-6 pb-4 space-y-2">
              {items.map((item) => {
                const config = severityConfig[item.severity];
                return (
                  <div
                    key={item.item}
                    className="flex items-center justify-between p-3 rounded-lg bg-obsidian-800/50 border border-obsidian-600/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-foreground">{item.item}</span>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border',
                          config.color
                        )}
                      >
                        {config.label}
                      </span>
                    </div>
                    <button className="text-xs text-electric-blue hover:text-electric-blue/80 flex items-center gap-1 shrink-0 transition-colors">
                      Fix Now
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
