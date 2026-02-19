'use client';

import { cn } from '@/lib/utils';
import { getScoreColor, getScoreLabel, getScoreBgColor } from '@/lib/scores';

interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ScoreBadge({ score, showLabel = true, size = 'md' }: ScoreBadgeProps) {
  const color = getScoreColor(score);
  const bgColor = getScoreBgColor(score);
  const label = getScoreLabel(score);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
      style={{ background: bgColor }}
    >
      <span
        className={cn('rounded-full shrink-0', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')}
        style={{ background: color }}
      />
      <span className="font-bold" style={{ color }}>{score}</span>
      {showLabel && (
        <span style={{ color, opacity: 0.8 }}>{label}</span>
      )}
    </span>
  );
}
