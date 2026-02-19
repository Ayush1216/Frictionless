'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryScore {
  name: string;
  score: number;
  delta: number;
  weight: number;
}

interface AnimatedBarChartProps {
  categories: CategoryScore[];
  className?: string;
  sortByScore?: boolean;
}

function getBarColor(score: number): string {
  if (score >= 86) return '#10B981'; // Excellent — Green
  if (score >= 81) return '#EAB308'; // Good — Yellow
  return '#EF4444';                  // Need Improvement — Red
}

export function AnimatedBarChart({
  categories,
  className,
  sortByScore = false,
}: AnimatedBarChartProps) {
  const sorted = sortByScore
    ? [...categories].sort((a, b) => a.score - b.score)
    : categories;

  return (
    <div className={cn('space-y-2.5', className)}>
      {sorted.map((cat, i) => {
        const color = getBarColor(cat.score);
        return (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-body truncate pr-3"
                style={{ color: 'var(--fi-text-secondary)' }}
              >
                {cat.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-mono font-medium" style={{ color }}>
                  {cat.score}
                </span>
                <DeltaIndicator delta={cat.delta} />
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${cat.score}%` }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-mono" style={{ color: 'var(--fi-score-excellent)' }}>
        <TrendingUp className="w-3 h-3" />
        +{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-mono" style={{ color: 'var(--fi-score-need-improvement)' }}>
        <TrendingDown className="w-3 h-3" />
        {delta}
      </span>
    );
  }
  return null;
}
