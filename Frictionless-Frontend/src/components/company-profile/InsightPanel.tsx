'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { AIInsightsStructured } from '@/lib/company-profile-canonical';

export interface InsightPanelProps {
  /** Deduped AI insights text (fallback when structured not provided) */
  aiInsightsDeduped?: string | null;
  /** Raw AI summary quote if needed */
  aiSummary?: string | null;
  /** Pre-parsed structured insights (preferred; max 3 per section, distinct) */
  structured?: AIInsightsStructured | null;
  /** Optional: pre-parsed strengths (otherwise from structured or parsed from text) */
  strengths?: string[];
  /** Optional: pre-parsed risks */
  risks?: string[];
  /** Optional: suggested next actions */
  nextActions?: string[];
  className?: string;
  headerAction?: React.ReactNode;
  /** Default collapsed state */
  defaultExpanded?: boolean;
}

function parseBullets(text: string): string[] {
  return text
    .split(/\n/)
    .map((l) => l.replace(/^\s*[-*•]\s*|\d+\.\s*/g, '').trim())
    .filter((l) => l.length > 10);
}

/** Heuristic: first 1-2 bullets often strengths, then risks, then actions */
function defaultSections(lines: string[]): { strengths: string[]; risks: string[]; nextActions: string[] } {
  const strengths: string[] = [];
  const risks: string[] = [];
  const nextActions: string[] = [];
  const riskWords = /risk|concern|challenge|weak|gap|lack|uncertain/i;
  const actionWords = /next|recommend|suggest|consider|should|action|step|focus/i;
  for (const line of lines) {
    if (riskWords.test(line)) risks.push(line);
    else if (actionWords.test(line)) nextActions.push(line);
    else if (strengths.length < 2) strengths.push(line);
    else nextActions.push(line);
  }
  if (strengths.length === 0 && lines.length > 0) strengths.push(lines[0]);
  if (risks.length === 0 && lines.length > 1) risks.push(lines[1]);
  if (nextActions.length === 0 && lines.length > 2) nextActions.push(...lines.slice(2, 4));
  return { strengths, risks, nextActions };
}

const MAX_DISPLAY = 3;

export function InsightPanel({
  aiInsightsDeduped,
  aiSummary,
  structured,
  strengths: propStrengths,
  risks: propRisks,
  nextActions: propNextActions,
  className,
  headerAction,
  defaultExpanded = false,
}: InsightPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasStructured = structured && (structured.key_strengths?.length > 0 || structured.top_risks?.length > 0 || structured.suggested_next_actions?.length > 0 || (structured.summary && structured.summary.trim().length > 0));
  const summaryText = structured?.summary ?? aiSummary ?? null;
  const strengths = (hasStructured ? structured!.key_strengths : propStrengths) ?? [];
  const risks = (hasStructured ? structured!.top_risks : propRisks) ?? [];
  const nextActions = (hasStructured ? structured!.suggested_next_actions : propNextActions) ?? [];

  const hasDeduped = aiInsightsDeduped && aiInsightsDeduped.trim().length > 0;
  const rawBullets = !hasStructured && hasDeduped ? parseBullets(aiInsightsDeduped) : [];
  const defaulted = defaultSections(rawBullets);
  const finalStrengths = (strengths.length > 0 ? strengths : defaulted.strengths).slice(0, MAX_DISPLAY);
  const finalRisks = (risks.length > 0 ? risks : defaulted.risks).slice(0, MAX_DISPLAY);
  const finalNextActions = (nextActions.length > 0 ? nextActions : defaulted.nextActions).slice(0, MAX_DISPLAY);
  const hasAny = finalStrengths.length > 0 || finalRisks.length > 0 || finalNextActions.length > 0 || (summaryText && summaryText.trim().length > 0);

  if (!hasAny && !hasDeduped) {
    return (
      <div className={cn('fi-card p-5', className)}>
        <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>No insights yet. Refresh to generate.</p>
      </div>
    );
  }

  // Count of insight items
  const insightCount = finalStrengths.length + finalRisks.length + finalNextActions.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('fi-card overflow-hidden flex flex-col p-0', className)}
      style={{ borderColor: 'rgba(16,185,129,0.15)' }}
    >
      {/* Clickable header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-5 py-3.5 transition-colors text-left"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
            <Image src="/ai-logo.png" alt="AI" width={28} height={28} className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight" style={{ color: 'var(--fi-text-primary)' }}>AI Insights</h3>
            <p className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
              {insightCount > 0 ? `${insightCount} insights available` : 'AI-powered analysis'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerAction && <div onClick={(e) => e.stopPropagation()}>{headerAction}</div>}
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', expanded && 'rotate-180')} style={{ color: 'var(--fi-text-muted)' }} />
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 space-y-4" style={{ borderTop: '1px solid var(--fi-border)' }}>
              {summaryText && summaryText.trim().length > 0 && (
                <div className="pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fi-text-muted)' }}>Summary</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>{summaryText.trim()}</p>
                </div>
              )}
              {finalStrengths.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--fi-primary)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Key strengths
                  </p>
                  <ul className="space-y-1">
                    {finalStrengths.map((s, i) => (
                      <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--fi-text-secondary)' }}>
                        <span className="shrink-0" style={{ color: 'var(--fi-primary)' }}>•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {finalRisks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--fi-score-good)' }}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Top risks
                  </p>
                  <ul className="space-y-1">
                    {finalRisks.map((r, i) => (
                      <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--fi-text-secondary)' }}>
                        <span className="shrink-0" style={{ color: 'var(--fi-score-good)' }}>•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {finalNextActions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--fi-score-excellent)' }}>
                    <TrendingUp className="w-3.5 h-3.5" /> Suggested next actions
                  </p>
                  <ul className="space-y-1">
                    {finalNextActions.map((a, i) => (
                      <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--fi-text-secondary)' }}>
                        <span className="shrink-0" style={{ color: 'var(--fi-score-excellent)' }}>•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasDeduped && finalStrengths.length === 0 && finalRisks.length === 0 && finalNextActions.length === 0 && (
                <ul className="space-y-1.5 text-sm pt-2" style={{ color: 'var(--fi-text-secondary)' }}>
                  {rawBullets.slice(0, 5).map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 font-bold" style={{ color: 'var(--fi-primary)' }}>•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
