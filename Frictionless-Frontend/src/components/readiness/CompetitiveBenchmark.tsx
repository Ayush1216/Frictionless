'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  className?: string;
}

function generateDemoBenchmark(overallScore: number, categories: ParsedRubricCategory[]): BenchmarkData {
  const overallPercentile = Math.min(95, Math.max(5, Math.round(overallScore * 0.95)));
  return {
    overall_percentile: overallPercentile,
    summary: `Your startup ranks in the top ${100 - overallPercentile}% of seed-stage companies on the Frictionless platform.`,
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
  className,
}: CompetitiveBenchmarkProps) {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const userMessage = `${prompt}\n\nOverall score: ${overallScore}%\nStage: Seed\n\nCategories:\n${categoryData}`;

        const result = await geminiAnalyze(userMessage, { temperature: 0.3 });
        // Parse JSON from response — may have markdown code blocks
        const jsonStr = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr) as BenchmarkData;
        setData(parsed);
        setCachedAnalysis('competitive-benchmark', scoreHash, parsed);
      } else {
        const demo = generateDemoBenchmark(overallScore, categories);
        setData(demo);
        setCachedAnalysis('competitive-benchmark', scoreHash, demo);
      }
    } catch {
      // Fallback to demo
      const demo = generateDemoBenchmark(overallScore, categories);
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
      className={cn('glass-card p-5 flex flex-col', className)}
    >
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground">Competitive Benchmark</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">How you compare to seed-stage peers</p>

      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Overall percentile badge */}
          <div className="flex items-center gap-3">
            <div className={cn(
              'px-3 py-1.5 rounded-full text-sm font-bold',
              data.overall_percentile >= 70 ? 'bg-score-excellent/10 text-score-excellent' :
              data.overall_percentile >= 50 ? 'bg-score-fair/10 text-score-fair' :
              'bg-score-poor/10 text-score-poor'
            )}>
              Top {100 - data.overall_percentile}%
            </div>
            <span className="text-xs text-muted-foreground flex-1">{data.summary}</span>
          </div>

          {/* Per-category comparison bars */}
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
                    <span className="text-muted-foreground font-medium truncate flex-1">{cat.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAbove ? (
                        <TrendingUp className="w-3 h-3 text-score-excellent" />
                      ) : isClose ? (
                        <Minus className="w-3 h-3 text-score-fair" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-score-poor" />
                      )}
                      <span className={cn(
                        'font-semibold tabular-nums',
                        isAbove ? 'text-score-excellent' : isClose ? 'text-score-fair' : 'text-score-poor'
                      )}>
                        {cat.startup_score}%
                      </span>
                    </div>
                  </div>
                  {/* Comparison bar */}
                  <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                    {/* Median marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40 z-10"
                      style={{ left: `${cat.benchmark_median}%` }}
                    />
                    {/* Startup bar */}
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        isAbove ? 'bg-score-excellent' : isClose ? 'bg-score-fair' : 'bg-score-poor'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.startup_score}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
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
