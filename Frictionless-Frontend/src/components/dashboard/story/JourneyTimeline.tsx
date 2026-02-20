'use client';

import { useRef, useState, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  TrendingUp, FileUp, CheckCircle2, Eye, MessageSquare,
  Bookmark, ShieldCheck, UserCheck, Phone, XCircle,
  LogIn, GraduationCap, Activity, ChevronRight,
} from 'lucide-react';
import { TabGroup } from '@/components/ui/TabGroup';
import { EmptyState } from '@/components/ui/EmptyState';
import { chartTheme } from '@/components/charts/ChartWrapper';
import { sectionVariants } from './storyVariants';
import type { NarrativeData } from './useNarrativeData';

const LazyResponsiveContainer = dynamic(
  () => import('recharts').then((m) => ({ default: m.ResponsiveContainer })),
  { ssr: false }
);
const LazyAreaChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.AreaChart })),
  { ssr: false }
);
const LazyArea = dynamic(
  () => import('recharts').then((m) => ({ default: m.Area })),
  { ssr: false }
);
const LazyXAxis = dynamic(
  () => import('recharts').then((m) => ({ default: m.XAxis })),
  { ssr: false }
);
const LazyYAxis = dynamic(
  () => import('recharts').then((m) => ({ default: m.YAxis })),
  { ssr: false }
);
const LazyCartesianGrid = dynamic(
  () => import('recharts').then((m) => ({ default: m.CartesianGrid })),
  { ssr: false }
);
const LazyRechartsTooltip = dynamic(
  () => import('recharts').then((m) => ({ default: m.Tooltip })),
  { ssr: false }
);
const LazyReferenceLine = dynamic(
  () => import('recharts').then((m) => ({ default: m.ReferenceLine })),
  { ssr: false }
);

const activityConfig: Record<string, { icon: React.ElementType; color: string }> = {
  score_change: { icon: TrendingUp, color: 'var(--fi-score-excellent)' },
  file_upload: { icon: FileUp, color: 'var(--fi-primary)' },
  task_completed: { icon: CheckCircle2, color: 'var(--fi-score-excellent)' },
  match_viewed: { icon: Eye, color: 'hsl(var(--accent))' },
  chat_message: { icon: MessageSquare, color: 'hsl(var(--chart-5))' },
  task_status_changed: { icon: Activity, color: 'var(--fi-score-good)' },
  match_saved: { icon: Bookmark, color: 'hsl(var(--accent))' },
  assessment_run: { icon: ShieldCheck, color: 'var(--fi-primary)' },
  profile_update: { icon: UserCheck, color: 'hsl(var(--chart-5))' },
  match_contacted: { icon: Phone, color: 'var(--fi-score-excellent)' },
  match_passed: { icon: XCircle, color: 'var(--fi-text-muted)' },
  login: { icon: LogIn, color: 'var(--fi-text-muted)' },
  program_enrollment: { icon: GraduationCap, color: 'var(--fi-primary)' },
};

function formatTimeAgo(ts: string): string {
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return '';
  }
}

interface JourneyTimelineProps {
  data: NarrativeData;
}

export function JourneyTimeline({ data }: JourneyTimelineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [period, setPeriod] = useState('weekly');

  const tabs = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
  ];

  const hasChartData = data.chartData.length > 0;
  const hasActivities = data.activities.length > 0;

  if (!hasChartData && !hasActivities) {
    return (
      <motion.div
        ref={ref}
        variants={sectionVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="fi-card fi-card-depth fi-card-shine"
      >
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--fi-text-primary)' }}>
          Your Journey
        </h3>
        <EmptyState
          title="No journey data yet"
          description="Complete assessments and tasks to see your Frictionless journey unfold."
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      variants={sectionVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="fi-card fi-card-depth fi-card-shine"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
            Your Journey
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fi-text-tertiary)' }}>
            Score history &amp; recent activity
          </p>
        </div>
        {hasChartData && (
          <TabGroup tabs={tabs} activeTab={period} onChange={setPeriod} variant="button" size="sm" />
        )}
      </div>

      {/* Score area chart */}
      {hasChartData && (
        <div style={{ height: 220 }}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyAreaChart data={data.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="journeyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--fi-primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--fi-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <LazyCartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
              <LazyXAxis dataKey="date" tick={{ fontSize: 11, fill: chartTheme.axisColor }} />
              <LazyYAxis domain={[0, 100]} tick={{ fontSize: 11, fill: chartTheme.axisColor }} />
              <LazyRechartsTooltip
                contentStyle={{
                  background: chartTheme.tooltipBg,
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 13,
                  color: chartTheme.tooltipText,
                }}
              />
              <LazyReferenceLine
                y={85}
                stroke="var(--fi-score-good)"
                strokeDasharray="6 4"
                label={{
                  value: 'Investor Target',
                  position: 'right',
                  fontSize: 11,
                  fill: 'var(--fi-text-muted)',
                }}
              />
              <LazyArea
                type="monotone"
                dataKey="score"
                stroke="var(--fi-primary)"
                strokeWidth={2}
                fill="url(#journeyGradient)"
                animationDuration={800}
              />
            </LazyAreaChart>
          </LazyResponsiveContainer>
        </div>
      )}

      {/* Activity event strip */}
      {hasActivities && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--fi-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: 'var(--fi-text-secondary)' }}>
              Recent Activity
            </span>
            <Link href="/startup/analytics" className="text-xs font-medium" style={{ color: 'var(--fi-text-link)' }}>
              View all <ChevronRight className="w-3 h-3 inline" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {data.activities.slice(0, 8).map((evt) => {
              const config = activityConfig[evt.type] ?? { icon: Activity, color: 'var(--fi-text-muted)' };
              const Icon = config.icon;
              return (
                <div
                  key={evt.id}
                  className="flex items-center gap-2 shrink-0 px-3 py-2 rounded-lg"
                  style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${config.color}15`, color: config.color }}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate max-w-[140px]" style={{ color: 'var(--fi-text-primary)' }}>
                      {evt.title}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
                      {formatTimeAgo(evt.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
