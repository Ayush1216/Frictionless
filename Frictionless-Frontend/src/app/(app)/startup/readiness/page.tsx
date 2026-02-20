'use client';

import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Target,
  Loader2,
  Zap,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';
import { useUIStore } from '@/stores/ui-store';
import { TasksSyncProvider } from '@/contexts/TasksSyncContext';
import { fetchBootstrap } from '@/lib/api/bootstrap';
import { supabase } from '@/lib/supabase/client';
import { parseScoredRubric, type ParsedRubricCategory, type RubricItem } from '@/lib/readiness-rubric';
import { getScoreColor, getScoreLabel } from '@/lib/scores';
import { getScoreInfo } from '@/lib/score-utils';
import { geminiAnalyze } from '@/lib/ai/gemini-client';

// Phase 2 reusable components
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { CategoryBar } from '@/components/ui/CategoryBar';
import { AskButton } from '@/components/ui/AskButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { TabGroup } from '@/components/ui/TabGroup';
import { TooltipInfo } from '@/components/ui/TooltipInfo';
import { SkeletonCard, SkeletonChart } from '@/components/ui/fi-skeleton';
import { chartTheme } from '@/components/charts/ChartWrapper';

// Existing components we keep
import { ReadinessShareButton } from '@/components/readiness/ReadinessShareButton';
import { WhatIfSimulator, type WhatIfTask } from '@/components/readiness/WhatIfSimulator';
import { RecommendedActionsSection } from '@/components/readiness/RecommendedActionsSection';
import { IntelligenceSidebar } from '@/components/dashboard/IntelligenceSidebar';
import { useNarrativeData } from '@/components/dashboard/story/useNarrativeData';
import { getCategoryIcon } from '@/components/readiness/ReadinessCategorySidebar';
import type { Task } from '@/types/database';

import {
  Tooltip as RadixTooltip,
  TooltipContent as RadixTooltipContent,
  TooltipTrigger as RadixTooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Lazy recharts
import dynamic from 'next/dynamic';
const LazyBarChart = dynamic(() => import('recharts').then((m) => ({ default: m.BarChart })), { ssr: false });
const LazyBar = dynamic(() => import('recharts').then((m) => ({ default: m.Bar })), { ssr: false });
const LazyXAxis = dynamic(() => import('recharts').then((m) => ({ default: m.XAxis })), { ssr: false });
const LazyYAxis = dynamic(() => import('recharts').then((m) => ({ default: m.YAxis })), { ssr: false });
const LazyCartesianGrid = dynamic(() => import('recharts').then((m) => ({ default: m.CartesianGrid })), { ssr: false });
const LazyRechartsTooltip = dynamic(() => import('recharts').then((m) => ({ default: m.Tooltip })), { ssr: false });
const LazyArea = dynamic(() => import('recharts').then((m) => ({ default: m.Area })), { ssr: false });
const LazyAreaChart = dynamic(() => import('recharts').then((m) => ({ default: m.AreaChart })), { ssr: false });
const LazyRadarChart = dynamic(() => import('recharts').then((m) => ({ default: m.RadarChart })), { ssr: false });
const LazyPolarGrid = dynamic(() => import('recharts').then((m) => ({ default: m.PolarGrid })), { ssr: false });
const LazyPolarAngleAxis = dynamic(() => import('recharts').then((m) => ({ default: m.PolarAngleAxis })), { ssr: false });
const LazyPolarRadiusAxis = dynamic(() => import('recharts').then((m) => ({ default: m.PolarRadiusAxis })), { ssr: false });
const LazyRadar = dynamic(() => import('recharts').then((m) => ({ default: m.Radar })), { ssr: false });
const LazyResponsiveContainer = dynamic(() => import('recharts').then((m) => ({ default: m.ResponsiveContainer })), { ssr: false });
const LazyCell = dynamic(() => import('recharts').then((m) => ({ default: m.Cell })), { ssr: false });
const LazyReferenceLine = dynamic(() => import('recharts').then((m) => ({ default: m.ReferenceLine })), { ssr: false });

// ─── Animation variants ───
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0, 0, 0.58, 1] as const },
  }),
};

// ═══════════════════════════════════════════
// MAIN Frictionless PAGE
// ═══════════════════════════════════════════

function ReadinessContent() {
  const user = useAuthStore((s) => s.user);
  const { readiness, scoreHistory, bootstrapLoaded } = useReadinessStore();
  const { tasks, taskGroups, taskProgress, tasksLoaded } = useTaskStore();
  const theme = useUIStore((s) => s.theme);

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [taskFilterCategory, setTaskFilterCategory] = useState('all');
  const [showMethodology, setShowMethodology] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [intelligencePrompt, setIntelligencePrompt] = useState<string | null>(null);
  const [aiDescriptions, setAiDescriptions] = useState<Record<string, string>>({});
  const [aiDescriptionsLoading, setAiDescriptionsLoading] = useState(false);
  const narrativeData = useNarrativeData();

  const openAskWithPrompt = (prompt: string) => {
    setIntelligencePrompt(prompt);
    setIntelligenceOpen(true);
  };

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

  // Pre-generate AI descriptions for tasks on page load
  useEffect(() => {
    if (!tasksLoaded || tasks.length === 0) return;
    // Check sessionStorage cache
    const taskIds = tasks.map((t) => t.id).sort().join(',');
    const cacheKey = `fi-task-desc-${taskIds.slice(0, 100)}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setAiDescriptions(JSON.parse(cached));
        return;
      }
    } catch { /* ignore */ }

    let cancelled = false;
    setAiDescriptionsLoading(true);

    (async () => {
      try {
        const taskList = tasks.slice(0, 25).map((t) => {
          const group = taskGroups.find((g) => g.id === t.task_group_id);
          return `- ID: "${t.id}", Title: "${t.title}", Category: "${group?.category ?? 'Other'}", Priority: ${t.priority}`;
        }).join('\n');

        const prompt = `You are a startup investment Frictionless advisor helping founders prepare for fundraising. For each task below, write a thorough description of EXACTLY 150-200 words (this is critical — each description must be at least 150 words) covering ALL of these points in detail:

1. WHAT TO DO: Explain specifically what the founder needs to prepare, create, or demonstrate. Give concrete steps.
2. WHY INVESTORS CARE: Explain why this matters to investors during due diligence. What questions will they ask about this? How does it affect their investment decision?
3. WHAT GOOD LOOKS LIKE: Provide specific examples, benchmarks, or standards that top startups meet. What would impress an investor?
4. RISK OF INACTION: What happens if the founder goes into investor meetings without addressing this? What red flags does it raise?

Write in a helpful, detailed advisory tone. Do NOT repeat the task title. Each description MUST be 150-200 words minimum — short descriptions are not acceptable.

Return ONLY valid JSON (no markdown, no code fences):
{"task_id_here": "full detailed description here", ...}

Tasks:
${taskList}`;

        const result = await geminiAnalyze(prompt, { temperature: 0.4, maxTokens: 8000 });
        if (cancelled) return;

        // Parse JSON from response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const descriptions = JSON.parse(jsonMatch[0]);
          setAiDescriptions(descriptions);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(descriptions)); } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('Failed to generate AI task descriptions:', err);
      } finally {
        if (!cancelled) setAiDescriptionsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tasksLoaded, tasks, taskGroups]);

  // Frictionless data
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

  // Auto-select first category (use natural rubric order)
  useEffect(() => {
    if (parsedCategories.length > 0 && !selectedCategoryKey) {
      setSelectedCategoryKey(parsedCategories[0].key);
    }
  }, [parsedCategories, selectedCategoryKey]);

  const selectedCategory = parsedCategories.find((c) => c.key === selectedCategoryKey) ?? parsedCategories[0] ?? null;

  // Lowest category for focus banner
  const lowestCategory = useMemo(
    () => parsedCategories.length > 0
      ? [...parsedCategories].sort((a, b) => a.score - b.score)[0]
      : null,
    [parsedCategories]
  );

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

  // Chart data for score history
  const chartData = useMemo(() => {
    return scoreHistory.map((h) => ({
      date: new Date(h.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Math.round(h.score),
      fullDate: new Date(h.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    }));
  }, [scoreHistory]);

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
    const cat = group?.category ?? 'General';
    const desc = task.description ? ` Description: ${task.description}` : '';
    const prompt = `Help me with this Frictionless task: "${task.title}" (${cat} category, ${task.priority} priority, +${task.potential_points ?? '?'} pts).${desc} Give me specific, actionable guidance to complete this.`;
    openAskWithPrompt(prompt);
  }, [taskGroups, openAskWithPrompt]);

  const handleTaskCompleted = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const hasAssessment = !!readiness;
  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const deltaToTarget = readinessScore < 85 ? (85 - readinessScore).toFixed(1) : null;

  // ─── Loading skeleton ───
  if (!user || !bootstrapLoaded) {
    return (
      <div className="p-4 lg:p-6 xl:p-8 space-y-6 max-w-[1600px] mx-auto">
        <div className="space-y-2">
          <div className="fi-skeleton h-8 w-72 rounded-lg" />
          <div className="fi-skeleton h-4 w-48 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonChart />
        </div>
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <TasksSyncProvider>
      <TooltipProvider>
        <div className="p-4 lg:p-6 xl:p-8 space-y-6 w-full max-w-[1600px] mx-auto">

          {/* ════════ HEADER ════════ */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <Target className="w-6 h-6 shrink-0" style={{ color: 'var(--fi-primary)' }} />
            <div className="flex-1">
              <h1
                className="text-xl lg:text-2xl font-display font-bold"
                style={{ color: 'var(--fi-text-primary)' }}
              >
                Frictionless Score
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--fi-text-tertiary)' }}>
                Your Frictionless investment score, category insights, and improvement roadmap.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {parsedCategories.length > 0 && (
                <ReadinessShareButton
                  overallScore={readinessScore}
                  categories={parsedCategories}
                  completedTasks={stats.done}
                  totalTasks={stats.total}
                  delta={readinessDelta}
                />
              )}
            </div>
          </motion.div>

          {/* ════════ TOP SECTION: Score + Progress (narrower score, wider chart) ════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">

            {/* ── Left Card: Frictionless Score ── */}
            <motion.div
              custom={0}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="fi-card flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-secondary)' }}>
                  Frictionless Score
                </h3>
                <TooltipInfo text="Your overall investment Frictionless based on multiple assessment categories." />
              </div>

              <div className="flex-1 flex flex-col items-center justify-center py-4">
                <ScoreGauge
                  score={readinessScore}
                  size="lg"
                  showDelta={readinessDelta !== 0}
                  delta={readinessDelta}
                />

                {/* How this score is calculated */}
                <button
                  onClick={() => setShowMethodology(true)}
                  className="text-xs font-medium mt-3 hover:underline transition-colors"
                  style={{ color: 'var(--fi-text-link)' }}
                >
                  How this score is calculated
                </button>

                <p className="text-xs mt-2" style={{ color: 'var(--fi-text-muted)' }}>
                  Top investors prefer &ge;85%
                </p>

                {deltaToTarget && (
                  <p className="text-xs mt-1" style={{ color: 'var(--fi-score-good)' }}>
                    &#8599; {deltaToTarget}% to target
                  </p>
                )}
              </div>

              {/* Benefits */}
              <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--fi-border)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--fi-text-muted)' }}>
                  Improving your Frictionless increases:
                </p>
                {['Investor response rates', 'Warm intro success'].map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: 'var(--fi-score-excellent)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--fi-text-secondary)' }}>{b}</span>
                  </div>
                ))}
              </div>

              <AskButton onClick={() => openAskWithPrompt(`Analyze my Frictionless score of ${readinessScore}%. What does this mean for my fundraising? What are my strongest and weakest categories? Give me a breakdown in a table and specific actions to improve.`)} size="md" variant="outline" className="w-full justify-center mt-4" />
            </motion.div>

            {/* ── Right Card: Progress Over Time ── */}
            <motion.div
              custom={1}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="fi-card flex flex-col"
            >
              <ProgressChart data={chartData} currentScore={readinessScore} />
              <AskButton onClick={() => openAskWithPrompt(`Analyze my Frictionless score progress over time. My current score is ${readinessScore}% with a delta of ${readinessDelta}. What trends do you see? Am I improving fast enough? What pace should I target to be investor-ready?`)} size="md" variant="outline" className="w-full justify-center mt-4" />
            </motion.div>
          </div>

          {/* ════════ INFO ROW ════════ */}
          <motion.div
              custom={2}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="fi-card"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Tasks completed */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: 'var(--fi-text-muted)' }}>
                      Tasks completed
                    </span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--fi-text-primary)' }}>
                      {stats.done} / {stats.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden w-full max-w-xs" style={{ background: 'var(--fi-bg-tertiary)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progressPct}%`,
                        background: 'var(--fi-primary)',
                        transition: 'width 600ms ease',
                      }}
                    />
                  </div>
                </div>

                {/* Assessment status */}
                <p className="text-xs flex-1" style={{ color: 'var(--fi-text-muted)' }}>
                  Run a new assessment to update your score after completing tasks
                </p>

                {/* Re-assess button */}
                <button
                  onClick={handleRefresh}
                  className="fi-btn fi-btn-primary flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-assess
                </button>
              </div>
            </motion.div>

          {/* ════════ SUGGESTED FOCUS BANNER ════════ */}
          {lowestCategory && lowestCategory.score < 86 && (
            <motion.div
              custom={3}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-xl overflow-hidden"
              style={{
                background: theme === 'dark' ? 'rgba(16,185,129,0.05)' : 'var(--fi-primary-50, rgba(16,185,129,0.06))',
                borderLeft: '4px solid var(--fi-primary)',
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <Zap className="w-5 h-5 shrink-0" style={{ color: 'var(--fi-primary)' }} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold" style={{ color: 'var(--fi-primary)' }}>Suggested focus</span>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--fi-text-secondary)' }}>
                    Improve <strong style={{ color: 'var(--fi-text-primary)' }}>{lowestCategory.name}</strong>{' '}
                    ({lowestCategory.score}%) first to raise your overall score fastest.
                  </p>
                </div>
                <button
                  onClick={() => openAskWithPrompt(`My weakest Frictionless category is "${lowestCategory.name}" at ${lowestCategory.score}%. Give me specific, actionable tips to improve this category. What do top-performing startups do differently here? Include examples.`)}
                  className="text-xs font-medium shrink-0 flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--fi-primary)' }}
                >
                  Get AI tips <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ VISUAL BREAKDOWN SECTION ════════ */}
          {parsedCategories.length > 0 && (
            <motion.div
              custom={4}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="fi-card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
                  Visual breakdown
                </h3>
                <AskButton onClick={() => openAskWithPrompt(`Give me a detailed visual breakdown analysis of my Frictionless categories. Show me all categories in a table with their scores, what each means, and prioritized improvement actions.`)} size="sm" variant="outline" />
              </div>

              {/* Two charts side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Horizontal Bar Chart */}
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--fi-text-muted)' }}>
                    Frictionless by category
                  </p>
                  <div style={{ height: Math.max(220, parsedCategories.length * 40) }}>
                    <LazyResponsiveContainer width="100%" height="100%">
                      <LazyBarChart
                        data={parsedCategories.map((c) => ({
                          name: c.name.length > 20 ? c.name.slice(0, 18) + '..' : c.name,
                          score: c.score,
                          fullName: c.name,
                          fill: getScoreColor(c.score),
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
                      >
                        <LazyCartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} horizontal={false} />
                        <LazyXAxis
                          type="number"
                          domain={[0, 100]}
                          ticks={[25, 50, 75, 100]}
                          tick={{ fontSize: 10, fill: chartTheme.axisColor }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <LazyYAxis
                          type="category"
                          dataKey="name"
                          width={130}
                          tick={{ fontSize: 11, fill: chartTheme.axisColor }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <LazyRechartsTooltip
                          cursor={{ fill: 'var(--fi-bg-tertiary)', opacity: 0.5 }}
                          contentStyle={{
                            background: chartTheme.tooltipBg,
                            border: `1px solid ${chartTheme.tooltipBorder}`,
                            borderRadius: 8,
                            fontSize: 12,
                            color: chartTheme.tooltipText,
                          }}
                          formatter={(value: unknown) => [`${value}%`, 'Score']}
                        />
                        <LazyBar
                          dataKey="score"
                          radius={[0, 6, 6, 0]}
                          barSize={20}
                          animationDuration={800}
                          label={{ position: 'right', fontSize: 11, fill: 'var(--fi-text-secondary)', fontWeight: 600, formatter: (v: unknown) => `${v}%` }}
                          shape={(props: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
                            const { x, y, width, height, payload } = props;
                            return (
                              <rect
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                rx={6}
                                fill={payload?.fill || 'var(--fi-primary)'}
                              />
                            );
                          }}
                        />
                      </LazyBarChart>
                    </LazyResponsiveContainer>
                  </div>
                </div>

                {/* Right: Radar Chart */}
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--fi-text-muted)' }}>
                    Category scores at a glance
                  </p>
                  <div style={{ height: Math.max(220, parsedCategories.length * 40) }}>
                    <LazyResponsiveContainer width="100%" height="100%">
                      <LazyRadarChart
                        data={parsedCategories.map((c) => ({
                          category: c.name.length > 14 ? c.name.slice(0, 12) + '..' : c.name,
                          score: c.score,
                          fullName: c.name,
                          fullMark: 100,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                      >
                        <LazyPolarGrid stroke="var(--fi-border)" />
                        <LazyPolarAngleAxis
                          dataKey="category"
                          tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }}
                        />
                        <LazyPolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }}
                          tickCount={5}
                        />
                        <LazyRechartsTooltip
                          contentStyle={{
                            background: chartTheme.tooltipBg,
                            border: `1px solid ${chartTheme.tooltipBorder}`,
                            borderRadius: 8,
                            fontSize: 12,
                            color: chartTheme.tooltipText,
                          }}
                          formatter={(value: unknown) => [`${value}%`, 'Score']}
                        />
                        <LazyRadar
                          name="Score"
                          dataKey="score"
                          stroke="var(--fi-primary)"
                          strokeWidth={2}
                          fill="var(--fi-primary)"
                          fillOpacity={0.2}
                          dot={{ r: 4, fill: 'var(--fi-primary)', strokeWidth: 0 }}
                          animationDuration={800}
                        />
                      </LazyRadarChart>
                    </LazyResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 pt-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
                <LegendDot color="var(--fi-score-excellent)" label="86%+ Excellent" />
                <LegendDot color="var(--fi-score-good)" label="80–85% Good" />
                <LegendDot color="var(--fi-score-need-improvement)" label="<80% Needs Improvement" />
              </div>
            </motion.div>
          )}

          {/* ════════ CATEGORY DETAILS SECTION ════════ */}
          {parsedCategories.length > 0 && (
            <motion.div
              custom={5}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Desktop: Left sidebar + Right content */}
              <div className="hidden lg:flex gap-4" style={{ height: '560px' }}>
                {/* Left Sidebar — evenly spaced category cards */}
                <div className="w-[260px] shrink-0 flex flex-col gap-1.5">
                  {parsedCategories.map((cat) => {
                    const isActive = cat.key === selectedCategoryKey;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setSelectedCategoryKey(cat.key)}
                        className="flex-1 flex items-center gap-2.5 px-3 rounded-xl text-left transition-all duration-150 overflow-hidden"
                        style={{
                          border: isActive ? '2px solid var(--fi-primary)' : '2px solid var(--fi-border)',
                          background: isActive ? 'var(--fi-primary-50, rgba(16,185,129,0.06))' : 'var(--fi-bg-card)',
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                          style={{
                            background: isActive ? 'rgba(16,185,129,0.1)' : 'var(--fi-bg-tertiary)',
                            color: isActive ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
                            fontSize: '12px',
                          }}
                        >
                          {getCategoryIcon(cat.name)}
                        </div>
                        <span
                          className="flex-1 min-w-0 text-[13px] leading-snug"
                          style={{
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--fi-text-primary)' : 'var(--fi-text-secondary)',
                          }}
                        >
                          {cat.name}
                        </span>
                        <span
                          className="text-sm font-bold tabular-nums shrink-0"
                          style={{ color: getScoreColor(cat.score) }}
                        >
                          {cat.score}%
                        </span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: getScoreColor(cat.score) }}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Right Content Panel — fills remaining space, scrollable */}
                <div className="flex-1 min-w-0 overflow-y-auto flex">
                  {selectedCategory && (
                    <CategoryDetailPanel
                      category={selectedCategory}
                      onViewTasks={handleViewTasks}
                      theme={theme}
                      categories={parsedCategories}
                    />
                  )}
                </div>
              </div>

              {/* Tablet: Horizontal tabs above content */}
              <div className="hidden md:block lg:hidden">
                <div className="overflow-x-auto -mx-4 px-4 mb-4">
                  <div className="flex gap-2 pb-2">
                    {parsedCategories.map((cat) => {
                      const isActive = cat.key === selectedCategoryKey;
                      return (
                        <button
                          key={cat.key}
                          onClick={() => setSelectedCategoryKey(cat.key)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                          style={{
                            background: isActive ? 'var(--fi-primary-50, rgba(16,185,129,0.1))' : 'var(--fi-bg-secondary)',
                            color: isActive ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
                            border: `1px solid ${isActive ? 'var(--fi-primary)' : 'var(--fi-border)'}`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: getScoreColor(cat.score) }}
                          />
                          {cat.name}
                          <span className="font-bold tabular-nums">{cat.score}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedCategory && (
                  <CategoryDetailPanel
                    category={selectedCategory}
                    onViewTasks={handleViewTasks}
                    theme={theme}
                    categories={parsedCategories}
                  />
                )}
              </div>

              {/* Mobile: Dropdown selector + content */}
              <div className="md:hidden">
                <select
                  value={selectedCategoryKey ?? ''}
                  onChange={(e) => setSelectedCategoryKey(e.target.value)}
                  className="w-full p-3 rounded-lg text-sm font-medium mb-4"
                  style={{
                    background: 'var(--fi-bg-card)',
                    border: '1px solid var(--fi-border)',
                    color: 'var(--fi-text-primary)',
                  }}
                >
                  {parsedCategories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.name} — {cat.score}%
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <CategoryDetailPanel
                    category={selectedCategory}
                    onViewTasks={handleViewTasks}
                    theme={theme}
                    categories={parsedCategories}
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* ════════ RECOMMENDED ACTIONS ════════ */}
          <motion.div
            id="recommended-actions"
            custom={7}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <RecommendedActionsSection
              tasks={tasks.filter((t) => t.status !== 'done')}
              taskGroups={taskGroups}
              filterCategory={taskFilterCategory}
              onFilterChange={setTaskFilterCategory}
              onAskTask={handleAskTask}
              completedCount={stats.done}
              onAskAI={openAskWithPrompt}
              aiDescriptions={aiDescriptions}
              aiDescriptionsLoading={aiDescriptionsLoading}
            />
          </motion.div>

          {/* ════════ WHAT-IF SIMULATOR ════════ */}
          {whatIfTasks.length > 0 && (
            <motion.div custom={8} variants={cardVariants} initial="hidden" animate="visible">
              <WhatIfSimulator
                currentScore={readinessScore}
                tasks={whatIfTasks}
                categories={parsedCategories}
              />
            </motion.div>
          )}

          {/* ════════ INTELLIGENCE SIDEBAR ════════ */}
          <IntelligenceSidebar
            open={intelligenceOpen}
            onClose={() => { setIntelligenceOpen(false); setIntelligencePrompt(null); }}
            data={narrativeData}
            initialPrompt={intelligencePrompt}
            onPromptConsumed={() => setIntelligencePrompt(null)}
          />

          {/* ════════ METHODOLOGY MODAL ════════ */}
          <Dialog open={showMethodology} onOpenChange={setShowMethodology}>
            <DialogContent className="max-w-lg" style={{ background: 'var(--fi-bg-card)', border: '1px solid var(--fi-border)' }}>
              <DialogHeader>
                <DialogTitle style={{ color: 'var(--fi-text-primary)' }}>How your score is calculated</DialogTitle>
                <DialogDescription style={{ color: 'var(--fi-text-tertiary)' }}>
                  Understanding the Frictionless Score methodology
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <p className="text-sm" style={{ color: 'var(--fi-text-secondary)' }}>
                  Your Frictionless score is calculated by evaluating your startup across multiple weighted categories that investors care about most.
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Weighted Categories', desc: 'Each category (Team, Product, Traction, etc.) has a weight reflecting its importance to investors.' },
                    { label: 'Rubric-Based Scoring', desc: 'Individual criteria within each category are scored against an investor-grade rubric.' },
                    { label: 'Evidence-Backed', desc: 'Scores are derived from your pitch deck, data room documents, and questionnaire responses.' },
                    { label: 'Dynamic Updates', desc: 'Your score updates as you complete tasks and upload new materials.' },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--fi-primary)' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--fi-text-primary)' }}>{item.label}</p>
                        <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </TooltipProvider>
    </TasksSyncProvider>
  );
}

export default function ReadinessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--fi-primary)' }} />
      </div>
    }>
      <ReadinessContent />
    </Suspense>
  );
}


// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

// ─── Legend Dot ───
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>{label}</span>
    </div>
  );
}

// ─── Progress Over Time Chart ───
function ProgressChart({
  data,
  currentScore,
}: {
  data: { date: string; score: number; fullDate: string }[];
  currentScore: number;
}) {
  const [period, setPeriod] = useState('30d');
  const tabs = [
    { id: '30d', label: 'Last 30 days' },
    { id: 'quarterly', label: 'Quarterly' },
    { id: 'all', label: 'All time' },
  ];

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-secondary)' }}>
            Progress
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fi-text-muted)' }}>
            Your score updates as you improve your startup profile
          </p>
        </div>
      </div>

      <div className="mb-3">
        <TabGroup tabs={tabs} activeTab={period} onChange={setPeriod} variant="pill" size="sm" />
      </div>

      <div className="flex-1" style={{ minHeight: 200 }}>
        {data.length === 0 ? (
          <EmptyState
            title="No score history yet"
            description="Complete assessments to see your score trend over time."
            className="py-8"
          />
        ) : (
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyAreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--fi-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--fi-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <LazyCartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
              <LazyXAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: chartTheme.axisColor }}
                tickLine={false}
                axisLine={false}
              />
              <LazyYAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: chartTheme.axisColor }}
                tickLine={false}
                axisLine={false}
                tickCount={5}
              />
              <LazyRechartsTooltip
                contentStyle={{
                  background: chartTheme.tooltipBg,
                  border: `1px solid ${chartTheme.tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: chartTheme.tooltipText,
                }}
                formatter={(value: unknown) => [`${value}%`, 'Score']}
              />
              <LazyReferenceLine y={85} stroke="var(--fi-score-good)" strokeDasharray="6 4" label={{ value: 'Target', position: 'right', fontSize: 10, fill: 'var(--fi-text-muted)' }} />
              <LazyArea
                type="monotone"
                dataKey="score"
                stroke="var(--fi-primary)"
                strokeWidth={2}
                fill="url(#progressGradient)"
                dot={{ r: 3, fill: 'var(--fi-primary)', strokeWidth: 2, stroke: 'var(--fi-bg-card)' }}
                activeDot={{ r: 5, fill: 'var(--fi-primary)', strokeWidth: 2, stroke: 'var(--fi-bg-card)' }}
                animationDuration={800}
              />
            </LazyAreaChart>
          </LazyResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Category Detail Panel (2-column sub-criteria grid) ───
function CategoryDetailPanel({
  category,
  onViewTasks,
  theme,
  categories,
}: {
  category: ParsedRubricCategory;
  onViewTasks: (categoryName: string) => void;
  theme: string;
  categories: ParsedRubricCategory[];
}) {
  const scoreInfo = getScoreInfo(category.score);
  const allItems = category.items;

  return (
    <motion.div
      key={category.key}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="fi-card flex flex-col h-full"
    >
      {/* Header — fixed */}
      <div className="pb-3 shrink-0" style={{ borderBottom: '1px solid var(--fi-border)' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--fi-text-primary)' }}>
          {category.name}
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: getScoreColor(category.score) }} />
          <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--fi-text-primary)' }}>
            {category.score}%
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: scoreInfo.level === 'excellent' ? 'rgba(16,185,129,0.1)' :
                          scoreInfo.level === 'good' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
              color: scoreInfo.color,
            }}
          >
            {scoreInfo.label}
          </span>
        </div>
      </div>

      {/* Scrollable grid of sub-criteria cards */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {allItems.map((item, i) => (
            <SubCriteriaCard key={i} item={item} theme={theme} />
          ))}
        </div>
      </div>

      {/* View Tasks button — pinned at bottom */}
      <div className="pt-3 shrink-0" style={{ borderTop: '1px solid var(--fi-border)' }}>
        <button
          onClick={() => onViewTasks(category.name)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: 'var(--fi-bg-secondary)',
            border: '1px solid var(--fi-border)',
            color: 'var(--fi-text-primary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--fi-primary)'; e.currentTarget.style.color = 'var(--fi-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--fi-border)'; e.currentTarget.style.color = 'var(--fi-text-primary)'; }}
        >
          View Tasks
        </button>
      </div>
    </motion.div>
  );
}

// ─── Sub-Criteria Card (individual rubric item) ───
function SubCriteriaCard({ item, theme }: { item: RubricItem; theme: string }) {
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const pts = (item.Points as number) ?? 0;
  const max = (item.maximum_points as number) ?? 0;
  const scoreLabel = pts >= 4 ? 'High' : pts >= 2 ? 'Medium' : 'Low';
  const scoreColor = pts >= 4 ? 'var(--fi-score-excellent)' : pts >= 2 ? 'var(--fi-score-good)' : 'var(--fi-score-need-improvement)';
  const scoreBg = pts >= 4 ? 'rgba(16,185,129,0.1)' : pts >= 2 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)';

  // Split evidence value into multiple entries if it contains multiple citations
  const evidenceEntries = useMemo(() => {
    if (!item.Value) return [];
    // Split on common patterns: double quotes, semicolons, or "Slide X" markers
    const raw = String(item.Value);
    const parts = raw.split(/(?<=["""])\s*[,;]\s*(?=["""])/).filter(Boolean);
    return parts.length > 1 ? parts : [raw];
  }, [item.Value]);

  const visibleEvidence = showAllEvidence ? evidenceEntries : evidenceEntries.slice(0, 2);
  const hiddenCount = evidenceEntries.length - 2;

  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{
        background: 'var(--fi-bg-secondary)',
        border: '1px solid var(--fi-border)',
      }}
    >
      {/* Title */}
      <h4 className="text-sm font-semibold leading-snug mb-2" style={{ color: 'var(--fi-text-primary)' }}>
        {item.Question ?? item.Subtopic_Name ?? 'Unnamed'}
      </h4>

      {/* Score badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs font-bold tabular-nums" style={{ color: scoreColor }}>
          {pts}/{max}
        </span>
        <span className="text-xs tabular-nums" style={{ color: 'var(--fi-text-muted)' }}>
          {pts} pts
        </span>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: scoreBg, color: scoreColor }}
        >
          {scoreLabel}
        </span>
      </div>

      {/* Description / Reasoning for scored items */}
      {pts > 0 && item.Reasoning && (
        <p className="text-xs leading-relaxed mb-2 line-clamp-2" style={{ color: 'var(--fi-text-secondary)' }}>
          {item.Reasoning}
        </p>
      )}

      {/* Evidence section */}
      {evidenceEntries.length > 0 && (
        <div className="mt-auto pt-2">
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--fi-text-primary)' }}>Evidence</p>
          <div className="space-y-1.5">
            {visibleEvidence.map((entry, idx) => (
              <p
                key={idx}
                className="text-[11px] leading-relaxed pl-2 line-clamp-2"
                style={{ color: 'var(--fi-text-muted)', borderLeft: '2px solid var(--fi-primary)', fontStyle: 'italic' }}
              >
                &ldquo;{entry.trim()}&rdquo;
              </p>
            ))}
          </div>
          {hiddenCount > 0 && !showAllEvidence && (
            <button
              onClick={() => setShowAllEvidence(true)}
              className="text-[11px] font-medium mt-1.5 hover:underline"
              style={{ color: 'var(--fi-text-link)' }}
            >
              +{hiddenCount} more
            </button>
          )}
        </div>
      )}

      {/* Missing section for zero-score items */}
      {pts === 0 && (
        <div className="mt-auto pt-2">
          <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--fi-score-need-improvement)' }}>Missing</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>
            {item.Reasoning || 'No evidence provided'}
          </p>
        </div>
      )}
    </div>
  );
}
