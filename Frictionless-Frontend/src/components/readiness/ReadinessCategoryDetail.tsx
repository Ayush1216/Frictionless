'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, AlertCircle, CheckCircle2, AlertTriangle, CalendarDays, Loader2, X, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
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
    case 'full': return {
      label: 'Complete',
      icon: CheckCircle2,
      color: 'var(--fi-score-excellent)',
      bgColor: 'var(--fi-score-excellent-bg)',
    };
    case 'partial': return {
      label: 'Partial',
      icon: AlertTriangle,
      color: 'var(--fi-score-good)',
      bgColor: 'var(--fi-score-good-bg)',
    };
    case 'missing': return {
      label: 'Missing',
      icon: AlertCircle,
      color: 'var(--fi-score-need-improvement)',
      bgColor: 'var(--fi-score-need-improvement-bg)',
    };
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
      className="flex-1 min-w-0 flex flex-col fi-card overflow-hidden"
    >
      {/* Category header — fixed */}
      <div
        className="p-4 shrink-0"
        style={{ borderBottom: '1px solid var(--fi-border)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-display font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{category.name}</h2>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: scoreInfo.color }} />
            <span className="text-base font-bold tabular-nums" style={{ color: scoreInfo.color }}>{category.score}%</span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${scoreInfo.color}15`, color: scoreInfo.color }}
            >
              {scoreInfo.label}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
            <span>{scoredItems.length} scored</span>
            {missingItems.length > 0 && <span style={{ color: 'var(--fi-score-need-improvement)' }}>{missingItems.length} missing</span>}
          </div>
        </div>
        {/* Score bar */}
        <div className="h-1.5 rounded-full mt-2.5 overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
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
              className="rounded-lg p-3 border-l-2"
              style={{
                border: '1px solid var(--fi-border)',
                borderLeftWidth: '2px',
                borderLeftColor: config.color,
                background: 'color-mix(in srgb, var(--fi-bg-tertiary) 20%, transparent)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs flex-1 leading-snug" style={{ color: 'var(--fi-text-primary)' }}>{item.Question ?? 'Unnamed item'}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: config.bgColor, color: config.color }}
                  >
                    {config.label}
                  </span>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{
                      color: severity === 'full'
                        ? 'var(--fi-score-excellent)'
                        : severity === 'partial'
                        ? 'var(--fi-score-good)'
                        : 'var(--fi-score-need-improvement)'
                    }}
                  >
                    {pts}/{max}
                  </span>
                </div>
              </div>

              {/* Evidence & Reasoning */}
              {(item.Value || item.Reasoning) && (
                <div
                  className="mt-2 pl-3 space-y-1"
                  style={{ borderLeft: '2px solid var(--fi-border)' }}
                >
                  {item.Value && (
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fi-text-primary)', opacity: 0.7 }}>&ldquo;{item.Value}&rdquo;</p>
                  )}
                  {item.Reasoning && (
                    <div className="flex items-start gap-1.5">
                      <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'var(--fi-primary)', opacity: 0.6 }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>{item.Reasoning}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Missing items */}
        {missingItems.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5" style={{ color: 'var(--fi-score-need-improvement)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--fi-score-need-improvement)' }}>Missing Items ({missingItems.length})</span>
            </div>
            {missingItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-1.5 px-3 rounded-md mb-1"
                style={{ background: 'var(--fi-score-need-improvement-bg)' }}
              >
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--fi-score-need-improvement)' }} />
                <p className="text-xs flex-1" style={{ color: 'var(--fi-text-muted)' }}>{item.Question ?? 'Unnamed item'}</p>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--fi-score-need-improvement)' }}>0/{(item.maximum_points as number) ?? 0}</span>
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
            className="overflow-hidden shrink-0"
            style={{ borderTop: '1px solid color-mix(in srgb, var(--fi-primary) 20%, transparent)' }}
          >
            <div className="relative" style={{ background: 'color-mix(in srgb, var(--fi-primary) 2%, transparent)' }}>
              {/* Plan header with close */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2 sticky top-0 z-10" style={{ background: 'inherit' }}>
                <div className="w-1 h-4 rounded-full shrink-0" style={{ background: 'var(--fi-primary)' }} />
                <CalendarDays className="w-3.5 h-3.5" style={{ color: 'var(--fi-primary)' }} />
                <span className="text-[11px] font-semibold flex-1" style={{ color: 'var(--fi-text-primary)' }}>30-Day Improvement Plan</span>
                {isLoadingPlan && <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--fi-primary)' }} />}
                <button
                  onClick={() => setShowPlan(false)}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--fi-text-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--fi-text-primary)';
                    e.currentTarget.style.background = 'var(--fi-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--fi-text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }}
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
                    '[&>h2]:text-[11px] [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-1.5 [&>h2]:flex [&>h2]:items-center [&>h2]:gap-1.5',
                    '[&>ol]:space-y-1 [&>ol]:pl-4 [&>ol>li]:text-xs [&>ol>li]:leading-relaxed',
                    '[&>p]:text-xs [&>p]:leading-relaxed',
                    '[&>ul]:space-y-1 [&>ul]:pl-4 [&>ul>li]:text-xs',
                    '[&_strong]:font-medium',
                    theme === 'dark' ? 'prose-invert' : ''
                  )}
                  style={{
                    '--tw-prose-body': 'var(--fi-text-muted)',
                    '--tw-prose-headings': 'var(--fi-text-primary)',
                    '--tw-prose-bold': 'var(--fi-text-primary)',
                  } as React.CSSProperties}
                  >
                    <ReactMarkdown>{actionPlan}</ReactMarkdown>
                    {isLoadingPlan && <span className="inline-block w-0.5 h-3 animate-pulse ml-0.5" style={{ background: 'var(--fi-primary)' }} />}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs py-6 justify-center" style={{ color: 'var(--fi-text-muted)' }}>
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
      <div className="p-3 shrink-0 flex gap-2" style={{ borderTop: '1px solid var(--fi-border)' }}>
        <button
          onClick={() => onViewTasks(category.name)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'color-mix(in srgb, var(--fi-primary) 10%, transparent)',
            color: 'var(--fi-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'color-mix(in srgb, var(--fi-primary) 15%, transparent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'color-mix(in srgb, var(--fi-primary) 10%, transparent)';
          }}
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={showPlan
            ? {
                background: 'color-mix(in srgb, var(--fi-primary) 5%, transparent)',
                color: 'var(--fi-primary)',
                border: '1px solid color-mix(in srgb, var(--fi-primary) 20%, transparent)',
              }
            : {
                background: 'color-mix(in srgb, var(--fi-bg-tertiary) 50%, transparent)',
                color: 'var(--fi-text-muted)',
                border: '1px solid var(--fi-border)',
              }
          }
          onMouseEnter={(e) => {
            if (showPlan) {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--fi-primary) 10%, transparent)';
            } else {
              e.currentTarget.style.color = 'var(--fi-text-primary)';
              e.currentTarget.style.background = 'var(--fi-bg-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (showPlan) {
              e.currentTarget.style.background = 'color-mix(in srgb, var(--fi-primary) 5%, transparent)';
            } else {
              e.currentTarget.style.color = 'var(--fi-text-muted)';
              e.currentTarget.style.background = 'color-mix(in srgb, var(--fi-bg-tertiary) 50%, transparent)';
            }
          }}
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
