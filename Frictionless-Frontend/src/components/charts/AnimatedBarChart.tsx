'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#3B82F6';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
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
    <div className={cn('space-y-3', className)}>
      {sorted.map((cat, i) => {
        const color = getBarColor(cat.score);
        return (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-body text-muted-foreground truncate pr-3">
                {cat.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-mono font-medium text-foreground">
                  {cat.score}
                </span>
                <DeltaIndicator delta={cat.delta} />
              </div>
            </div>
            <div className="h-2 rounded-full bg-obsidian-700/50 overflow-hidden">
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
      <span className="flex items-center gap-0.5 text-xs font-mono text-score-excellent">
        <TrendingUp className="w-3 h-3" />
        +{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-mono text-score-poor">
        <TrendingDown className="w-3 h-3" />
        {delta}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs font-mono text-obsidian-400">
      <Minus className="w-3 h-3" />
      0
    </span>
  );
}
