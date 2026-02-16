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
    <div className="glass-card px-3 py-2 text-xs border border-obsidian-600/50 max-w-[200px]">
      <p className="text-foreground font-semibold">{data.label}</p>
      <p className="text-electric-blue font-bold text-sm mt-0.5">{data.score}/100</p>
      <p className="text-muted-foreground mt-1">{data.detail}</p>
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
      className="glass-card p-4 lg:p-6"
    >
      <h3 className="text-sm font-display font-semibold text-foreground mb-4">
        Match Breakdown
      </h3>
      <div className="h-[280px] lg:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid
              stroke="rgba(75, 85, 99, 0.3)"
              gridType="polygon"
            />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fill: '#6B7280', fontSize: 9 }}
              tickCount={5}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
