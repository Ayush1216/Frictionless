'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import { getScoreInfo } from '@/lib/score-utils';
import type { ParsedRubricCategory } from '@/lib/readiness-rubric';

interface ReadinessRadarChartProps {
  categories: ParsedRubricCategory[];
  className?: string;
}

function shortenName(name: string): string {
  const map: Record<string, string> = {
    'Storytelling & Pitch': 'Storytelling',
    'Storytelling Comms': 'Storytelling',
    'Founder & Team': 'Team',
    'Founder Team': 'Team',
    'Product & Technology': 'Product',
    'Product Market': 'Product',
    'Foundational Setup': 'Foundation',
    'Metrics & Financials': 'Metrics',
    'Metrics Financial': 'Metrics',
    'Go-To-Market Strategy': 'GTM',
    'GTM Strategy': 'GTM',
    'Traction & Validation': 'Traction',
    'Traction Validation': 'Traction',
  };
  return map[name] ?? (name.length > 12 ? name.slice(0, 10) + '...' : name);
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; score: number; fullName: string } }[] }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const info = getScoreInfo(data.score);
  return (
    <div className="glass-card px-3 py-2 text-xs border border-border/50 shadow-lg">
      <p className="font-semibold text-foreground">{data.fullName}</p>
      <div className="flex items-center gap-2 mt-1">
        <div className={cn('w-2 h-2 rounded-full', info.dotClass)} />
        <span className="text-lg font-bold tabular-nums" style={{ color: info.color }}>{data.score}</span>
        <span className={cn('text-xs', info.textClass)}>{info.label}</span>
      </div>
    </div>
  );
}

export function ReadinessRadarChart({ categories, className }: ReadinessRadarChartProps) {
  const data = useMemo(() =>
    categories.map((cat) => ({
      name: shortenName(cat.name),
      fullName: cat.name,
      score: cat.score,
      fullMark: 100,
    })),
    [categories]
  );

  if (categories.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn('glass-card p-4 flex flex-col', className)}
    >
      <h3 className="text-sm font-display font-semibold text-foreground mb-1 shrink-0">Category Radar</h3>
      <p className="text-[10px] text-muted-foreground mb-2 shrink-0">Strengths &amp; gaps at a glance</p>

      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border) / 0.3)" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="hsl(var(--primary))"
              fillOpacity={0.15}
              dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
