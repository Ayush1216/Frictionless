'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { ScoreHero } from '@/components/readiness/ScoreHero';
import { CategoryAccordion } from '@/components/readiness/CategoryAccordion';
import { MissingDataBanner } from '@/components/readiness/MissingDataBanner';
import { AssessmentHistory, type ScoreHistoryEntry } from '@/components/readiness/AssessmentHistory';
import { ImprovementChart } from '@/components/readiness/ImprovementChart';
import { getMissingItemsFromRubric } from '@/lib/readiness-rubric';
import { dummyStartups } from '@/lib/dummy-data/startups';
import { dummyAssessmentRuns } from '@/lib/dummy-data/assessments';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase/client';

/** From rubric: lowest-scoring category → task in that category with highest impact (potential points). */
function getRecommendedTask(
  categories: { name: string; score: number }[],
  scoredRubric: Record<string, unknown> | null | undefined,
  currentScore: number
): { taskTitle: string; impactPoints: number; projectedScore: number } | null {
  if (!scoredRubric || categories.length === 0) return null;
  const sorted = [...categories].sort((a, b) => a.score - b.score);
  const lowestCategoryName = sorted[0].name;
  const formatKey = (k: string) =>
    k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const METADATA_KEYS = ['weight', 'Category_Name', 'maximum_point'];

  let rubricTotalMax = 0;
  let bestTask: { title: string; impact: number } | null = null;

  for (const [catKey, catVal] of Object.entries(scoredRubric)) {
    if (['totals', '_overall'].includes(catKey.toLowerCase())) continue;
    if (!catVal || typeof catVal !== 'object' || Array.isArray(catVal)) continue;
    const meta = catVal as Record<string, unknown>;
    const categoryName = (meta.Category_Name as string) || formatKey(catKey);
    for (const [subKey, subVal] of Object.entries(meta)) {
      if (METADATA_KEYS.includes(subKey) || !Array.isArray(subVal)) continue;
      for (const item of subVal) {
        if (!item || typeof item !== 'object' || !('options' in item)) continue;
        const maxPts = Number((item as { maximum_points?: number }).maximum_points ?? 0);
        const pts = Number((item as { Points?: number }).Points ?? 0);
        rubricTotalMax += maxPts;
        if (categoryName !== lowestCategoryName) continue;
        const impact = maxPts - pts;
        if (impact <= 0) continue;
        const title =
          (item as { Question?: string }).Question ||
          (item as { subcategory_name?: string }).subcategory_name ||
          '';
        if (!bestTask || impact > bestTask.impact) bestTask = { title, impact };
      }
    }
  }
  if (!bestTask || bestTask.impact <= 0) return null;
  if (rubricTotalMax <= 0) rubricTotalMax = 1;
  const projectedScore = Math.min(
    100,
    Math.round((currentScore + (bestTask.impact / rubricTotalMax) * 100) * 10) / 10
  );
  return {
    taskTitle: bestTask.title,
    impactPoints: bestTask.impact,
    projectedScore,
  };
}

export default function ReadinessPage() {
  const user = useAuthStore((s) => s.user);
  const isStartup = user?.org_type === 'startup';
  const startup = dummyStartups[0]; // fallback
  const { assessment } = startup;
  const runs = dummyAssessmentRuns.filter(
    (r) => r.startup_org_id === startup.org_id
  );
  const latestRun = runs[runs.length - 1];

  const [readiness, setReadiness] = useState<{
    score_summary?: { _overall?: { raw_percentage?: number }; [k: string]: unknown };
    scored_rubric?: unknown;
    updated_at?: string | null;
  } | null>(null);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const [readinessChecked, setReadinessChecked] = useState(!isStartup);

  useEffect(() => {
    if (!user) return;
    if (user.org_type !== 'startup') {
      setReadinessChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? null;
      if (!token || cancelled) return;
      const [statusRes, historyRes] = await Promise.all([
        fetch('/api/readiness/status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/readiness/score-history', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [statusJson, historyJson] = await Promise.all([
        statusRes.json().catch(() => ({})),
        historyRes.json().catch(() => ({ entries: [] })),
      ]);
      if (cancelled) return;
      if (statusJson.status === 'ready' && statusJson.score_summary) {
        setReadiness({
          score_summary: statusJson.score_summary,
          scored_rubric: statusJson.scored_rubric,
          updated_at: statusJson.updated_at ?? null,
        });
      }
      if (historyJson.entries?.length) {
        setScoreHistory(historyJson.entries);
      }
      if (!cancelled) setReadinessChecked(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const readinessScore = readiness?.score_summary?._overall?.raw_percentage ?? assessment.overall_score;
  // Delta = current vs previous (from score history)
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
      : assessment.categories;
  const lastAssessedIso = readiness?.updated_at ?? latestRun?.scored_at ?? new Date().toISOString();

  const recommendedTask = useMemo(
    () =>
      getRecommendedTask(
        readinessCategories,
        readiness?.scored_rubric as Record<string, unknown> | undefined,
        readinessScore
      ),
    [readinessCategories, readiness?.scored_rubric, readinessScore]
  );

  const missingItems = useMemo(
    () =>
      getMissingItemsFromRubric(
        readinessCategories,
        readiness?.scored_rubric as Record<string, unknown> | undefined
      ),
    [readinessCategories, readiness?.scored_rubric]
  );

  if (!user || (isStartup && !readinessChecked)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-electric-blue" />
        <p className="text-sm text-muted-foreground">Loading your readiness score…</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
          Readiness Score
        </h1>
        <p className="text-muted-foreground mt-1">
          Track and improve your investment readiness across key dimensions.
        </p>
      </motion.div>

      {/* Desktop: 2-column top section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Score Hero */}
        <ScoreHero
          score={readinessScore}
          badge={readiness ? 'assessed' : assessment.badge}
          delta={readinessDelta}
          lastAssessed={lastAssessedIso}
          onRunAssessment={() => {}}
        />

        {/* Right: Missing Data + Assessment History */}
        <div className="space-y-6">
          <MissingDataBanner items={missingItems} />
          <AssessmentHistory runs={runs} scoreHistory={scoreHistory} />
        </div>
      </div>

      {/* Full-width: Category Breakdown */}
      <CategoryAccordion
        categories={readinessCategories}
        missingData={missingItems}
        scoredRubric={readiness?.scored_rubric as Record<string, unknown> | undefined}
      />

      {/* Improvement Chart: lowest-scoring category → highest-impact task */}
      <ImprovementChart
        currentScore={readinessScore}
        recommendedTask={recommendedTask}
        missingData={recommendedTask ? undefined : missingItems}
      />
    </div>
  );
}
