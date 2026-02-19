'use client';

import { useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowUpRight } from 'lucide-react';
import { CategoryBar } from '@/components/ui/CategoryBar';
import { chartTheme } from '@/components/charts/ChartWrapper';
import { sectionVariants, staggerContainer, staggerItem } from './storyVariants';
import { getScoreColor } from '@/lib/scores';
import type { NarrativeData } from './useNarrativeData';

const LazyResponsiveContainer = dynamic(
  () => import('recharts').then((m) => ({ default: m.ResponsiveContainer })),
  { ssr: false }
);
const LazyRadarChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.RadarChart })),
  { ssr: false }
);
const LazyPolarGrid = dynamic(
  () => import('recharts').then((m) => ({ default: m.PolarGrid })),
  { ssr: false }
);
const LazyPolarAngleAxis = dynamic(
  () => import('recharts').then((m) => ({ default: m.PolarAngleAxis })),
  { ssr: false }
);
const LazyRadar = dynamic(
  () => import('recharts').then((m) => ({ default: m.Radar })),
  { ssr: false }
);

interface ReadinessOrganismProps {
  data: NarrativeData;
}

export function ReadinessOrganism({ data }: ReadinessOrganismProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const radarData = useMemo(
    () =>
      data.readinessCategories.map((c) => ({
        category: c.name.length > 14 ? c.name.slice(0, 12) + '..' : c.name,
        fullName: c.name,
        score: c.score,
        benchmark: 85,
        fullMark: 100,
      })),
    [data.readinessCategories]
  );

  const sortedCategories = useMemo(
    () => [...data.readinessCategories].sort((a, b) => a.score - b.score),
    [data.readinessCategories]
  );

  // Projected score from top 3 gaps
  const projectedFromGaps = useMemo(() => {
    const gapPts = sortedCategories.slice(0, 3).reduce((sum, c) => {
      const gapTo85 = Math.max(85 - c.score, 0);
      return sum + Math.round(gapTo85 * (c.weight || 1 / 7));
    }, 0);
    return Math.min(data.readinessScore + gapPts, 100);
  }, [sortedCategories, data.readinessScore]);

  if (data.readinessCategories.length === 0) return null;

  return (
    <motion.div
      ref={ref}
      variants={sectionVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="fi-card fi-card-depth fi-card-shine"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
            Frictionless Breakdown
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fi-text-tertiary)' }}>
            {data.readinessCategories.length} categories &middot; investor benchmark at 85%
          </p>
        </div>
        <Link href="/startup/readiness" className="fi-btn fi-btn-ghost text-xs">
          Full Details <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Radar chart */}
        <div style={{ height: 280 }}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyRadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <LazyPolarGrid stroke={chartTheme.gridColor} />
              <LazyPolarAngleAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: chartTheme.axisColor }}
              />
              {/* Benchmark overlay */}
              <LazyRadar
                name="Benchmark"
                dataKey="benchmark"
                stroke="var(--fi-text-muted)"
                fill="none"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              {/* User score */}
              <LazyRadar
                name="Score"
                dataKey="score"
                stroke="var(--fi-primary)"
                fill="var(--fi-primary)"
                fillOpacity={0.15}
                strokeWidth={2}
                animationDuration={800}
              />
            </LazyRadarChart>
          </LazyResponsiveContainer>
        </div>

        {/* RIGHT: Category health list */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="space-y-3"
        >
          {sortedCategories.map((cat) => {
            const gap = 85 - cat.score;
            return (
              <motion.div key={cat.name} variants={staggerItem}>
                <Link href="/startup/readiness" className="block group">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <CategoryBar label={cat.name} score={cat.score} size="sm" />
                    </div>
                    {/* Gap indicator */}
                    {gap > 0 && (
                      <span
                        className="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--fi-score-need-improvement-bg)',
                          color: 'var(--fi-score-need-improvement)',
                        }}
                      >
                        -{gap}
                      </span>
                    )}
                    {gap <= 0 && (
                      <span
                        className="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--fi-score-excellent-bg)',
                          color: 'var(--fi-score-excellent)',
                        }}
                      >
                        &ge;85
                      </span>
                    )}
                    {/* Weight badge */}
                    <span
                      className="text-[10px] shrink-0"
                      style={{ color: 'var(--fi-text-muted)' }}
                    >
                      {Math.round((cat.weight || 1 / 7) * 100)}%
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Bottom: Score projection strip */}
      {projectedFromGaps > data.readinessScore && (
        <div
          className="mt-6 pt-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--fi-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--fi-text-secondary)' }}>
            Close top 3 gaps to reach{' '}
            <span className="font-bold" style={{ color: getScoreColor(projectedFromGaps) }}>
              {projectedFromGaps}%
            </span>
          </p>
          <Link href="/startup/readiness" className="fi-btn fi-btn-outline text-xs">
            View Gaps
          </Link>
        </div>
      )}
    </motion.div>
  );
}
