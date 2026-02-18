'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScoreDriver {
  name: string;
  score: number;
  impact: number;
  type: 'positive' | 'negative' | 'neutral';
  detail?: string;
}

interface ScoreDriverDecompositionProps {
  drivers: ScoreDriver[];
  overallScore: number;
  confidence?: number;
  className?: string;
}

export function ScoreDriverDecomposition({
  drivers,
  overallScore,
  confidence,
  className,
}: ScoreDriverDecompositionProps) {
  const positive = drivers.filter((d) => d.type === 'positive');
  const negative = drivers.filter((d) => d.type === 'negative');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('glass-card p-6', className)}
    >
      <h3 className="text-sm font-semibold text-foreground mb-1">Score Driver Decomposition</h3>
      <p className="text-xs text-muted-foreground mb-4">
        What&apos;s helping and hurting your readiness score
      </p>

      {confidence != null && (
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">Confidence: {confidence}%</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {positive.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-score-excellent uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Positive drivers
            </h4>
            <ul className="space-y-2">
              {positive.map((d, i) => (
                <li key={i} className="text-sm flex justify-between gap-2">
                  <span className="text-foreground truncate">{d.name}</span>
                  <span className="text-score-excellent font-mono shrink-0">+{d.impact}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {negative.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              Negative drivers
            </h4>
            <ul className="space-y-2">
              {negative.map((d, i) => (
                <li key={i} className="text-sm flex justify-between gap-2">
                  <span className="text-foreground truncate">{d.name}</span>
                  <span className="text-destructive font-mono shrink-0">-{Math.abs(d.impact)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {drivers.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">Run an assessment to see score drivers.</p>
      )}
    </motion.div>
  );
}
