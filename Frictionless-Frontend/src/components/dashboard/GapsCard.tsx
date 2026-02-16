'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissingItem {
  item: string;
  severity: 'high' | 'medium' | 'low';
}

interface GapsCardProps {
  missingData: MissingItem[];
  className?: string;
}

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
    badge: 'bg-obsidian-500/15 text-obsidian-300 border-obsidian-500/20',
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
          <p className="text-xs text-obsidian-400 mt-1">Your profile is complete.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn('glass-card p-6', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-body font-medium text-muted-foreground">
            Biggest Gaps
          </h3>
          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-mono font-bold rounded-full bg-score-poor/20 text-score-poor">
            {missingData.length}
          </span>
        </div>
        <AlertTriangle className="w-4 h-4 text-score-fair" />
      </div>
      <div className="space-y-2.5">
        {missingData.map((item, i) => {
          const config = severityConfig[item.severity];
          return (
            <motion.div
              key={item.item}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
              className="flex items-center justify-between p-3 rounded-lg bg-obsidian-700/30 border border-obsidian-600/30 hover:border-obsidian-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                    config.badge,
                  )}
                >
                  {config.label}
                </span>
                <span className="text-sm text-foreground">{item.item}</span>
              </div>
              <button className="flex items-center gap-1 text-xs font-medium text-electric-blue opacity-0 group-hover:opacity-100 transition-opacity">
                Fix now
                <ChevronRight className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
