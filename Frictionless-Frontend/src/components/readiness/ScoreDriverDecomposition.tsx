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
      className={cn('fi-card p-6', className)}
    >
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fi-text-primary)' }}>Score Driver Decomposition</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--fi-text-muted)' }}>
        What&apos;s helping and hurting your readiness score
      </p>

      {confidence != null && (
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 flex-1 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${confidence}%`, background: 'var(--fi-primary)' }}
            />
          </div>
          <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Confidence: {confidence}%</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {positive.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--fi-score-excellent)' }}>
              <TrendingUp className="w-3 h-3" />
              Positive drivers
            </h4>
            <ul className="space-y-2">
              {positive.map((d, i) => (
                <li key={i} className="text-sm flex justify-between gap-2">
                  <span className="truncate" style={{ color: 'var(--fi-text-primary)' }}>{d.name}</span>
                  <span className="font-mono shrink-0" style={{ color: 'var(--fi-score-excellent)' }}>+{d.impact}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {negative.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--fi-score-need-improvement)' }}>
              <TrendingDown className="w-3 h-3" />
              Negative drivers
            </h4>
            <ul className="space-y-2">
              {negative.map((d, i) => (
                <li key={i} className="text-sm flex justify-between gap-2">
                  <span className="truncate" style={{ color: 'var(--fi-text-primary)' }}>{d.name}</span>
                  <span className="font-mono shrink-0" style={{ color: 'var(--fi-score-need-improvement)' }}>-{Math.abs(d.impact)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {drivers.length === 0 && (
        <p className="text-sm py-4" style={{ color: 'var(--fi-text-muted)' }}>Run an assessment to see score drivers.</p>
      )}
    </motion.div>
  );
}
