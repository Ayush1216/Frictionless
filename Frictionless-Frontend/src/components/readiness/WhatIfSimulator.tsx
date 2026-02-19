'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ArrowUpRight, Loader2, CheckSquare, Square } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { TooltipInfo } from '@/components/ui/TooltipInfo';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { getScoreColor } from '@/lib/scores';
import { streamChat, isAIEnabled } from '@/lib/ai/openai-client';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedAnalysis, setCachedAnalysis, buildScoreHash } from '@/lib/ai/analysis-cache';
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
 */
function computeWeightedProjection(
  currentScore: number,
  selectedTasks: WhatIfTask[],
  allTasks: WhatIfTask[],
  categories?: ParsedRubricCategory[]
): { projectedScore: number; categoryProjections: { name: string; current: number; projected: number; impact: number }[] } {
  if (!categories || categories.length === 0) {
    const totalPossible = allTasks.reduce((sum, t) => sum + t.impactPoints, 0) || 1;
    const selectedPoints = selectedTasks.reduce((sum, t) => sum + t.impactPoints, 0);
    const gap = 100 - currentScore;
    const projectedScore = Math.min(100, Math.round((currentScore + gap * (selectedPoints / totalPossible)) * 10) / 10);
    return { projectedScore, categoryProjections: [] };
  }

  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0) || 1;

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
  const gaugeKey = useRef(0);

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
    gaugeKey.current += 1;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fi-card ${className ?? ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Calculator className="w-5 h-5" style={{ color: 'var(--fi-primary)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
          What-If Simulator
        </h3>
        <TooltipInfo text="Select tasks to simulate how completing them would affect your weighted readiness score. The projection uses category weights for accuracy." />
      </div>
      <p className="text-[11px] mb-4" style={{ color: 'var(--fi-text-muted)' }}>
        Select tasks to see how they affect your weighted score
      </p>

      {/* 65/35 split layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Task selection (~65%) */}
        <div className="lg:w-[65%] space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
          {tasks.slice(0, 12).map((t) => {
            const isSelected = selected.has(t.id);
            return (
              <motion.button
                key={t.id}
                onClick={() => {
                  toggle(t.id);
                  onSelectTask?.(t.id);
                }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  background: isSelected ? 'rgba(16,185,129,0.08)' : 'var(--fi-bg-secondary)',
                  borderColor: isSelected ? 'var(--fi-primary)' : 'var(--fi-border)',
                }}
                transition={{ duration: 0.2 }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs"
                style={{
                  border: '1px solid',
                }}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fi-primary)' }} />
                ) : (
                  <Square className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fi-text-muted)' }} />
                )}
                <div className="flex-1 min-w-0">
                  <span
                    className="truncate block text-xs font-medium"
                    style={{ color: isSelected ? 'var(--fi-text-primary)' : 'var(--fi-text-secondary)' }}
                  >
                    {t.title}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>{t.category}</span>
                </div>
                <span
                  className="text-[10px] font-semibold tabular-nums shrink-0"
                  style={{ color: 'var(--fi-primary)' }}
                >
                  +{t.impactPoints} pts
                </span>
              </motion.button>
            );
          })}
          {tasks.length === 0 && (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--fi-text-muted)' }}>
              No tasks available for simulation
            </p>
          )}
        </div>

        {/* Right: Projected score gauge (~35%) */}
        <div className="lg:w-[35%] flex flex-col items-center justify-center gap-3 py-2">
          <ScoreGauge
            key={gaugeKey.current}
            score={projectedScore}
            size="lg"
            showLabel
            animated
          />
          <AnimatePresence mode="wait">
            {totalImpact > 0 && (
              <motion.div
                key={`delta-${totalImpact}`}
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: 'var(--fi-score-excellent)' }}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{totalImpact}% uplift
              </motion.div>
            )}
          </AnimatePresence>
          <div className="text-center">
            <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
              {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        </div>
      </div>

      {/* Category impact breakdown */}
      <AnimatePresence>
        {categoryProjections.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-3 space-y-2" style={{ borderTop: '1px solid var(--fi-border)' }}>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--fi-text-muted)' }}
              >
                Category Impact
              </span>
              {categoryProjections.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <span
                    className="text-[10px] w-28 truncate"
                    style={{ color: 'var(--fi-text-secondary)' }}
                  >
                    {cat.name}
                  </span>
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--fi-bg-tertiary)' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: getScoreColor(cat.projected) }}
                      animate={{ width: `${cat.projected}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span
                    className="text-[10px] tabular-nums w-20 text-right"
                    style={{ color: 'var(--fi-text-muted)' }}
                  >
                    {cat.current}% →{' '}
                    <span style={{ color: getScoreColor(cat.projected), fontWeight: 600 }}>
                      {cat.projected}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Analysis */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
        {selectedTasks.length > 0 && !aiNarrative && (
          <button
            onClick={generateNarrative}
            disabled={isLoadingNarrative}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: isLoadingNarrative ? 'rgba(16,185,129,0.3)' : 'var(--fi-primary)',
              color: '#fff',
              opacity: isLoadingNarrative ? 0.7 : 1,
              cursor: isLoadingNarrative ? 'not-allowed' : 'pointer',
            }}
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
            className="rounded-lg p-3"
            style={{
              background: 'rgba(16,185,129,0.05)',
              border: '1px solid rgba(16,185,129,0.15)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Image src="/ai-logo.png" alt="Frictionless" width={12} height={12} />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--fi-primary)' }}
              >
                AI Insight
              </span>
            </div>
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--fi-text-secondary)' }}>
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong style={{ color: 'var(--fi-text-primary)', fontWeight: 600 }}>{children}</strong>
                ),
              }}
            >
              {aiNarrative}
            </ReactMarkdown>
            {isLoadingNarrative && (
              <span className="inline-block w-0.5 h-3 animate-pulse ml-0.5" style={{ background: 'var(--fi-primary)' }} />
            )}
          </motion.div>
        )}
        {selectedTasks.length === 0 && (
          <p className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
            Select tasks above to see projected impact
          </p>
        )}
      </div>
    </motion.div>
  );
}
