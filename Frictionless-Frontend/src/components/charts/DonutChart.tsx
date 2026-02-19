'use client';

import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

interface DonutDataPoint {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDataPoint[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
  className?: string;
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  size = 200,
  className,
}: DonutChartProps) {
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="90%"
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={true}
            animationDuration={1000}
            animationBegin={200}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="font-mono font-bold text-lg" style={{ color: 'var(--fi-text-primary)' }}>
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
