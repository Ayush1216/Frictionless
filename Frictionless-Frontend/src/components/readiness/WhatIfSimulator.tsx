'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ArrowUpRight, Loader2 } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { streamChat, isAIEnabled } from '@/lib/ai/openai-client';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedAnalysis, setCachedAnalysis, buildScoreHash } from '@/lib/ai/analysis-cache';
import { getScoreInfo } from '@/lib/score-utils';
import { useUIStore } from '@/stores/ui-store';
import type { ParsedRubricCategory } from '@/lib/readiness-rubric';

export interface WhatIfTask {
  id: string;
  title: string;
  impactPoints: number;
  category: string;
}

interface WhatIfSimulatorProps {
  currentScore: number;
  tasks: WhatIfTask[];
  categories?: ParsedRubricCategory[];
  onSelectTask?: (taskId: string) => void;
  className?: string;
}

/**
 * Compute projected overall score using category weights.
 * Uses proportional gap-closing: selecting all tasks = score reaches 100.
 * Each task's impactPoints contribute proportionally to closing the gap
 * between the current score and 100 for its category.
 */
function computeWeightedProjection(
  currentScore: number,
  selectedTasks: WhatIfTask[],
  allTasks: WhatIfTask[],
  categories?: ParsedRubricCategory[]
): { projectedScore: number; categoryProjections: { name: string; current: number; projected: number; impact: number }[] } {
  if (!categories || categories.length === 0) {
    // Simple mode: proportional to total points
    const totalPossible = allTasks.reduce((sum, t) => sum + t.impactPoints, 0) || 1;
    const selectedPoints = selectedTasks.reduce((sum, t) => sum + t.impactPoints, 0);
    const gap = 100 - currentScore;
    const projectedScore = Math.min(100, Math.round((currentScore + gap * (selectedPoints / totalPossible)) * 10) / 10);
    return { projectedScore, categoryProjections: [] };
  }

  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0) || 1;

  // Build impact per category for selected and all tasks
  const selectedByCategory = new Map<string, number>();
  const allByCategory = new Map<string, number>();
  for (const t of selectedTasks) {
    selectedByCategory.set(t.category, (selectedByCategory.get(t.category) ?? 0) + t.impactPoints);
  }
  for (const t of allTasks) {
    allByCategory.set(t.category, (allByCategory.get(t.category) ?? 0) + t.impactPoints);
  }

  const categoryProjections: { name: string; current: number; projected: number; impact: number }[] = [];
  let weightedSum = 0;

  for (const cat of categories) {
    const selectedImpact = selectedByCategory.get(cat.name) ?? 0;
    const totalImpact = allByCategory.get(cat.name) ?? 0;

    // Gap-closing: how much of the remaining gap to 100 does this selection close?
    const gap = 100 - cat.score;
    const ratio = totalImpact > 0 ? selectedImpact / totalImpact : 0;
    const projected = Math.min(100, cat.score + gap * ratio);

    categoryProjections.push({
      name: cat.name,
      current: cat.score,
      projected: Math.round(projected * 10) / 10,
      impact: selectedImpact,
    });

    weightedSum += projected * (cat.weight / totalWeight);
  }

  return {
    projectedScore: Math.min(100, Math.round(weightedSum * 10) / 10),
    categoryProjections: categoryProjections.filter((c) => c.impact > 0),
  };
}

export function WhatIfSimulator({
  currentScore,
  tasks,
  categories,
  onSelectTask,
  className,
}: WhatIfSimulatorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState(false);
  const theme = useUIStore((s) => s.theme);

  const selectedTasks = tasks.filter((t) => selected.has(t.id));

  const { projectedScore, categoryProjections } = useMemo(
    () => computeWeightedProjection(currentScore, selectedTasks, tasks, categories),
    [currentScore, selectedTasks, tasks, categories]
  );

  const totalImpact = Math.round((projectedScore - currentScore) * 10) / 10;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAiNarrative(null);
  };

  const generateNarrative = useCallback(async () => {
    if (selectedTasks.length === 0) return;

    const cacheKey = `whatif-${selectedTasks.map((t) => t.id).sort().join('-')}`;
    const scoreHash = buildScoreHash(currentScore, categories ?? []);
    const cached = getCachedAnalysis<string>(cacheKey, scoreHash);
    if (cached) { setAiNarrative(cached); return; }

    setIsLoadingNarrative(true);
    setAiNarrative(null);

    const taskList = selectedTasks.map((t) => `- "${t.title}" (+${t.impactPoints} pts, ${t.category})`).join('\n');
    const prompt = getPrompt('WHATIF_NARRATIVE');
    const userMessage = `Current score: ${currentScore}%\nProjected score after completing selected tasks: ${projectedScore}%\nTotal uplift: +${totalImpact}%\n\nSelected tasks:\n${taskList}`;

    let fullContent = '';
    try {
      if (isAIEnabled()) {
        for await (const chunk of streamChat(
          [{ role: 'system', content: prompt }, { role: 'user', content: userMessage }],
          { model: 'gpt-4.1-mini', temperature: 0.6 }
        )) {
          fullContent += chunk;
          setAiNarrative(fullContent);
        }
      } else {
        fullContent = `Completing these ${selectedTasks.length} tasks would boost your score from ${currentScore}% to ${projectedScore}%, with the biggest gains in ${selectedTasks[0]?.category ?? 'key areas'}. This momentum shift could meaningfully improve investor perception of your readiness.`;
        setAiNarrative(fullContent);
      }
      setCachedAnalysis(cacheKey, scoreHash, fullContent);
    } catch {
      setAiNarrative('Unable to generate analysis. Please try again.');
    } finally {
      setIsLoadingNarrative(false);
    }
  }, [selectedTasks, currentScore, projectedScore, totalImpact, categories]);

  // Full circle gauge
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = (projectedScore / 100) * circumference;
  const projectedInfo = getScoreInfo(projectedScore);
  const currentInfo = getScoreInfo(currentScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('glass-card p-5', className)}
    >
      <div className="flex items-center gap-2 mb-1">
        <Calculator className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground">What-If Simulator</h3>
      </div>
      <p className="text-[10px] text-muted-foreground mb-4">
        Select tasks to see how they affect your weighted score
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Task selector */}
        <div className="lg:col-span-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {tasks.slice(0, 10).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                toggle(t.id);
                onSelectTask?.(t.id);
              }}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors',
                selected.has(t.id)
                  ? 'bg-primary/15 border border-primary/30 text-foreground'
                  : 'bg-muted/50 border border-transparent text-muted-foreground hover:bg-muted'
              )}
            >
              <div className="flex-1 min-w-0">
                <span className="truncate block text-xs">{t.title}</span>
                <span className="text-[9px] text-muted-foreground">{t.category}</span>
              </div>
              <span className="text-[10px] font-mono text-primary shrink-0">+{t.impactPoints} pts</span>
            </button>
          ))}
        </div>

        {/* Full circle gauge */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="relative w-[120px] h-[120px]">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              {/* Background track */}
              <circle
                cx="60" cy="60" r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              {/* Current score (faint) */}
              <circle
                cx="60" cy="60" r={radius}
                fill="none"
                stroke={currentInfo.color}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (currentScore / 100) * circumference}
                strokeLinecap="round"
                opacity={0.2}
              />
              {/* Projected score */}
              <motion.circle
                cx="60" cy="60" r={radius}
                fill="none"
                stroke={projectedInfo.color}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeLinecap="round"
                animate={{ strokeDashoffset: circumference - progress }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-display font-bold text-foreground tabular-nums">{projectedScore}</span>
              <span className="text-[9px] text-muted-foreground">projected</span>
            </div>
          </div>
          <div className="text-center">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', projectedInfo.bgClass, projectedInfo.textClass)}>
              {projectedInfo.label}
            </span>
            {totalImpact > 0 && (
              <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-score-excellent font-semibold">
                <ArrowUpRight className="w-3 h-3" />
                +{totalImpact}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <AnimatePresence>
        {categoryProjections.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Category Impact</span>
              {categoryProjections.map((cat) => {
                const info = getScoreInfo(cat.projected);
                return (
                  <div key={cat.name} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28 truncate">{cat.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: info.color }}
                        animate={{ width: `${cat.projected}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-16 text-right">
                      {cat.current} → <span className={info.textClass}>{cat.projected}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Analysis */}
      <div className="mt-3 pt-3 border-t border-border/40">
        {selectedTasks.length > 0 && !aiNarrative && (
          <button
            onClick={generateNarrative}
            disabled={isLoadingNarrative}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              isLoadingNarrative
                ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isLoadingNarrative ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
            ) : (
              <><Image src="/ai-logo.png" alt="Frictionless" width={14} height={14} /> Generate AI Analysis</>
            )}
          </button>
        )}
        {aiNarrative && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-primary/5 border border-primary/15 p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Image src="/ai-logo.png" alt="Frictionless" width={12} height={12} />
              <span className="text-[9px] font-semibold text-primary uppercase tracking-wider">AI Insight</span>
            </div>
            <div className={cn("text-xs text-foreground leading-relaxed prose prose-sm max-w-none", theme === 'dark' ? 'prose-invert' : '')}>
              <ReactMarkdown>{aiNarrative}</ReactMarkdown>
            </div>
          </motion.div>
        )}
        {selectedTasks.length === 0 && (
          <p className="text-[10px] text-muted-foreground">Select tasks above to see projected impact</p>
        )}
      </div>
    </motion.div>
  );
}
