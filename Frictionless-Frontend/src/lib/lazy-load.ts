import dynamic from 'next/dynamic';

// Lazy-load chart components for better initial page load
export const LazySparklineChart = dynamic(
  () => import('@/components/charts/SparklineChart').then((mod) => ({ default: mod.SparklineChart })),
  { ssr: false }
);

export const LazyRadarChart = dynamic(
  () => import('@/components/charts/RadarChart').then((mod) => ({ default: mod.RadarChart })),
  { ssr: false }
);

export const LazyDonutChart = dynamic(
  () => import('@/components/charts/DonutChart').then((mod) => ({ default: mod.DonutChart })),
  { ssr: false }
);

export const LazyAnimatedLineChart = dynamic(
  () => import('@/components/charts/AnimatedLineChart').then((mod) => ({ default: mod.AnimatedLineChart })),
  { ssr: false }
);

export const LazyAnimatedBarChart = dynamic(
  () => import('@/components/charts/AnimatedBarChart').then((mod) => ({ default: mod.AnimatedBarChart })),
  { ssr: false }
);

export const LazyAnimatedGauge = dynamic(
  () => import('@/components/charts/AnimatedGauge').then((mod) => ({ default: mod.AnimatedGauge })),
  { ssr: false }
);
