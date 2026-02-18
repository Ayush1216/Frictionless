'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, AlertCircle, CheckCircle2, AlertTriangle, CalendarDays, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { getScoreInfo } from '@/lib/score-utils';
import { geminiStream, isGeminiEnabled } from '@/lib/ai/gemini-client';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedAnalysis, setCachedAnalysis, buildScoreHash } from '@/lib/ai/analysis-cache';
import { useUIStore } from '@/stores/ui-store';
import type { ParsedRubricCategory, RubricItem } from '@/lib/readiness-rubric';

interface ReadinessCategoryDetailProps {
  category: ParsedRubricCategory;
  onViewTasks: (categoryName: string) => void;
}

function getItemSeverity(item: RubricItem): 'full' | 'partial' | 'missing' {
  const pts = (item.Points as number) ?? 0;
  const max = (item.maximum_points as number) ?? 0;
  if (max <= 0) return 'full';
  if (pts <= 0) return 'missing';
  if (pts >= max) return 'full';
  return 'partial';
}

function getSeverityConfig(severity: 'full' | 'partial' | 'missing') {
  switch (severity) {
    case 'full': return { label: 'Complete', badgeClass: 'bg-score-excellent/10 text-score-excellent', icon: CheckCircle2, borderClass: 'border-l-score-excellent' };
    case 'partial': return { label: 'Partial', badgeClass: 'bg-score-fair/10 text-score-fair', icon: AlertTriangle, borderClass: 'border-l-score-fair' };
    case 'missing': return { label: 'Missing', badgeClass: 'bg-score-poor/10 text-score-poor', icon: AlertCircle, borderClass: 'border-l-score-poor' };
  }
}

const DEMO_ACTION_PLAN = `## Week 1: Foundation
1. **Audit existing documentation** — Review all current materials for this category and identify what's missing
2. **Research industry benchmarks** — Gather 3-5 examples of what top-performing startups include
3. **Create an outline** — Draft a structured template for all missing items

## Week 2: Build
1. **Complete primary deliverables** — Fill in the most critical missing rubric items
2. **Gather supporting evidence** — Collect data points, metrics, and third-party validation
3. **Draft narrative sections** — Write clear, concise descriptions for each requirement

## Week 3: Refine
1. **Get advisor feedback** — Share drafts with 2-3 mentors or advisors for review
2. **Strengthen weak points** — Address specific feedback and add supporting data
3. **Cross-reference with rubric** — Ensure every scored item has strong supporting evidence

## Week 4: Polish & Validate
1. **Final review pass** — Polish language, formatting, and data accuracy
2. **External validation** — Get at least one independent review from an investor or advisor
3. **Update platform** — Upload all finalized materials to your Frictionless data room

## Expected Outcome
Following this plan should improve your category score by 15-25 points, moving you significantly closer to investor-ready status.`;

export function ReadinessCategoryDetail({ category, onViewTasks }: ReadinessCategoryDetailProps) {
  const scoreInfo = getScoreInfo(category.score);
  const allItems = category.items;
  const missingItems = allItems.filter((i) => ((i.Points as number) ?? 0) === 0);
  const scoredItems = allItems.filter((i) => ((i.Points as number) ?? 0) > 0);
  const [actionPlan, setActionPlan] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const theme = useUIStore((s) => s.theme);

  // Reset plan when category changes
  useEffect(() => {
    setActionPlan(null);
    setShowPlan(false);
    setIsLoadingPlan(false);
  }, [category.key]);

  const generateActionPlan = useCallback(async () => {
    const scoreHash = buildScoreHash(category.score, [{ name: category.name, score: category.score }]);
    const cacheKey = `action-plan-${category.key}`;

    const cached = getCachedAnalysis<string>(cacheKey, scoreHash);
    if (cached) { setActionPlan(cached); setShowPlan(true); return; }

    setIsLoadingPlan(true);
    setActionPlan(null);
    setShowPlan(true);

    const prompt = getPrompt('CATEGORY_ACTION_PLAN');
    const missingList = missingItems.slice(0, 5).map((i) => `- ${i.Question}`).join('\n');
    const partialItems = allItems.filter((i) => {
      const pts = (i.Points as number) ?? 0;
      const max = (i.maximum_points as number) ?? 0;
      return pts > 0 && pts < max;
    });
    const partialList = partialItems.slice(0, 3).map((i) => `- ${i.Question} (${i.Points}/${i.maximum_points})`).join('\n');

    const userMessage = `Category: ${category.name}\nCurrent score: ${category.score}%\n\nMissing items:\n${missingList || 'None'}\n\nPartial items:\n${partialList || 'None'}`;

    let fullContent = '';
    try {
      if (isGeminiEnabled()) {
        for await (const chunk of geminiStream(`${prompt}\n\n${userMessage}`, { temperature: 0.4 })) {
          fullContent += chunk;
          setActionPlan(fullContent);
        }
      } else {
        for (const char of DEMO_ACTION_PLAN) {
          fullContent += char;
          if (fullContent.length % 8 === 0) {
            setActionPlan(fullContent);
            await new Promise((r) => setTimeout(r, 2));
          }
        }
        fullContent = DEMO_ACTION_PLAN;
        setActionPlan(fullContent);
      }
      setCachedAnalysis(cacheKey, scoreHash, fullContent);
    } catch {
      setActionPlan('Unable to generate action plan. Please try again.');
    } finally {
      setIsLoadingPlan(false);
    }
  }, [category, missingItems, allItems]);

  return (
    <motion.div
      key={category.key}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex-1 min-w-0 flex flex-col glass-card overflow-hidden"
    >
      {/* Category header — fixed */}
      <div className="p-4 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-display font-semibold text-foreground">{category.name}</h2>
          <div className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full', scoreInfo.dotClass)} />
            <span className={cn('text-base font-bold tabular-nums', scoreInfo.textClass)}>{category.score}%</span>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', scoreInfo.bgClass, scoreInfo.textClass)}>
              {scoreInfo.label}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{scoredItems.length} scored</span>
            {missingItems.length > 0 && <span className="text-score-poor">{missingItems.length} missing</span>}
          </div>
        </div>
        {/* Score bar */}
        <div className="h-1.5 rounded-full bg-muted mt-2.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: scoreInfo.color }}
            initial={{ width: 0 }}
            animate={{ width: `${category.score}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Scrollable rubric items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Scored items */}
        {scoredItems.map((item, i) => {
          const severity = getItemSeverity(item);
          const config = getSeverityConfig(severity);
          const pts = (item.Points as number) ?? 0;
          const max = (item.maximum_points as number) ?? 0;
          const Icon = config.icon;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn('rounded-lg border border-border/50 bg-muted/20 p-3 border-l-2', config.borderClass)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-foreground flex-1 leading-snug">{item.Question ?? 'Unnamed item'}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', config.badgeClass)}>
                    {config.label}
                  </span>
                  <span className={cn(
                    'text-xs font-bold tabular-nums',
                    severity === 'full' ? 'text-score-excellent' :
                    severity === 'partial' ? 'text-score-fair' :
                    'text-score-poor'
                  )}>
                    {pts}/{max}
                  </span>
                </div>
              </div>

              {/* Evidence */}
              {(item.Value || item.Reasoning) && (
                <div className="mt-1.5 pl-2.5 border-l border-border/40 space-y-0.5">
                  {item.Value && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed">&ldquo;{item.Value}&rdquo;</p>
                  )}
                  {item.Reasoning && (
                    <p className="text-[10px] text-muted-foreground/70 italic leading-relaxed">{item.Reasoning}</p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Missing items */}
        {missingItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-score-poor" />
              <span className="text-xs font-semibold text-score-poor">Missing Items ({missingItems.length})</span>
            </div>
            {missingItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-3 rounded-md bg-score-poor/5 mb-1">
                <div className="w-1 h-1 rounded-full bg-score-poor shrink-0" />
                <p className="text-xs text-muted-foreground flex-1">{item.Question ?? 'Unnamed item'}</p>
                <span className="text-[10px] font-semibold text-score-poor tabular-nums">0/{(item.maximum_points as number) ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Plan — slide-up panel with close */}
      <AnimatePresence>
        {showPlan && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-primary/20 shrink-0"
          >
            <div className="bg-primary/[0.02] relative">
              {/* Plan header with close */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2 sticky top-0 bg-inherit z-10">
                <div className="w-1 h-4 rounded-full bg-primary shrink-0" />
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-semibold text-foreground flex-1">30-Day Improvement Plan</span>
                {isLoadingPlan && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                <button
                  onClick={() => setShowPlan(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Hide plan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Plan content — scrollable */}
              <div className="px-4 pb-3 max-h-[220px] overflow-y-auto">
                {actionPlan ? (
                  <div className={cn(
                    'prose prose-sm max-w-none text-xs leading-relaxed',
                    '[&>h2]:text-[11px] [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-1.5 [&>h2]:text-foreground [&>h2]:flex [&>h2]:items-center [&>h2]:gap-1.5',
                    '[&>ol]:space-y-1 [&>ol]:pl-4 [&>ol>li]:text-xs [&>ol>li]:text-muted-foreground [&>ol>li]:leading-relaxed',
                    '[&>p]:text-xs [&>p]:text-muted-foreground [&>p]:leading-relaxed',
                    '[&>ul]:space-y-1 [&>ul]:pl-4 [&>ul>li]:text-xs [&>ul>li]:text-muted-foreground',
                    '[&_strong]:text-foreground [&_strong]:font-medium',
                    theme === 'dark' ? 'prose-invert' : ''
                  )}>
                    <ReactMarkdown>{actionPlan}</ReactMarkdown>
                    {isLoadingPlan && <span className="inline-block w-0.5 h-3 bg-primary animate-pulse ml-0.5" />}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating plan...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons — fixed at bottom */}
      <div className="p-3 border-t border-border/50 shrink-0 flex gap-2">
        <button
          onClick={() => onViewTasks(category.name)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
        >
          View Improvement Tasks
          <ArrowDown className="w-3 h-3" />
        </button>
        <button
          onClick={() => {
            if (showPlan) { setShowPlan(false); }
            else { generateActionPlan(); }
          }}
          disabled={isLoadingPlan}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
            showPlan
              ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
              : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
          )}
        >
          <CalendarDays className="w-3 h-3" />
          {showPlan ? (
            <><ChevronUp className="w-3 h-3" /> Hide Plan</>
          ) : (
            'Generate 30-Day Plan'
          )}
        </button>
      </div>
    </motion.div>
  );
}
