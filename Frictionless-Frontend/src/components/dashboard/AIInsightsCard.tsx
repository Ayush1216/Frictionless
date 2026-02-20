'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getAuthHeaders } from '@/lib/api/tasks';
import { useAuthStore } from '@/stores/auth-store';
import { AnimatePresence } from 'framer-motion';

interface AIAnalysis {
  insights?: string;
  strengths?: string[];
  risks?: string[];
  recommendations?: string[];
  cached_at?: string;
  status: 'cached' | 'generated' | 'loading' | 'error';
}

interface AIInsightsCardProps {
  hasAssessment: boolean;
  currentScore: number;
  scoreProjection: number;
  className?: string;
}

export function AIInsightsCard({
  hasAssessment,
  currentScore,
  scoreProjection,
  className,
}: AIInsightsCardProps) {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.org_id ?? null;
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!orgId || !hasAssessment) return;
    let cancelled = false;
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        if (cancelled || !Object.keys(headers).length) return;
        const params = new URLSearchParams({ org_id: orgId });
        const res = await fetch(`/api/readiness/analysis?${params}`, { headers });
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (data.analysis) {
          setAnalysis({
            ...data.analysis,
            status: data.status || 'generated',
            cached_at: data.cached_at,
          });
        } else {
          setAnalysis({ status: 'error' });
        }
      } catch {
        if (!cancelled) setAnalysis({ status: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAnalysis();
    return () => { cancelled = true; };
  }, [orgId, hasAssessment]);

  const projectedScore = useMemo(
    () => Math.min(100, Math.round(scoreProjection)),
    [scoreProjection],
  );

  // Empty state — no assessment yet
  if (!hasAssessment) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={cn('fi-card p-6', className)}
        style={{ background: 'var(--fi-bg-card)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="p-2 rounded-xl"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          >
            <Sparkles className="w-5 h-5" style={{ color: 'var(--fi-primary)' }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--fi-primary)' }}>
            AI Insights
          </h3>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>
          Run your first Frictionless assessment to unlock AI-powered insights about your startup.
        </p>
        <Link
          href="/startup/readiness"
          className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium transition-colors"
          style={{ color: 'var(--fi-primary)' }}
        >
          Run Assessment
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    );
  }

  // Loading state
  if (loading && !analysis) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={cn('fi-card p-6 relative overflow-hidden', className)}
      >
        {/* Accent top border */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
          style={{ background: 'linear-gradient(90deg, var(--fi-primary), var(--fi-chart-3, #F59E0B))' }}
        />
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fi-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>Generating AI insights...</span>
          </div>
          {/* Shimmer skeleton */}
          <div className="space-y-2">
            <div className="h-3 rounded w-full" style={{ background: 'var(--fi-bg-secondary)' }} />
            <div className="h-3 rounded w-4/5" style={{ background: 'var(--fi-bg-secondary)' }} />
            <div className="h-3 rounded w-3/5" style={{ background: 'var(--fi-bg-secondary)' }} />
          </div>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (analysis?.status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={cn('fi-card p-6', className)}
      >
        <div className="flex items-center gap-3" style={{ color: 'var(--fi-text-muted)' }}>
          <AlertCircle className="w-5 h-5" style={{ color: 'var(--fi-score-good)' }} />
          <span className="text-sm">AI insights temporarily unavailable.</span>
        </div>
      </motion.div>
    );
  }

  // No data from API
  if (!analysis?.insights && !analysis?.strengths?.length && !analysis?.risks?.length) {
    return null;
  }

  const progressPct = Math.max(0, Math.min(100, currentScore));
  const projectedPct = Math.max(0, Math.min(100, projectedScore));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className={cn('fi-card relative overflow-hidden', className)}
    >
      {/* Accent top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
        style={{ background: 'linear-gradient(90deg, var(--fi-primary), var(--fi-chart-3, #F59E0B))' }}
      />

      {/* Header — always visible, clickable to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-5 text-left transition-colors"
      >
        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
          <Image src="/ai-logo.png" alt="Frictionless Intelligence" width={32} height={32} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fi-primary)' }}>
            AI Insights
          </h3>
          <p className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
            {analysis?.status === 'cached' && analysis.cached_at
              ? `Updated ${new Date(analysis.cached_at).toLocaleDateString()}`
              : 'Based on your current profile'}
          </p>
        </div>
        <ChevronDown
          className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')}
          style={{ color: 'var(--fi-text-muted)' }}
        />
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
            <div className="px-5 pb-5 pt-0 space-y-4">
              {/* AI Summary */}
              {analysis?.insights && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>
                  {analysis.insights}
                </p>
              )}

              {/* Strengths + Risks columns */}
              {(analysis?.strengths?.length || analysis?.risks?.length) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {analysis?.strengths?.length ? (
                    <div>
                      <h4
                        className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                        style={{ color: 'var(--fi-score-excellent)' }}
                      >
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {analysis.strengths.slice(0, 3).map((s, i) => (
                          <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--fi-text-secondary)' }}>
                            <span className="mt-0.5" style={{ color: 'var(--fi-score-excellent)' }}>&#x2022;</span>
                            <span className="line-clamp-2">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {analysis?.risks?.length ? (
                    <div>
                      <h4
                        className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                        style={{ color: 'var(--fi-score-good)' }}
                      >
                        Areas to Improve
                      </h4>
                      <ul className="space-y-1">
                        {analysis.risks.slice(0, 3).map((r, i) => (
                          <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--fi-text-secondary)' }}>
                            <span className="mt-0.5" style={{ color: 'var(--fi-score-good)' }}>&#x2022;</span>
                            <span className="line-clamp-2">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Score Prediction Bar */}
              {projectedScore > currentScore && (
                <div className="pt-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Score Projection</span>
                    <span className="text-xs font-mono">
                      <span className="font-medium" style={{ color: 'var(--fi-text-primary)' }}>{Math.round(currentScore)}</span>
                      <span className="mx-1" style={{ color: 'var(--fi-text-muted)' }}>&rarr;</span>
                      <span className="font-medium" style={{ color: 'var(--fi-primary)' }}>{projectedScore}</span>
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--fi-bg-tertiary)' }}
                  >
                    <div className="h-full rounded-full relative" style={{ width: `${projectedPct}%` }}>
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${(progressPct / projectedPct) * 100}%`, background: 'var(--fi-primary)' }}
                      />
                      <div
                        className="absolute inset-y-0 right-0 rounded-full"
                        style={{ width: `${((projectedPct - progressPct) / projectedPct) * 100}%`, background: 'var(--fi-primary)', opacity: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
