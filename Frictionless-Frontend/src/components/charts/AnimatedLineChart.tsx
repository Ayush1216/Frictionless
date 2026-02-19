'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: string;
  score: number;
}

interface AnimatedLineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  className?: string;
}

function CustomTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload || !(payload as Array<Record<string, unknown>>).length) return null;
  const items = payload as Array<{ value: number }>;
  return (
    <div
      className="fi-card px-3 py-2 text-xs"
      style={{ padding: '8px 12px' }}
    >
      <p className="mb-1" style={{ color: 'var(--fi-text-muted)' }}>{label as string}</p>
      <p className="font-mono font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
        {items[0].value}
      </p>
    </div>
  );
}

export function AnimatedLineChart({
  data,
  color = '#3B82F6',
  height = 200,
  className,
}: AnimatedLineChartProps) {
  const gradientId = `line-gradient-${color.replace('#', '')}`;

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--fi-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }}
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
