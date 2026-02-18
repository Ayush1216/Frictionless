'use client';

import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';
import { TasksSyncProvider } from '@/contexts/TasksSyncContext';
import { fetchBootstrap } from '@/lib/api/bootstrap';
import { supabase } from '@/lib/supabase/client';
import { parseScoredRubric, type ParsedRubricCategory } from '@/lib/readiness-rubric';
import { ReadinessScoreHero } from '@/components/readiness/ReadinessScoreHero';
import { ReadinessShareButton } from '@/components/readiness/ReadinessShareButton';
import { AIScoreDeepDive } from '@/components/readiness/AIScoreDeepDive';
import { ReadinessRadarChart } from '@/components/readiness/ReadinessRadarChart';
import { ReadinessCategorySidebar } from '@/components/readiness/ReadinessCategorySidebar';
import { ReadinessCategoryDetail } from '@/components/readiness/ReadinessCategoryDetail';
import { CompetitiveBenchmark } from '@/components/readiness/CompetitiveBenchmark';
import { InvestorLensPreview } from '@/components/readiness/InvestorLensPreview';
import { WhatIfSimulator, type WhatIfTask } from '@/components/readiness/WhatIfSimulator';
import { RecommendedActionsSection } from '@/components/readiness/RecommendedActionsSection';
import { AskFrictionlessPanel } from '@/components/readiness/AskFrictionlessPanel';
import type { Task } from '@/types/database';

function ReadinessContent() {
  const user = useAuthStore((s) => s.user);
  const { readiness, scoreHistory, bootstrapLoaded } = useReadinessStore();
  const { tasks, taskGroups, taskProgress, tasksLoaded } = useTaskStore();

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [taskFilterCategory, setTaskFilterCategory] = useState('all');
  const [askPanel, setAskPanel] = useState<{ task: Task; categoryName: string } | null>(null);

  // Bootstrap
  useEffect(() => {
    if (tasksLoaded) return;
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? null;
      if (!token || cancelled) return;
      try { await fetchBootstrap(token); } catch { useTaskStore.getState().setTasksLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [tasksLoaded]);

  // Readiness data
  const readinessScore = readiness?.score_summary?._overall?.raw_percentage ?? 0;
  const readinessDelta = readiness && scoreHistory.length >= 2
    ? Math.round((readinessScore - scoreHistory[scoreHistory.length - 2].score) * 10) / 10
    : 0;

  // Parse rubric categories
  const parsedCategories = useMemo((): ParsedRubricCategory[] => {
    const rubric = readiness?.scored_rubric as Record<string, unknown> | undefined;
    if (!rubric || typeof rubric !== 'object') return [];
    return parseScoredRubric(rubric);
  }, [readiness?.scored_rubric]);

  // Auto-select first category
  useEffect(() => {
    if (parsedCategories.length > 0 && !selectedCategoryKey) {
      setSelectedCategoryKey(parsedCategories[0].key);
    }
  }, [parsedCategories, selectedCategoryKey]);

  const selectedCategory = parsedCategories.find((c) => c.key === selectedCategoryKey) ?? parsedCategories[0] ?? null;

  // Task stats
  const stats = useMemo(() => {
    if (taskProgress?.allotted_total && taskProgress.allotted_total > 0) {
      const total = taskProgress.allotted_total;
      const done = Math.max(0, total - (taskProgress.current_pending ?? 0));
      return { done, total };
    }
    const done = taskGroups.reduce((s, g) => s + (g.done_count ?? 0), 0);
    const total = tasks.length + done;
    return { done, total };
  }, [taskProgress, taskGroups, tasks]);

  // What-If tasks
  const whatIfTasks = useMemo((): WhatIfTask[] => {
    return tasks
      .filter((t) => t.status !== 'done' && t.potential_points)
      .map((t) => {
        const group = taskGroups.find((g) => g.id === t.task_group_id);
        return {
          id: t.id,
          title: t.title,
          impactPoints: t.potential_points ?? 0,
          category: group?.category ?? 'Other',
        };
      })
      .sort((a, b) => b.impactPoints - a.impactPoints);
  }, [tasks, taskGroups]);

  const handleRefresh = useCallback(async () => {
    useTaskStore.getState().setTasksLoaded(false);
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token ?? null;
    if (token) {
      try { await fetchBootstrap(token, true); } catch { useTaskStore.getState().setTasksLoaded(true); }
    } else {
      useTaskStore.getState().setTasksLoaded(true);
    }
  }, []);

  const handleViewTasks = useCallback((categoryName: string) => {
    setTaskFilterCategory(categoryName);
    setTimeout(() => {
      document.getElementById('recommended-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const handleAskTask = useCallback((task: Task) => {
    const group = taskGroups.find((g) => g.id === task.task_group_id);
    setAskPanel({ task, categoryName: group?.category ?? 'General' });
  }, [taskGroups]);

  const handleTaskCompleted = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  if (!user || !bootstrapLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading Readiness...</p>
      </div>
    );
  }

  return (
    <TasksSyncProvider>
      <div className="p-4 lg:p-6 xl:p-8 space-y-6 w-full max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Target className="w-6 h-6 text-primary shrink-0" />
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-display font-bold text-foreground">Readiness</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your investor readiness score, category insights, and improvement roadmap.
            </p>
          </div>
          {parsedCategories.length > 0 && (
            <ReadinessShareButton
              overallScore={readinessScore}
              categories={parsedCategories}
              completedTasks={stats.done}
              totalTasks={stats.total}
              delta={readinessDelta}
            />
          )}
        </motion.div>

        {/* Score Hero: Gauge + Stats + History Chart */}
        <ReadinessScoreHero
          score={readinessScore}
          delta={readinessDelta}
          scoreHistory={scoreHistory}
          completedTasks={stats.done}
          totalTasks={stats.total}
          onRefresh={handleRefresh}
        />

        {/* AI Score Deep Dive */}
        {parsedCategories.length > 0 && (
          <AIScoreDeepDive
            overallScore={readinessScore}
            categories={parsedCategories}
          />
        )}

        {/* Radar Chart + Category Browser — equal height 3-panel */}
        {parsedCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Desktop: 3-panel equal height */}
            <div className="hidden lg:flex gap-4 h-[520px]">
              <ReadinessRadarChart
                categories={parsedCategories}
                className="w-[320px] shrink-0"
              />
              <ReadinessCategorySidebar
                overallScore={readinessScore}
                categories={parsedCategories}
                selectedKey={selectedCategoryKey}
                onSelect={setSelectedCategoryKey}
              />
              {selectedCategory && (
                <ReadinessCategoryDetail
                  category={selectedCategory}
                  onViewTasks={handleViewTasks}
                />
              )}
            </div>

            {/* Mobile: stacked */}
            <div className="lg:hidden space-y-3">
              <ReadinessRadarChart categories={parsedCategories} />
              <ReadinessCategorySidebar
                overallScore={readinessScore}
                categories={parsedCategories}
                selectedKey={selectedCategoryKey}
                onSelect={setSelectedCategoryKey}
              />
              {selectedCategory && (
                <ReadinessCategoryDetail
                  category={selectedCategory}
                  onViewTasks={handleViewTasks}
                />
              )}
            </div>
          </motion.div>
        )}

        {/* AI Insights Row: Competitive Benchmark + Investor Lens */}
        {parsedCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            <CompetitiveBenchmark
              overallScore={readinessScore}
              categories={parsedCategories}
              companyName={user?.org_name}
            />
            <InvestorLensPreview
              overallScore={readinessScore}
              categories={parsedCategories}
              companyName={user?.org_name}
            />
          </motion.div>
        )}

        {/* Recommended Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <RecommendedActionsSection
            tasks={tasks.filter((t) => t.status !== 'done')}
            taskGroups={taskGroups}
            filterCategory={taskFilterCategory}
            onFilterChange={setTaskFilterCategory}
            onAskTask={handleAskTask}
            completedCount={stats.done}
          />
        </motion.div>

        {/* What-If Simulator — at the end */}
        {whatIfTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <WhatIfSimulator
              currentScore={readinessScore}
              tasks={whatIfTasks}
              categories={parsedCategories}
            />
          </motion.div>
        )}

        {/* Ask Frictionless Side Panel */}
        <AskFrictionlessPanel
          task={askPanel?.task ?? null}
          categoryName={askPanel?.categoryName}
          isOpen={!!askPanel}
          onClose={() => setAskPanel(null)}
          onTaskCompleted={handleTaskCompleted}
        />
      </div>
    </TasksSyncProvider>
  );
}

export default function ReadinessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <ReadinessContent />
    </Suspense>
  );
}
