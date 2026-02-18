'use client';

import { useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Handshake,
  Loader2,
  Brain,
  Search,
  RefreshCw,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useInvestorStore } from '@/stores/investor-store';
import { InvestorMatchCard } from '@/components/investors/InvestorMatchCard';

// ---------------------------------------------------------------------------
// Skeleton card for loading state
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-0 overflow-hidden animate-pulse">
      <div className="h-[3px] w-full bg-muted/30" />
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-muted/40" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 bg-muted/40 rounded" />
            <div className="h-3 w-28 bg-muted/30 rounded" />
          </div>
          <div className="w-[68px] h-[68px] rounded-full bg-muted/30" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-18 bg-muted/30 rounded-full" />
          <div className="h-6 w-16 bg-muted/30 rounded-full" />
          <div className="h-6 w-22 bg-muted/30 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="h-2.5 w-full bg-muted/20 rounded" />
            <div className="h-1.5 w-full bg-muted/15 rounded-full" />
          </div>
          <div className="space-y-1">
            <div className="h-2.5 w-full bg-muted/20 rounded" />
            <div className="h-1.5 w-full bg-muted/15 rounded-full" />
          </div>
          <div className="space-y-1">
            <div className="h-2.5 w-full bg-muted/20 rounded" />
            <div className="h-1.5 w-full bg-muted/15 rounded-full" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 w-full bg-muted/15 rounded" />
          <div className="h-2.5 w-3/4 bg-muted/15 rounded" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary stat cards
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Elapsed timer for pipeline running state
// ---------------------------------------------------------------------------
function useElapsed(startedAt: number, active: boolean) {
  const ref = useRef(0);
  useEffect(() => {
    if (!active || !startedAt) return;
    const tick = () => {
      ref.current = Math.floor((Date.now() - startedAt) / 1000);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);
  return ref.current;
}

export default function InvestorsPage() {
  const { matches, status, loading, error, fetchMatches, retrigger, lastFetched, pipelineStartedAt } = useInvestorStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch on mount
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Poll while generating/matching (every 8s)
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    if (status === 'generating' || status === 'matching') {
      pollRef.current = setInterval(() => {
        fetchMatches();
      }, 8_000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, fetchMatches]);

  // Sorted matches (top 10, already sorted by backend but ensure order)
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => b.fit_score_0_to_100 - a.fit_score_0_to_100);
  }, [matches]);

  // Compute summary stats
  const stats = useMemo(() => {
    if (matches.length === 0) return null;
    const eligible = matches.filter((m) => m.eligible).length;
    const avgScore = Math.round(matches.reduce((sum, m) => sum + m.fit_score_0_to_100, 0) / matches.length);
    return { total: matches.length, eligible, avgScore };
  }, [matches]);

  const isPipelineRunning = (status === 'generating' || status === 'matching') && matches.length === 0;
  const isInitialLoad = loading && status === 'idle' && matches.length === 0;
  const lastUpdated = lastFetched
    ? new Date(lastFetched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Elapsed time display
  const elapsed = isPipelineRunning && pipelineStartedAt
    ? Math.floor((Date.now() - pipelineStartedAt) / 1000)
    : 0;
  const elapsedStr = elapsed > 0 ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` : '';

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 max-w-[1600px] mx-auto pb-20">
      {/* Page Header */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="pt-8 sm:pt-10 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Handshake className="w-6 h-6 text-primary" />
            </div>
            Your Top 10 Investor Matches
          </h1>
          <p className="text-base text-muted-foreground mt-2 flex items-center gap-2">
            {status === 'ready'
              ? 'AI-matched investors based on your thesis profile'
              : 'AI-powered investor matching based on your startup profile'}
            {lastUpdated && (
              <span className="text-xs text-muted-foreground/50">
                Updated {lastUpdated}
              </span>
            )}
          </p>
        </div>

        {status === 'ready' && matches.length > 0 && (
          <button
            onClick={fetchMatches}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </motion.header>

      {/* Summary stats */}
      {stats && status === 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <StatCard icon={Users} label="Total Matches" value={stats.total} color="#3B82F6" />
          <StatCard icon={Target} label="Eligible" value={stats.eligible} color="#10B981" />
          <StatCard icon={TrendingUp} label="Avg Score" value={stats.avgScore} color="#F59E0B" />
        </motion.div>
      )}

      {/* Initial Loading (skeleton grid) */}
      {isInitialLoad && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Running */}
      {isPipelineRunning && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/50 bg-card p-12 flex flex-col items-center text-center"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              status === 'generating'
                ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                : 'bg-emerald-500/15 text-emerald-500'
            }`}>
              <Brain className="w-4 h-4" />
              <span>Thesis Profile</span>
              {status === 'generating' && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <div className="w-8 h-px bg-border" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              status === 'matching'
                ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Search className="w-4 h-4" />
              <span>Investor Matching</span>
              {status === 'matching' && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </div>

          <div className="relative mb-5">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
          <p className="text-xl font-display font-semibold text-foreground mb-2">
            {status === 'generating'
              ? 'Building your thesis profile...'
              : 'Finding investor matches...'}
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            {status === 'generating'
              ? 'Analyzing your startup data, readiness scores, and market positioning. This usually takes 30-60 seconds.'
              : 'Running deterministic matching against our investor database. This takes about 5-10 seconds.'}
          </p>
          {elapsedStr && (
            <p className="text-xs text-muted-foreground/50 mt-3 font-mono tabular-nums">
              Elapsed: {elapsedStr}
            </p>
          )}
        </motion.div>
      )}

      {/* Error */}
      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-500/20 bg-card p-8 flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-xl font-display font-semibold text-foreground mb-2">
            Investor Matching Failed
          </p>
          <p className="text-sm text-muted-foreground mb-6 max-w-lg">{error}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={retrigger}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Retry Matching
            </button>
          </div>
          <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/30 text-left max-w-lg w-full">
            <p className="text-xs font-medium text-muted-foreground mb-2">Troubleshooting:</p>
            <ul className="text-xs text-muted-foreground/80 space-y-1.5">
              <li>1. Make sure the backend is running: <code className="text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">cd Frictionless-Backend && uvicorn app.main:app --reload</code></li>
              <li>2. Check the backend terminal for error messages</li>
              <li>3. Ensure readiness scoring has completed first</li>
              <li>4. Verify your Supabase and API keys are configured in <code className="text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">.env</code></li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* Results (2-column grid for top 10) */}
      {matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sortedMatches.map((match, idx) => (
            <InvestorMatchCard key={match.investor_id} match={match} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
