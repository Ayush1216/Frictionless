'use client';

import { cn } from '@/lib/utils';
import { formatDelta } from '@/lib/scores';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  delta?: number;
  deltaLabel?: string;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaLabel,
  subtitle,
  onClick,
  className,
}: StatCardProps) {
  const deltaInfo = delta !== undefined ? formatDelta(delta) : null;

  return (
    <div
      className={cn(
        'fi-card',
        onClick && 'fi-card-interactive cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Top: icon + label */}
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
            style={{ background: 'var(--fi-primary)', opacity: 0.15 }}
          >
            <div style={{ color: 'var(--fi-primary)' }}>{icon}</div>
          </div>
        )}
        <span
          className="text-sm font-medium truncate"
          style={{ color: 'var(--fi-text-secondary)' }}
        >
          {label}
        </span>
      </div>

      {/* Middle: value */}
      <div
        className="font-bold leading-tight tracking-tight"
        style={{
          fontSize: 'var(--fi-text-2xl)',
          color: 'var(--fi-text-primary)',
        }}
      >
        {value}
      </div>

      {/* Bottom: delta / subtitle */}
      {(deltaInfo || subtitle) && (
        <div className="flex items-center gap-2 mt-2">
          {deltaInfo && (
            <span
              className="text-xs font-medium"
              style={{
                color: deltaInfo.positive
                  ? 'var(--fi-score-excellent)'
                  : 'var(--fi-score-need-improvement)',
              }}
            >
              {deltaInfo.text}
            </span>
          )}
          {deltaLabel && (
            <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
              {deltaLabel}
            </span>
          )}
          {!deltaInfo && subtitle && (
            <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
