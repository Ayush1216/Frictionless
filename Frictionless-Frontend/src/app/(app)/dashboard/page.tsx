'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gauge,
  Users,
  ListChecks,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/stores/auth-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';
import { getAuthHeaders } from '@/lib/api/tasks';
import type { ActivityEvent } from '@/components/dashboard/ActivityTimeline';
import { ScoreGauge } from '@/components/dashboard/ScoreGauge';
import { ScoreSparkline } from '@/components/dashboard/ScoreSparkline';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { TaskQuickList } from '@/components/dashboard/TaskQuickList';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { MomentumStrip } from '@/components/dashboard/MomentumStrip';
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard';
import { getTopGapsFromRubric } from '@/lib/readiness-rubric';
import { dummyStartups } from '@/lib/dummy-data/startups';

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return { text: 'Good morning', icon: <Sunrise className="w-5 h-5 text-score-fair" /> };
  if (hour >= 12 && hour < 17)
    return { text: 'Good afternoon', icon: <Sun className="w-5 h-5 text-score-fair" /> };
  if (hour >= 17 && hour < 21)
    return { text: 'Good evening', icon: <Sunset className="w-5 h-5 text-accent" /> };
  return { text: 'Good evening', icon: <Moon className="w-5 h-5 text-primary" /> };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isStartup = user?.org_type === 'startup';
  const { readiness, scoreHistory, documentCount, bootstrapLoaded } = useReadinessStore();
  const { tasks, taskGroups } = useTaskStore();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const greeting = getGreeting();
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  // Fetch activity timeline
  const [activityLoading, setActivityLoading] = useState(false);
  useEffect(() => {
    if (!isStartup || !bootstrapLoaded) return;
    let cancelled = false;
    setActivityLoading(true);
    (async () => {
      try {
        const headers = await getAuthHeaders();
        if (cancelled || !Object.keys(headers).length) return;
        const res = await fetch('/api/startup/activity?limit=20', { headers });
        const json = await res.json().catch(() => ({ activities: [] }));
        if (!cancelled) setActivities(json.activities ?? []);
      } catch {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isStartup, bootstrapLoaded]);

  const incompleteTasks = useMemo(
    () => tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress'),
    [tasks]
  );

  // Data comes from layout prefetch (bootstrap). Show loading until bootstrap has run for startups.
  if (!user || (isStartup && !bootstrapLoaded)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  const lastAssessedText =
    readiness?.updated_at
      ? formatDistanceToNow(new Date(readiness.updated_at), { addSuffix: true })
      : undefined;

  const startup = dummyStartups[0];
  const readinessScore = readiness?.score_summary?._overall?.raw_percentage ?? startup.assessment.overall_score;
  const readinessDelta =
    readiness && scoreHistory.length >= 2
      ? Math.round((readinessScore - scoreHistory[scoreHistory.length - 2].score) * 10) / 10
      : readiness
        ? 0
        : startup.score_delta;
  const readinessCategories =
    readiness?.score_summary && typeof readiness.score_summary === 'object'
      ? Object.entries(readiness.score_summary)
          .filter(([k]) => k !== '_overall' && k !== 'totals')
          .map(([, v]) => {
            const cat = v as { category_name?: string; percentage?: number; weight?: number };
            return {
              name: cat.category_name ?? '',
              score: cat.percentage ?? 0,
              delta: 0,
              weight: cat.weight ?? 0,
            };
          })
          .filter((c) => c.name)
      : startup.assessment.categories;

  const overdueCount = useMemo(
    () => tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
    [tasks],
  );
  const tasksClosedRecently = useMemo(
    () => tasks.filter((t) => t.status === 'done').length,
    [tasks],
  );

  // Score projection from top tasks with potential_points
  const scoreProjection = useMemo(() => {
    const topTaskPts = [...tasks]
      .filter((t) => t.status !== 'done' && t.potential_points)
      .sort((a, b) => (b.potential_points ?? 0) - (a.potential_points ?? 0))
      .slice(0, 5)
      .reduce((sum, t) => sum + (t.potential_points ?? 0), 0);
    return readinessScore + topTaskPts;
  }, [tasks, readinessScore]);

  const hasAssessment = !!readiness;

  return (
    <div className="p-4 lg:p-6 xl:p-8 2xl:p-10 space-y-6 w-full max-w-[1600px] xl:max-w-[1920px] mx-auto">
      {/* ════════ HERO SECTION ════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="dashboard-hero-gradient rounded-2xl border border-border/50 p-6 lg:p-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Greeting */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              {greeting.icon}
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                {greeting.text}, {firstName}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-8 lg:ml-8">
              Here&apos;s what&apos;s happening with {user?.org_name ?? 'your organization'} today.
            </p>
          </div>

          {/* Inline Score Gauge + Sparkline */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <ScoreGauge
              score={readinessScore}
              delta={readinessDelta}
              badge={readiness ? 'assessed' : startup.assessment.badge}
              lastAssessed={lastAssessedText}
              variant="inline"
            />
            {scoreHistory.length > 0 && (
              <ScoreSparkline
                history={scoreHistory}
                width={160}
                height={40}
                className="hidden md:block"
              />
            )}
          </div>
        </div>

        {/* Metric Chips */}
        <div className="flex flex-wrap gap-2 mt-5">
          <MomentumStrip
            title="Readiness"
            icon={Gauge}
            value={readinessScore}
            trend={readinessDelta > 0 ? 'up' : readinessDelta < 0 ? 'down' : 'flat'}
            trendLabel={readinessDelta !== 0 ? `${readinessDelta > 0 ? '+' : ''}${readinessDelta}` : undefined}
            variant="chip"
          />
          <MomentumStrip
            title="Investor"
            icon={Users}
            value="0 new"
            trendLabel="matches"
            variant="chip"
          />
          <MomentumStrip
            title="Execution"
            icon={ListChecks}
            value={tasksClosedRecently}
            trendLabel="closed"
            variant="chip"
          />
        </div>
      </motion.div>

      {/* ════════ MAIN 2-COLUMN GRID ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* ── LEFT COLUMN (8 cols) ── */}
        <div className="lg:col-span-8 space-y-4 lg:space-y-6">
          {/* AI Insights Card */}
          <AIInsightsCard
            hasAssessment={hasAssessment}
            currentScore={readinessScore}
            scoreProjection={scoreProjection}
          />

          {/* Category Breakdown */}
          <CategoryBreakdown categories={readinessCategories} />

          {/* Activity Timeline — compact */}
          <ActivityTimeline
            activities={activities}
            maxItems={5}
          />
        </div>

        {/* ── RIGHT COLUMN (4 cols) ── */}
        <div className="lg:col-span-4 space-y-4 lg:space-y-6">
          {/* Smart Next Steps */}
          <TaskQuickList
            taskGroups={taskGroups}
            maxItems={5}
          />

          {/* Quick Actions — compact 2x2 */}
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
