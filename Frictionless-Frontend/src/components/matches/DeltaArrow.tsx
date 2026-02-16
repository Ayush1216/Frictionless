'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeltaArrowProps {
  delta: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DeltaArrow({ delta, showValue = true, size = 'md', className }: DeltaArrowProps) {
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (delta === 0) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-obsidian-400', className)}>
        <Minus className={iconSizes[size]} />
        {showValue && <span className={textSizes[size]}>0</span>}
      </span>
    );
  }

  const isPositive = delta > 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        isPositive ? 'text-score-excellent' : 'text-score-poor',
        className
      )}
    >
      {isPositive ? (
        <TrendingUp className={iconSizes[size]} />
      ) : (
        <TrendingDown className={iconSizes[size]} />
      )}
      {showValue && (
        <span className={textSizes[size]}>
          {isPositive ? '+' : ''}
          {delta}
        </span>
      )}
    </span>
  );
}
