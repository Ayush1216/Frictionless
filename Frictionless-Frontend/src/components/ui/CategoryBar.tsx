'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getScoreColor } from '@/lib/scores';

interface CategoryBarProps {
  label: string;
  score: number;
  maxScore?: number;
  showScore?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  onClick?: () => void;
  className?: string;
}

const heightMap = { sm: 6, md: 8, lg: 12 };

export function CategoryBar({
  label,
  score,
  maxScore = 100,
  showScore = true,
  showLabel = true,
  size = 'md',
  animated = true,
  onClick,
  className,
}: CategoryBarProps) {
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;
  const [width, setWidth] = useState(animated ? 0 : pct);
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const animationRan = useRef(false);

  useEffect(() => {
    if (!animated || animationRan.current) {
      setWidth(pct);
      setDisplayScore(score);
      return;
    }
    animationRan.current = true;
    requestAnimationFrame(() => setWidth(pct));

    // Count-up animation for score number
    const duration = 600;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [pct, animated, score]);

  const barColor = getScoreColor(score);
  const h = heightMap[size];

  return (
    <div
      className={cn('flex flex-col gap-1.5', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      {(showLabel || showScore) && (
        <div className="flex items-center justify-between">
          {showLabel && (
            <span
              className="text-sm font-medium truncate"
              style={{ color: 'var(--fi-text-secondary)' }}
            >
              {label}
            </span>
          )}
          {showScore && (
            <span
              className="text-sm font-semibold tabular-nums shrink-0 ml-3"
              style={{ color: barColor }}
            >
              {Math.round(displayScore)}
            </span>
          )}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: h, background: 'var(--fi-bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            background: barColor,
            transition: animated ? 'width 600ms cubic-bezier(0.33, 1, 0.68, 1)' : 'none',
          }}
        />
      </div>
    </div>
  );
}
