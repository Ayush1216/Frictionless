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
  /** Input hash or readiness data to invalidate cache */
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
        className={cn('glass-card p-6', className)}
      >
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Generating AI analysis…</span>
        </div>
      </motion.div>
    );
  }

  if (analysis?.status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn('glass-card p-6 border-amber-500/30', className)}
      >
        <div className="flex items-center gap-3 text-amber-500">
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
      className={cn('glass-card p-6', className)}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/20">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-display font-semibold text-foreground">AI Readiness Analysis</h3>
          <p className="text-xs text-muted-foreground">
            {analysis.status === 'cached' && analysis.cached_at
              ? `Cached ${new Date(analysis.cached_at).toLocaleDateString()}`
              : 'Generated for your current profile'}
          </p>
        </div>
      </div>
      {analysis.insights && (
        <p className="text-sm text-foreground/90 mb-4 leading-relaxed">{analysis.insights}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {analysis.strengths?.length ? (
          <div>
            <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Strengths</h4>
            <ul className="space-y-1">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="text-sm text-foreground/80 flex gap-2">
                  <span className="text-accent">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {analysis.risks?.length ? (
          <div>
            <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Risks</h4>
            <ul className="space-y-1">
              {analysis.risks.map((r, i) => (
                <li key={i} className="text-sm text-foreground/80 flex gap-2">
                  <span className="text-amber-500">•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {analysis.recommendations?.length ? (
          <div>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Recommendations</h4>
            <ul className="space-y-1">
              {analysis.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-foreground/80 flex gap-2">
                  <span className="text-primary">•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
