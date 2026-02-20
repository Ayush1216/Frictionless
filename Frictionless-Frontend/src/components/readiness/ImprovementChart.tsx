'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import { useAnimatedCounter } from '@/lib/hooks/useAnimatedCounter';

interface MissingItem {
  item: string;
  severity: 'high' | 'medium' | 'low';
}

export interface RecommendedTask {
  taskTitle: string;
  impactPoints: number;
  projectedScore: number;
}

interface ImprovementChartProps {
  currentScore: number;
  /** From rubric: lowest category → highest-impact task (overrides missingData when set). */
  recommendedTask?: RecommendedTask | null;
  /** Fallback when no rubric / recommendedTask (e.g. dummy missing_data). */
  missingData?: MissingItem[];
}

function getImpact(severity: 'high' | 'medium' | 'low'): number {
  if (severity === 'high') return 5;
  if (severity === 'medium') return 3;
  return 1;
}

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Pick the single item with highest potential (impact); tie-break by severity (high first). */
function pickHighestPotential(missingData: MissingItem[]): MissingItem & { impact: number } | null {
  if (missingData.length === 0) return null;
  let best = missingData[0];
  let bestImpact = getImpact(best.severity);
  for (let i = 1; i < missingData.length; i++) {
    const impact = getImpact(missingData[i].severity);
    if (impact > bestImpact || (impact === bestImpact && SEVERITY_ORDER[missingData[i].severity] < SEVERITY_ORDER[best.severity])) {
      best = missingData[i];
      bestImpact = impact;
    }
  }
  return { ...best, impact: bestImpact };
}

const MAX_IMPACT_POINTS = 8;

export function ImprovementChart({
  currentScore,
  recommendedTask,
  missingData = [],
}: ImprovementChartProps) {
  const fallbackItem = useMemo(() => pickHighestPotential(missingData), [missingData]);
  const topItem = recommendedTask
    ? {
        item: recommendedTask.taskTitle,
        impact: recommendedTask.impactPoints,
        projectedScore: recommendedTask.projectedScore,
      }
    : fallbackItem
      ? {
          item: fallbackItem.item,
          impact: fallbackItem.impact,
          projectedScore: Math.min(100, Math.round((currentScore + fallbackItem.impact) * 10) / 10),
        }
      : null;

  const projectedScore = topItem?.projectedScore ?? currentScore;
  const animatedProjected = useAnimatedCounter(projectedScore, { duration: 1200 });

  const barFillPercent = topItem
    ? Math.min(100, (topItem.impact / MAX_IMPACT_POINTS) * 100)
    : 0;

  const hasNothingToShow = !topItem && missingData.length === 0;
  if (hasNothingToShow) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="fi-card p-6 lg:p-8"
      >
        <div className="flex flex-col items-center text-center py-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'var(--fi-score-excellent-bg)' }}
          >
            <Sparkles className="w-6 h-6" style={{ color: 'var(--fi-score-excellent)' }} />
          </div>
          <h3 className="text-lg font-display font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
            All Data Complete
          </h3>
          <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--fi-text-muted)' }}>
            You have no missing data items. Your score reflects your full Frictionless profile.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="fi-card p-4 lg:p-6"
    >
      {/* Header: one task with highest potential */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-display font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
            Score Improvement Potential
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fi-text-muted)' }}>
            Fix 1 item to improve your score
          </p>
        </div>
        {topItem && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: 'var(--fi-score-excellent-bg)',
              color: 'var(--fi-score-excellent)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            +{topItem.impact}
          </div>
        )}
      </div>

      {/* Current → Projected score bar */}
      <div
        className="flex items-center gap-4 mb-5 p-3 rounded-lg"
        style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
      >
        <div className="text-center shrink-0">
          <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Current</p>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--fi-text-primary)' }}>{currentScore}</p>
        </div>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--fi-primary), var(--fi-score-excellent))' }}
              initial={{ width: `${currentScore}%` }}
              animate={{ width: `${projectedScore}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className="text-center shrink-0">
          <p className="text-xs" style={{ color: 'var(--fi-score-excellent)' }}>Projected</p>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--fi-score-excellent)' }}>
            {Math.round(animatedProjected)}
          </p>
        </div>
      </div>

      {/* Single task: from rubric (lowest category → highest impact) or fallback */}
      {topItem && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>{topItem.item}</p>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--fi-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${barFillPercent}%` }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--fi-text-muted)' }}>
            <span>0</span>
            <span>0.25</span>
            <span>0.5</span>
            <span>0.75</span>
            <span>1</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
