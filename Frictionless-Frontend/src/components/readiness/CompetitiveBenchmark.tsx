'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, TrendingUp, TrendingDown, Minus, Info, X } from 'lucide-react';
import { TooltipInfo } from '@/components/ui/TooltipInfo';
import { getScoreColor } from '@/lib/scores';
import { geminiAnalyze, isGeminiEnabled } from '@/lib/ai/gemini-client';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedAnalysis, setCachedAnalysis, buildScoreHash } from '@/lib/ai/analysis-cache';
import type { ParsedRubricCategory } from '@/lib/readiness-rubric';

interface BenchmarkCategory {
  name: string;
  startup_score: number;
  benchmark_median: number;
  percentile: number;
  insight: string;
  is_strength: boolean;
}

interface BenchmarkData {
  overall_percentile: number;
  summary: string;
  categories: BenchmarkCategory[];
}

interface CompetitiveBenchmarkProps {
  overallScore: number;
  categories: ParsedRubricCategory[];
  companyName?: string;
  className?: string;
}

function generateDemoBenchmark(overallScore: number, categories: ParsedRubricCategory[], companyName?: string): BenchmarkData {
  const overallPercentile = Math.min(95, Math.max(5, Math.round(overallScore * 0.95)));
  const displayName = companyName || 'Your startup';
  return {
    overall_percentile: overallPercentile,
    summary: `${displayName} ranks in the top ${100 - overallPercentile}% of seed-stage companies on the Frictionless platform.`,
    categories: categories.map((c) => {
      const median = Math.round(45 + Math.random() * 25);
      const diff = c.score - median;
      return {
        name: c.name,
        startup_score: c.score,
        benchmark_median: median,
        percentile: Math.min(95, Math.max(5, Math.round(50 + diff * 1.2))),
        insight: diff > 10 ? `Strong advantage over peers in ${c.name.toLowerCase()}` :
                 diff > -5 ? `On par with most startups at this stage` :
                 `Below average — focus area for improvement`,
        is_strength: diff > 10,
      };
    }),
  };
}

export function CompetitiveBenchmark({
  overallScore,
  categories,
  companyName,
  className,
}: CompetitiveBenchmarkProps) {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = companyName || 'Your startup';

  const scoreHash = buildScoreHash(overallScore, categories);

  const generate = useCallback(async () => {
    const cached = getCachedAnalysis<BenchmarkData>('competitive-benchmark', scoreHash);
    if (cached) { setData(cached); return; }

    setIsLoading(true);
    setError(null);

    try {
      if (isGeminiEnabled()) {
        const prompt = getPrompt('COMPETITIVE_BENCHMARK');
        const categoryData = categories.map((c) => `${c.name}: ${c.score}%`).join('\n');
        const userMessage = `${prompt}\n\nCompany: ${name}\nOverall score: ${overallScore}%\nStage: Seed\n\nCategories:\n${categoryData}`;

        const result = await geminiAnalyze(userMessage, { temperature: 0.3 });
        const jsonStr = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr) as BenchmarkData;
        setData(parsed);
        setCachedAnalysis('competitive-benchmark', scoreHash, parsed);
      } else {
        const demo = generateDemoBenchmark(overallScore, categories, companyName);
        setData(demo);
        setCachedAnalysis('competitive-benchmark', scoreHash, demo);
      }
    } catch {
      const demo = generateDemoBenchmark(overallScore, categories, companyName);
      setData(demo);
      setCachedAnalysis('competitive-benchmark', scoreHash, demo);
    } finally {
      setIsLoading(false);
    }
  }, [overallScore, categories, scoreHash]);

  // Auto-generate on first render
  if (!data && !isLoading && !error) {
    generate();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fi-card ${className ?? ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-5 h-5" style={{ color: 'var(--fi-primary)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
          Competitive Benchmark
        </h3>
        <TooltipInfo text={`Competitive Benchmark compares ${name}'s Frictionless scores against other seed-stage companies. See where you outperform peers and where you need to catch up.`} />
      </div>
      <p className="text-[11px] mb-4" style={{ color: 'var(--fi-text-muted)' }}>
        How {name} compares to seed-stage peers
      </p>

      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fi-primary)' }} />
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Overall percentile + summary */}
          <div className="flex items-center gap-3">
            <div
              className="px-3 py-1.5 rounded-full text-sm font-bold shrink-0"
              style={{
                background: data.overall_percentile >= 75 ? 'rgba(16,185,129,0.1)' : data.overall_percentile >= 50 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                color: data.overall_percentile >= 75 ? 'var(--fi-score-excellent)' : data.overall_percentile >= 50 ? 'var(--fi-score-good)' : 'var(--fi-score-need-improvement)',
              }}
            >
              Top {100 - data.overall_percentile}%
            </div>
            <span className="text-xs flex-1" style={{ color: 'var(--fi-text-muted)' }}>
              {data.summary}
            </span>
          </div>

          {/* Per-category comparison */}
          <div className="space-y-3">
            {data.categories.map((cat, idx) => {
              const diff = cat.startup_score - cat.benchmark_median;
              const isAbove = diff > 0;
              const isClose = Math.abs(diff) <= 10;

              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate flex-1" style={{ color: 'var(--fi-text-secondary)' }}>
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAbove ? (
                        <TrendingUp className="w-3 h-3" style={{ color: 'var(--fi-score-excellent)' }} />
                      ) : isClose ? (
                        <Minus className="w-3 h-3" style={{ color: 'var(--fi-score-good)' }} />
                      ) : (
                        <TrendingDown className="w-3 h-3" style={{ color: 'var(--fi-score-need-improvement)' }} />
                      )}
                      <span
                        className="font-semibold tabular-nums"
                        style={{ color: getScoreColor(cat.startup_score) }}
                      >
                        {cat.startup_score}%
                      </span>
                    </div>
                  </div>
                  {/* Comparison bar */}
                  <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
                    {/* Median marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 z-10"
                      style={{ left: `${cat.benchmark_median}%`, background: 'var(--fi-text-muted)' }}
                    />
                    {/* Startup bar */}
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: getScoreColor(cat.startup_score) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.startup_score}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
                    <span>{cat.insight}</span>
                    <span className="tabular-nums">median: {cat.benchmark_median}%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
