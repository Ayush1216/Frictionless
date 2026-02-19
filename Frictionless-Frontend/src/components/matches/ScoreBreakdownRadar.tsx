'use client';

import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface BreakdownDimension {
  dimension: string;
  score: number;
  weight: number;
  detail: string;
}

interface ScoreBreakdownRadarProps {
  breakdown: BreakdownDimension[];
}

const DIMENSION_LABELS: Record<string, string> = {
  sector_fit: 'Sector Fit',
  stage_fit: 'Stage Fit',
  thesis_alignment: 'Thesis',
  check_size_fit: 'Check Size',
  traction_match: 'Traction',
  team_quality: 'Team',
  market_size: 'Market',
};

interface TooltipPayloadItem {
  payload: {
    dimension: string;
    score: number;
    detail: string;
    label: string;
  };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div
      className="fi-card px-3 py-2 text-xs max-w-[200px]"
      style={{ padding: '8px 12px', boxShadow: 'var(--fi-shadow-md)' }}
    >
      <p className="font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{data.label}</p>
      <p className="font-bold text-sm mt-0.5" style={{ color: 'var(--fi-primary)' }}>{data.score}/100</p>
      <p className="mt-1" style={{ color: 'var(--fi-text-muted)' }}>{data.detail}</p>
    </div>
  );
}

export function ScoreBreakdownRadar({ breakdown }: ScoreBreakdownRadarProps) {
  const data = breakdown.map((d) => ({
    ...d,
    label: DIMENSION_LABELS[d.dimension] ?? d.dimension,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fi-card p-4 lg:p-6"
    >
      <h3 className="text-sm font-display font-semibold mb-4" style={{ color: 'var(--fi-text-primary)' }}>
        Match Breakdown
      </h3>
      <div className="h-[280px] lg:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid
              stroke="var(--fi-border)"
              gridType="polygon"
            />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: 'var(--fi-text-muted)', fontSize: 11 }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--fi-text-muted)', fontSize: 10 }}
              tickCount={5}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="var(--fi-primary)"
              fill="var(--fi-primary)"
              fillOpacity={0.2}
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
