'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MomentumStripProps {
  title: string;
  icon: LucideIcon;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
  confidence?: number;
  completeness?: number;
  subItems?: { label: string; value: string | number }[];
  variant?: 'card' | 'chip';
  className?: string;
}

export function MomentumStrip({
  title,
  icon: Icon,
  value,
  trend = 'flat',
  trendLabel,
  confidence,
  completeness,
  subItems,
  variant = 'card',
  className,
}: MomentumStripProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-score-excellent' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  if (variant === 'chip') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-card/50',
          className,
        )}
      >
        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {title}
        </span>
        <span className="text-sm font-mono font-bold text-foreground">{value}</span>
        {trendLabel && (
          <span className={cn('flex items-center gap-0.5 text-[10px] font-medium', trendColor)}>
            <TrendIcon className="w-2.5 h-2.5" />
            {trendLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card/50',
        className
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-lg font-mono font-bold text-foreground">{value}</span>
          {trendLabel && (
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendColor)}>
              <TrendIcon className="w-3 h-3" />
              {trendLabel}
            </span>
          )}
        </div>
        {(confidence != null || completeness != null || (subItems && subItems.length > 0)) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
            {confidence != null && (
              <span>Confidence: {Math.round(confidence)}%</span>
            )}
            {completeness != null && (
              <span>Completeness: {Math.round(completeness)}%</span>
            )}
            {subItems?.map((s, i) => (
              <span key={i}>
                {s.label}: {s.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
