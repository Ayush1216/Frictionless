'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  suffix?: string;
  className?: string;
}

export function TrendIndicator({ value, suffix = '', className }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-mono font-medium',
        className,
      )}
      style={{
        color: isPositive
          ? 'var(--fi-score-excellent)'
          : isNegative
            ? 'var(--fi-score-need-improvement)'
            : 'var(--fi-text-muted)',
      }}
    >
      {isPositive && <TrendingUp className="w-3.5 h-3.5" />}
      {isNegative && <TrendingDown className="w-3.5 h-3.5" />}
      {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5" />}
      {isPositive ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
}
