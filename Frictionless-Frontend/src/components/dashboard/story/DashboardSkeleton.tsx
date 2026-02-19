'use client';

import { SkeletonCard, SkeletonChart, SkeletonGauge, SkeletonText } from '@/components/ui/fi-skeleton';

export function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-6 xl:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Hero skeleton */}
      <div
        className="rounded-2xl p-6 lg:p-8"
        style={{ background: 'var(--fi-bg-card)', border: '1px solid var(--fi-border)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 flex justify-center">
            <SkeletonGauge />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <div className="fi-skeleton h-6 w-3/4 rounded-lg" />
            <SkeletonText lines={3} />
            <div className="flex gap-2 pt-2">
              <div className="fi-skeleton h-7 w-24 rounded-full" />
              <div className="fi-skeleton h-7 w-20 rounded-full" />
              <div className="fi-skeleton h-7 w-28 rounded-full" />
            </div>
          </div>
          <div className="lg:col-span-3 space-y-3">
            <div className="fi-skeleton h-10 w-10 rounded-lg" />
            <div className="fi-skeleton h-5 w-32 rounded" />
            <div className="fi-skeleton h-4 w-24 rounded" />
            <div className="space-y-2 pt-2">
              <div className="fi-skeleton h-3.5 w-full rounded" />
              <div className="fi-skeleton h-3.5 w-full rounded" />
              <div className="fi-skeleton h-3.5 w-full rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Brief skeleton */}
      <SkeletonChart />

      {/* Readiness + Timeline row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Investor + Action row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
