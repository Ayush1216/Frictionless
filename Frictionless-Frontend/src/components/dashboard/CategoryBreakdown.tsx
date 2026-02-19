'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { AnimatedBarChart } from '@/components/charts/AnimatedBarChart';
import { cn } from '@/lib/utils';

interface Category {
  name: string;
  score: number;
  delta: number;
  weight: number;
}

interface CategoryBreakdownProps {
  categories: Category[];
  className?: string;
}

export function CategoryBreakdown({ categories, className }: CategoryBreakdownProps) {
  const sorted = [...categories].sort((a, b) => a.score - b.score);
  const lowestCategory = sorted[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={cn('fi-card p-6', className)}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-body font-medium" style={{ color: 'var(--fi-text-secondary)' }}>
          Category Breakdown
        </h3>
        <span className="text-xs font-mono" style={{ color: 'var(--fi-text-muted)' }}>
          {categories.length} categories
        </span>
      </div>
      <AnimatedBarChart categories={sorted} />
      {lowestCategory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-5 pt-4"
          style={{ borderTop: '1px solid var(--fi-border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: 'var(--fi-score-good)' }} />
              <span className="text-sm" style={{ color: 'var(--fi-text-secondary)' }}>
                Focus area: <span className="font-medium" style={{ color: 'var(--fi-text-primary)' }}>{lowestCategory.name}</span>
              </span>
            </div>
            <button className="text-xs font-medium transition-colors" style={{ color: 'var(--fi-primary)' }}>
              Improve
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
