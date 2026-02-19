'use client';

import { cn } from '@/lib/utils';

interface SkeletonBaseProps {
  className?: string;
}

function SkeletonBase({ className }: SkeletonBaseProps) {
  return <div className={cn('fi-skeleton', className)} />;
}

export function SkeletonCard({ className }: SkeletonBaseProps) {
  return (
    <div className={cn('rounded-xl p-6 space-y-4', className)}
         style={{ background: 'var(--fi-bg-card)', border: '1px solid var(--fi-border)' }}>
      <div className="flex items-center gap-3">
        <SkeletonBase className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <SkeletonBase className="h-4 w-3/5" />
          <SkeletonBase className="h-3 w-2/5" />
        </div>
      </div>
      <SkeletonBase className="h-20 w-full" />
      <div className="flex gap-2">
        <SkeletonBase className="h-8 w-20 rounded-full" />
        <SkeletonBase className="h-8 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonText({ className, lines = 3 }: SkeletonBaseProps & { lines?: number }) {
  const widths = ['w-full', 'w-4/5', 'w-3/5', 'w-5/6', 'w-2/3'];
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          className={cn('h-3.5', widths[i % widths.length])}
        />
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: SkeletonBaseProps) {
  return (
    <div className={cn('rounded-xl p-6', className)}
         style={{ background: 'var(--fi-bg-card)', border: '1px solid var(--fi-border)' }}>
      <div className="space-y-3 mb-4">
        <SkeletonBase className="h-5 w-40" />
        <SkeletonBase className="h-3 w-56" />
      </div>
      <SkeletonBase className="h-48 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonGauge({ className }: SkeletonBaseProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <SkeletonBase className="h-32 w-32 rounded-full" />
      <SkeletonBase className="h-4 w-20" />
      <SkeletonBase className="h-3 w-28" />
    </div>
  );
}

export function SkeletonTable({ className, rows = 5 }: SkeletonBaseProps & { rows?: number }) {
  return (
    <div className={cn('rounded-xl overflow-hidden', className)}
         style={{ background: 'var(--fi-bg-card)', border: '1px solid var(--fi-border)' }}>
      {/* Header */}
      <div className="flex gap-4 px-4 py-3"
           style={{ background: 'var(--fi-bg-secondary)', borderBottom: '1px solid var(--fi-border)' }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBase key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3" style={{ borderBottom: i < rows - 1 ? '1px solid var(--fi-border)' : undefined }}>
          {[1, 2, 3, 4].map((j) => (
            <SkeletonBase key={j} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
