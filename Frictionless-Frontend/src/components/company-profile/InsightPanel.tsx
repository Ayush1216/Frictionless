'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
}: InsightPanelProps) {
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
      <div className={cn('rounded-2xl border border-obsidian-700/50 bg-obsidian-900/40 p-6', className)}>
        <p className="text-xs text-muted-foreground">No insights yet. Refresh to generate.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-2xl border border-electric-blue/20 bg-gradient-to-br from-electric-blue/5 to-transparent overflow-hidden flex flex-col',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-electric-blue/10">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-electric-blue" />
          AI Insights
        </h3>
        {headerAction}
      </div>
      <div className="p-6 space-y-6">
        {summaryText && summaryText.trim().length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{summaryText.trim()}</p>
          </div>
        )}
        {finalStrengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-electric-blue uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Key strengths
            </p>
            <ul className="space-y-1.5">
              {finalStrengths.map((s, i) => (
                <li key={i} className="text-sm text-foreground/90 flex gap-2">
                  <span className="text-electric-blue shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {finalRisks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Top risks
            </p>
            <ul className="space-y-1.5">
              {finalRisks.map((r, i) => (
                <li key={i} className="text-sm text-foreground/90 flex gap-2">
                  <span className="text-amber-500 shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {finalNextActions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Suggested next actions
            </p>
            <ul className="space-y-1.5">
              {finalNextActions.map((a, i) => (
                <li key={i} className="text-sm text-foreground/90 flex gap-2">
                  <span className="text-emerald-500 shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasDeduped && finalStrengths.length === 0 && finalRisks.length === 0 && finalNextActions.length === 0 && (
          <ul className="space-y-2 text-sm text-foreground/90">
            {rawBullets.slice(0, 5).map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-electric-blue shrink-0 font-bold">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
