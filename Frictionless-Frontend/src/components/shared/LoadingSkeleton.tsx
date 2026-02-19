'use client';

import { cn } from '@/lib/utils';

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn('fi-skeleton rounded-lg', className)}
      style={style}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-8 w-48" />
          <Bone className="h-4 w-32" />
        </div>
        <Bone className="h-10 w-32" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Bone className="h-64 rounded-xl" />
        <Bone className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl space-y-3"
          style={{ background: 'var(--fi-bg-card)', border: '1px solid var(--fi-border)' }}
        >
          <div className="flex items-center justify-between">
            <Bone className="h-5 w-40" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-2/3" />
          <div className="flex items-center gap-2 pt-1">
            <Bone className="h-5 w-20 rounded-full" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ background: 'var(--fi-bg-secondary)' }}
        >
          <Bone className="h-5 w-5 rounded flex-shrink-0" />
          <Bone className="h-4 flex-1" />
          <Bone className="h-5 w-16 rounded-full" />
          <Bone className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-6 rounded-xl" style={{ background: 'var(--fi-bg-card)', border: '1px solid var(--fi-border)' }}>
      <div className="flex items-center justify-between mb-6">
        <Bone className="h-5 w-32" />
        <Bone className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bone
            key={i}
            className="flex-1 rounded-t-lg"
            style={{ height: `${Math.random() * 60 + 30}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
