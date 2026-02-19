'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AIAnalysisResult = {
  insights?: string;
  strengths?: string[];
  risks?: string[];
  recommendations?: string[];
  cached_at?: string;
  status: 'cached' | 'generated' | 'loading' | 'error';
};

interface AIAnalysisCardProps {
  orgId: string | null;
  getToken: () => Promise<string | null>;
  readinessDataHash?: string;
  className?: string;
}

export function AIAnalysisCard({
  orgId,
  getToken,
  readinessDataHash,
  className,
}: AIAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const params = new URLSearchParams({ org_id: orgId });
        if (readinessDataHash) params.set('data_hash', readinessDataHash);
        const res = await fetch(`/api/readiness/analysis?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (data.analysis) {
          setAnalysis({
            ...data.analysis,
            status: data.status || 'generated',
            cached_at: data.cached_at,
          });
        } else if (data.error) {
          setAnalysis({ status: 'error' });
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
  }, [orgId, getToken, readinessDataHash]);

  if (loading && !analysis) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('fi-card p-6', className)}
      >
        <div className="flex items-center gap-3" style={{ color: 'var(--fi-text-muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Generating AI analysis...</span>
        </div>
      </motion.div>
    );
  }

  if (analysis?.status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('fi-card p-6', className)}
        style={{ borderColor: 'rgba(245,158,11,0.2)' }}
      >
        <div className="flex items-center gap-3" style={{ color: 'var(--fi-score-good)' }}>
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">AI analysis unavailable. Try again later.</span>
        </div>
      </motion.div>
    );
  }

  if (!analysis?.insights && !analysis?.strengths?.length && !analysis?.risks?.length && !analysis?.recommendations?.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn('fi-card p-6', className)}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="p-2 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.1)' }}
        >
          <Sparkles className="w-5 h-5" style={{ color: 'var(--fi-primary)' }} />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>AI Frictionless Analysis</h3>
          <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
            {analysis.status === 'cached' && analysis.cached_at
              ? `Cached ${new Date(analysis.cached_at).toLocaleDateString()}`
              : 'Generated for your current profile'}
          </p>
        </div>
      </div>
      {analysis.insights && (
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>{analysis.insights}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {analysis.strengths?.length ? (
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--fi-score-excellent)' }}
            >
              Strengths
            </h4>
            <ul className="space-y-1">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--fi-text-secondary)' }}>
                  <span style={{ color: 'var(--fi-score-excellent)' }}>&#x2022;</span>{s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {analysis.risks?.length ? (
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--fi-score-good)' }}
            >
              Risks
            </h4>
            <ul className="space-y-1">
              {analysis.risks.map((r, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--fi-text-secondary)' }}>
                  <span style={{ color: 'var(--fi-score-good)' }}>&#x2022;</span>{r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {analysis.recommendations?.length ? (
          <div>
            <h4
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--fi-primary)' }}
            >
              Recommendations
            </h4>
            <ul className="space-y-1">
              {analysis.recommendations.map((r, i) => (
                <li key={i} className="text-sm flex gap-2" style={{ color: 'var(--fi-text-secondary)' }}>
                  <span style={{ color: 'var(--fi-primary)' }}>&#x2022;</span>{r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
