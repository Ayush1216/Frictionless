'use client';

import { cn } from '@/lib/utils';
import { ResponsiveContainer } from 'recharts';
import { SkeletonChart } from '@/components/ui/fi-skeleton';

interface ChartWrapperProps {
  children?: React.ReactNode;
  height?: number;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

/** Theme-aware colors for Recharts components */
export const chartTheme = {
  gridColor: 'var(--fi-border)',
  axisColor: 'var(--fi-text-muted)',
  tooltipBg: 'var(--fi-bg-card)',
  tooltipBorder: 'var(--fi-border)',
  tooltipText: 'var(--fi-text-primary)',
} as const;

export function ChartWrapper({
  children,
  height = 300,
  title,
  subtitle,
  action,
  loading = false,
  className,
}: ChartWrapperProps) {
  if (loading) {
    return <SkeletonChart className={className} />;
  }

  return (
    <div className={cn('fi-card', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--fi-text-primary)' }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className="text-sm mt-0.5"
                style={{ color: 'var(--fi-text-tertiary)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 ml-4">{action}</div>}
        </div>
      )}
      {children && (
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </div>
  );
}
