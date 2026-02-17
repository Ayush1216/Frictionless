'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gauge,
  Users,
  ListChecks,
  FileText,
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
import { supabase } from '@/lib/supabase/client';
import type { ActivityEvent } from '@/components/dashboard/ActivityTimeline';
import { ScoreGauge } from '@/components/dashboard/ScoreGauge';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { GapsCard } from '@/components/dashboard/GapsCard';
import { MatchPreviewList } from '@/components/dashboard/MatchPreviewList';
import { TaskQuickList } from '@/components/dashboard/TaskQuickList';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { getTopGapsFromRubric } from '@/lib/readiness-rubric';

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return { text: 'Good morning', icon: <Sunrise className="w-5 h-5 text-score-fair" /> };
  if (hour >= 12 && hour < 17)
    return { text: 'Good afternoon', icon: <Sun className="w-5 h-5 text-score-fair" /> };
  if (hour >= 17 && hour < 21)
    return { text: 'Good evening', icon: <Sunset className="w-5 h-5 text-electric-purple" /> };
  return { text: 'Good evening', icon: <Moon className="w-5 h-5 text-electric-blue" /> };
}

interface QuickStatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  delay: number;
}

function QuickStat({ icon, label, value, color, delay }: QuickStatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-4 flex items-center gap-3"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xl font-mono font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isStartup = user?.org_type === 'startup';
  const { readiness, scoreHistory, documentCount, bootstrapLoaded } = useReadinessStore();
  const { tasks, taskGroups } = useTaskStore();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const greeting = getGreeting();
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  useEffect(() => {
    if (!isStartup || !bootstrapLoaded) return;
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? null;
      if (!token || cancelled) return;
      try {
        const res = await fetch('/api/startup/activity?limit=30', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({ activities: [] }));
        if (!cancelled) setActivities(json.activities ?? []);
      } catch {
        if (!cancelled) setActivities([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isStartup, bootstrapLoaded]);

  const incompleteTasks = useMemo(
    () => tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress'),
    [tasks]
  );

  const biggestGaps = useMemo(() => {
    const categories =
      readiness?.score_summary && typeof readiness.score_summary === 'object'
        ? Object.entries(readiness.score_summary)
            .filter(([k]) => k !== '_overall' && k !== 'totals')
            .map(([, v]) => {
              const cat = v as { category_name?: string; percentage?: number };
              return { name: cat.category_name ?? '', score: cat.percentage ?? 0 };
            })
            .filter((c) => c.name)
        : [];
    const gaps = getTopGapsFromRubric(
      categories,
      readiness?.scored_rubric as Record<string, unknown> | undefined,
      3
    );
    return gaps.map((g) => {
      const taskId = tasks.find(
        (t) =>
          t.title.trim().toLowerCase() === g.item.trim().toLowerCase() ||
          g.item.toLowerCase().includes(t.title.trim().toLowerCase()) ||
          t.title.toLowerCase().includes(g.item.trim().toLowerCase())
      )?.id;
      return { ...g, taskId };
    });
  }, [readiness?.score_summary, readiness?.scored_rubric, tasks]);

  // Data comes from layout prefetch (bootstrap). Show loading until bootstrap has run for startups.
  if (!user || (isStartup && !bootstrapLoaded)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-electric-blue" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  const lastAssessedText =
    readiness?.updated_at
      ? formatDistanceToNow(new Date(readiness.updated_at), { addSuffix: true })
      : undefined;

  const readinessScore = readiness?.score_summary?._overall?.raw_percentage ?? startup.assessment.overall_score;
  // Delta = current score vs previous (from score history)
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

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* ────────── Greeting ────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        {greeting.icon}
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            {greeting.text}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening with {user?.org_name ?? 'your organization'} today.
          </p>
        </div>
      </motion.div>

      {/* ────────── Quick Stats Row ────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickStat
          icon={<Gauge className="w-5 h-5 text-electric-blue" />}
          label="Readiness Score"
          value={readinessScore}
          color="bg-electric-blue/10"
          delay={0.1}
        />
        <QuickStat
          icon={<Users className="w-5 h-5 text-electric-purple" />}
          label="Matches"
          value={0}
          color="bg-electric-purple/10"
          delay={0.15}
        />
        <QuickStat
          icon={<ListChecks className="w-5 h-5 text-score-fair" />}
          label="Pending Tasks"
          value={incompleteTasks.length}
          color="bg-score-fair/10"
          delay={0.2}
        />
        <QuickStat
          icon={<FileText className="w-5 h-5 text-electric-cyan" />}
          label="Documents"
          value={documentCount}
          color="bg-electric-cyan/10"
          delay={0.25}
        />
      </div>

      {/* ────────── Main Grid ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Row 1: Score Gauge + Category Breakdown */}
        <ScoreGauge
          score={readinessScore}
          delta={readinessDelta}
          badge={readiness ? 'assessed' : startup.assessment.badge}
          lastAssessed={lastAssessedText}
          className="lg:col-span-4"
        />
        <CategoryBreakdown
          categories={readinessCategories}
          className="lg:col-span-8"
        />

        {/* Row 2: Gaps + Matches + Tasks */}
        <GapsCard
          missingData={biggestGaps}
          className="lg:col-span-4"
        />
        <MatchPreviewList
          matches={[]}
          investors={[]}
          maxItems={4}
          className="lg:col-span-4"
        />
        <TaskQuickList
          taskGroups={taskGroups}
          maxItems={5}
          className="lg:col-span-4"
        />

        {/* Row 3: Quick Actions */}
        <QuickActions className="lg:col-span-12" />

        {/* Row 4: Activity Timeline */}
        <ActivityTimeline
          activities={activities}
          maxItems={10}
          className="lg:col-span-12"
        />
      </div>
    </div>
  );
}
