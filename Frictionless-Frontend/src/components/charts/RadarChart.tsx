'use client';

import {
  ResponsiveContainer,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import { cn } from '@/lib/utils';

interface RadarDataPoint {
  dimension: string;
  score: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  color?: string;
  size?: number;
  className?: string;
}

export function RadarChart({
  data,
  color = '#3B82F6',
  size = 250,
  className,
}: RadarChartProps) {
  return (
    <div className={cn('w-full', className)} style={{ height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="var(--fi-border)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }}
          />
          <Radar
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
