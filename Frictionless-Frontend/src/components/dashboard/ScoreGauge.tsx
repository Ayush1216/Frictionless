'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { AnimatedGauge } from '@/components/charts/AnimatedGauge';
import { TrendIndicator } from '@/components/charts/TrendIndicator';
import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  delta: number;
  badge: string;
  lastAssessed?: string;
  className?: string;
}

export function ScoreGauge({
  score,
  delta,
  badge,
  lastAssessed = '2 hours ago',
  className,
}: ScoreGaugeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('glass-card p-6 flex flex-col items-center justify-center', className)}
    >
      <h3 className="text-sm font-body font-medium text-muted-foreground mb-4">
        Readiness Score
      </h3>
      <AnimatedGauge score={score} size={180} strokeWidth={14} />
      <div className="mt-4 flex items-center gap-3">
        <TrendIndicator value={delta} suffix=" pts" />
        <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-obsidian-700/50 capitalize">
          {badge}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-4 text-xs text-obsidian-400">
        <Clock className="w-3 h-3" />
        <span>Last assessed: {lastAssessed}</span>
      </div>
    </motion.div>
  );
}
