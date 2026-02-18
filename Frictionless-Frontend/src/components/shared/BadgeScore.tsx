'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BadgeScoreProps {
  score: number;
  delta?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-score-excellent bg-score-excellent/15 border-score-excellent/30';
  if (score >= 60) return 'text-score-good bg-score-good/15 border-score-good/30';
  if (score >= 40) return 'text-score-fair bg-score-fair/15 border-score-fair/30';
  return 'text-score-poor bg-score-poor/15 border-score-poor/30';
}

function getDeltaColor(delta: number) {
  if (delta > 0) return 'text-score-excellent';
  if (delta < 0) return 'text-score-poor';
  return 'text-muted-foreground';
}

const sizes = {
  sm: 'h-6 px-2 text-xs gap-1',
  md: 'h-8 px-3 text-sm gap-1.5',
  lg: 'h-10 px-4 text-base gap-2',
};

export function BadgeScore({ score, delta, size = 'md', className }: BadgeScoreProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-bold',
        getScoreColor(score),
        sizes[size],
        className
      )}
    >
      <span>{score}</span>
      {delta !== undefined && delta !== 0 && (
        <span className={cn('flex items-center text-[10px] font-semibold', getDeltaColor(delta))}>
          {delta > 0 ? (
            <TrendingUp className="w-3 h-3 mr-0.5" />
          ) : (
            <TrendingDown className="w-3 h-3 mr-0.5" />
          )}
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
      {delta === 0 && (
        <Minus className="w-3 h-3 text-muted-foreground" />
      )}
    </div>
  );
}
