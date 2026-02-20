'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  Bell,
  ChevronDown,
  PlusCircle,
  X,
  Globe,
} from 'lucide-react';
import { useInvestorStore } from '@/stores/investor-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { InvestorMatchCard } from '@/components/investors/InvestorMatchCard';
import { InvestorFilters, type InvestorFilterValues } from '@/components/investors/InvestorFilters';
import { StatCard } from '@/components/ui/StatCard';
import { calculateReadinessScore, getScoreColor, getScoreLabel } from '@/lib/scores';
import { isGeminiEnabled, geminiStream } from '@/lib/ai/gemini-client';
import type { InvestorMatchResult } from '@/types/database';

const TARGET_MATCHES = 10;

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="fi-card p-0 overflow-hidden animate-pulse">
      <div className="h-[3px] w-full" style={{ background: 'var(--fi-bg-tertiary)' }} />
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl" style={{ background: 'var(--fi-bg-tertiary)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 rounded" style={{ background: 'var(--fi-bg-tertiary)' }} />
            <div className="h-3 w-28 rounded" style={{ background: 'var(--fi-bg-secondary)' }} />
          </div>
          <div className="w-[68px] h-[68px] rounded-full" style={{ background: 'var(--fi-bg-secondary)' }} />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-18 rounded-full" style={{ background: 'var(--fi-bg-secondary)' }} />
          <div className="h-6 w-16 rounded-full" style={{ background: 'var(--fi-bg-secondary)' }} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-2.5 w-full rounded" style={{ background: 'var(--fi-bg-secondary)' }} />
              <div className="h-1.5 w-full rounded-full" style={{ background: 'var(--fi-bg-tertiary)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------
function exportMatchesCSV(matches: InvestorMatchResult[], readinessScore: number) {
  const rows = matches.map((m) => {
    const inv = m.investor_profile;
    const thesisFit = m.fit_score_0_to_100;
    const frictionless = calculateReadinessScore(readinessScore, thesisFit);
    const location = [inv?.city, inv?.state, inv?.country].filter(Boolean).join(', ');
    const sectors = Array.isArray(inv?.sectors) ? inv.sectors.join('; ') : '';
    return [
      inv?.name ?? '',
      inv?.investor_type ?? '',
      location,
      frictionless,
      thesisFit,
      m.eligible ? 'Yes' : 'No',
      `${inv?.check_min_usd ?? ''}-${inv?.check_max_usd ?? ''}`,
      sectors,
    ].join(',');
  });
  const csv = ['Name,Type,Location,Match Score,Thesis Fit,Eligible,Ticket Range,Focus Areas', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'investor-matches.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// AI Top-Pick Reasoning
// ---------------------------------------------------------------------------
const CATEGORY_LABELS: Record<string, string> = {
  deal_compatibility: 'Deal Fit',
  sector_business_model_fit: 'Sector Fit',
  traction_vs_thesis_bar: 'Traction',
  founder_team_fit: 'Team Fit',
  risk_regulatory_alignment: 'Risk Alignment',
  diligence_process_fit: 'Diligence Fit',
};

function buildTopPickPrompt(match: InvestorMatchResult): string {
  const inv = match.investor_profile;
  const name = inv?.name || 'This investor';
  const score = match.fit_score_0_to_100;
  const eligible = match.eligible;
  const stages = Array.isArray(inv?.stages) ? inv.stages.join(', ') : '';
  const sectors = Array.isArray(inv?.sectors) ? inv.sectors.slice(0, 4).join(', ') : '';
  const breakdown = match.category_breakdown || {};

  const cats = Object.entries(breakdown)
    .map(([key, data]) => {
      const label = CATEGORY_LABELS[key] || key.replace(/_/g, ' ');
      const pct = data.max_point > 0 ? Math.round((data.raw_points / data.max_point) * 100) : 0;
      return `${label}: ${pct}%`;
    })
    .join(', ');

  return `You are an expert startup fundraising advisor. Your top AI-matched investor is ${name}.

Match data:
- Thesis fit score: ${score}/100
- Eligible: ${eligible ? 'Yes' : 'No (some gate criteria not met)'}
- Focus stages: ${stages || 'Not specified'}
- Focus sectors: ${sectors || 'Not specified'}
- Category breakdown: ${cats}

In exactly 2-3 sentences, explain WHY this investor is the best match for this startup. Be specific about the strongest alignment areas. Do not start with "Based on" or "According to". Write in second person ("This investor...").`;
}

function AITopPickCard({ match, readinessScore }: { match: InvestorMatchResult; readinessScore: number }) {
  // Use DB-stored reasoning (generated server-side) if available, otherwise stream via Gemini
  const dbReasoning = (match.investor_profile as Record<string, unknown>)?.ai_reasoning as string | undefined;
  const [reasoning, setReasoning] = useState(dbReasoning || '');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const hasStarted = useRef(false);
  const inv = match.investor_profile;
  const score = calculateReadinessScore(readinessScore, match.fit_score_0_to_100);

  useEffect(() => {
    // If we already have reasoning from DB, use it — no need to call Gemini
    if (dbReasoning) {
      setReasoning(dbReasoning);
      return;
    }
    if (hasStarted.current || !isGeminiEnabled()) return;
    hasStarted.current = true;
    setLoading(true);

    (async () => {
      const prompt = buildTopPickPrompt(match);
      let text = '';
      try {
        for await (const chunk of geminiStream(prompt, { temperature: 0.3, maxTokens: 256 })) {
          text += chunk;
          setReasoning(text);
        }
      } catch {
        setReasoning('');
      } finally {
        setLoading(false);
      }
    })();
  }, [match, dbReasoning]);

  if (!reasoning && !loading && !isGeminiEnabled()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden mb-5"
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)',
        border: '1px solid rgba(16,185,129,0.2)',
      }}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.12)' }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--fi-primary)' }} />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--fi-primary)' }}>
              AI Top Pick
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--fi-text-muted)' }}>
              {inv?.name || 'Best Match'} · {score}/100
            </span>
          </div>
        </div>
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{
            color: 'var(--fi-text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              {loading && !reasoning ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--fi-text-muted)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-sm">Generating AI analysis...</span>
                </div>
              ) : reasoning ? (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>
                  {reasoning}
                  {loading && <span className="inline-block w-1 h-3.5 ml-0.5 rounded-sm animate-pulse" style={{ background: 'var(--fi-primary)', opacity: 0.6 }} />}
                </p>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// New investors toast notification
// ---------------------------------------------------------------------------
function NewMatchesNotification({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
      style={{
        background: 'var(--fi-bg-primary)',
        border: '1px solid rgba(16,185,129,0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(16,185,129,0.12)' }}
      >
        <Bell className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
          {count} new investor{count > 1 ? 's' : ''} found!
        </p>
        <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
          Scroll down to see the latest matches
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Add Investor Modal
// ---------------------------------------------------------------------------
function AddInvestorModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (match: InvestorMatchResult) => void;
}) {
  const { addCustomInvestor } = useInvestorStore();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setError('Both investor name and website URL are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await addCustomInvestor(name.trim(), url.trim());
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || 'Failed to add investor. Please try again.');
    } else if (result.match) {
      onSuccess(result.match);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl p-6 relative"
        style={{ background: 'var(--fi-bg-primary)', border: '1px solid var(--fi-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--fi-text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          >
            <PlusCircle className="w-5 h-5" style={{ color: 'var(--fi-primary)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
              Add Investor
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fi-text-muted)' }}>
              We'll analyze their thesis and score them against your profile
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fi-text-muted)' }}>
              Investor / Fund Name
            </label>
            <input
              type="text"
              placeholder="e.g. Sequoia Capital"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--fi-bg-secondary)',
                border: '1px solid var(--fi-border)',
                color: 'var(--fi-text-primary)',
              }}
              disabled={submitting}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--fi-text-muted)' }}>
              Website URL
            </label>
            <div className="relative">
              <Globe
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: 'var(--fi-text-muted)' }}
              />
              <input
                type="url"
                placeholder="https://sequoiacap.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'var(--fi-bg-secondary)',
                  border: '1px solid var(--fi-border)',
                  color: 'var(--fi-text-primary)',
                }}
                disabled={submitting}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'var(--fi-bg-secondary)',
                border: '1px solid var(--fi-border)',
                color: 'var(--fi-text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !url.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: 'var(--fi-primary)', color: '#fff' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Score Investor
                </>
              )}
            </button>
          </div>

          {submitting && (
            <p className="text-xs text-center" style={{ color: 'var(--fi-text-muted)' }}>
              Fetching investor data and calculating match score…
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function InvestorsPage() {
  const { matches, status, loading, error, fetchMatches, retrigger, lastFetched, pipelineStartedAt, newMatchCount, isFinalSet } = useInvestorStore();
  const readiness = useReadinessStore((s) => s.readiness);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const prevMatchCount = useRef(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addedMatchId, setAddedMatchId] = useState<string | null>(null);

  const [filters, setFilters] = useState<InvestorFilterValues>({
    scoreMin: 0,
    scoreMax: 100,
    eligibleOnly: false,
    search: '',
    sortBy: 'score_desc',
  });
  const [showCount, setShowCount] = useState(10);

  const readinessScore = readiness?.score_summary?._overall?.raw_percentage
    ? Math.round(readiness.score_summary._overall.raw_percentage as number)
    : readiness?.score_summary?._overall?.weighted_total
      ? Math.round(readiness.score_summary._overall.weighted_total as number)
      : 0;

  // Show notification when new matches arrive (not on first load)
  useEffect(() => {
    if (newMatchCount > 0 && prevMatchCount.current > 0) {
      setShowNotification(true);
    }
    prevMatchCount.current = matches.length;
  }, [matches.length, newMatchCount]);

  // Fetch on mount
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Poll while pipeline is running OR while we have fewer than TARGET_MATCHES
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const shouldPoll =
      status === 'generating' ||
      status === 'matching' ||
      (status === 'ready' && !isFinalSet && matches.length < TARGET_MATCHES);
    if (shouldPoll) {
      pollRef.current = setInterval(() => { fetchMatches(); }, 4_000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, fetchMatches, isFinalSet, matches.length]);

  const handleFilterChange = useCallback((partial: Partial<InvestorFilterValues>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
    setShowCount(10);
  }, []);

  // Filter & sort matches
  const filteredMatches = useMemo(() => {
    let result = [...matches];
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter((m) => (m.investor_profile?.name ?? '').toLowerCase().includes(q));
    }
    if (filters.eligibleOnly) {
      result = result.filter((m) => m.eligible);
    }
    result = result.filter((m) => {
      const fs = calculateReadinessScore(readinessScore, m.fit_score_0_to_100);
      return fs >= filters.scoreMin && fs <= filters.scoreMax;
    });
    result.sort((a, b) => {
      const fsA = calculateReadinessScore(readinessScore, a.fit_score_0_to_100);
      const fsB = calculateReadinessScore(readinessScore, b.fit_score_0_to_100);
      switch (filters.sortBy) {
        case 'score_desc': return fsB - fsA;
        case 'score_asc': return fsA - fsB;
        case 'name_asc': return (a.investor_profile?.name ?? '').localeCompare(b.investor_profile?.name ?? '');
        default: return fsB - fsA;
      }
    });
    return result;
  }, [matches, filters, readinessScore]);

  const stats = useMemo(() => {
    if (matches.length === 0) return null;
    const eligible = matches.filter((m) => m.eligible).length;
    const avgReadiness = Math.round(
      matches.reduce((sum, m) => sum + calculateReadinessScore(readinessScore, m.fit_score_0_to_100), 0) / matches.length
    );
    return { total: matches.length, eligible, avgReadiness };
  }, [matches, readinessScore]);

  const topMatch = filteredMatches[0] ?? null;

  // Full blocking spinner only when we have ZERO matches and pipeline is running
  const isPipelineBlocking = (status === 'generating' || status === 'matching') && matches.length === 0;
  // Partial loading banner when we have some matches but are still finding more
  const isFindingMore = !isFinalSet && matches.length > 0 && matches.length < TARGET_MATCHES &&
    (status === 'generating' || status === 'matching' || status === 'ready');
  const isInitialLoad = loading && status === 'idle' && matches.length === 0;

  const lastUpdated = lastFetched
    ? new Date(lastFetched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const elapsed = isPipelineBlocking && pipelineStartedAt
    ? Math.floor((Date.now() - pipelineStartedAt) / 1000)
    : 0;
  const elapsedStr = elapsed > 0 ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` : '';
  const visibleMatches = filteredMatches.slice(0, showCount);

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 max-w-[1600px] mx-auto pb-20">
      {/* ─── Add Investor Modal ─── */}
      <AnimatePresence>
        {showAddModal && (
          <AddInvestorModal
            onClose={() => setShowAddModal(false)}
            onSuccess={(match) => {
              setAddedMatchId(match.investor_id);
              setShowAddModal(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Toast notification ─── */}
      <AnimatePresence>
        {showNotification && (
          <NewMatchesNotification
            count={newMatchCount}
            onDismiss={() => setShowNotification(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Page Header ─── */}
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="pt-8 sm:pt-10 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <h1 className="fi-page-title flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.1)' }}
            >
              <Handshake className="w-6 h-6" style={{ color: 'var(--fi-primary)' }} />
            </div>
            Your Top Investor Matches
          </h1>
          <p className="text-sm mt-2 flex items-center gap-2" style={{ color: 'var(--fi-text-muted)' }}>
            AI-matched investors based on your thesis profile
            {lastUpdated && (
              <span className="text-xs" style={{ color: 'var(--fi-text-muted)', opacity: 0.6 }}>
                · Updated {lastUpdated}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {matches.length > 0 && (
            <>
              <button
                onClick={() => exportMatchesCSV(matches, readinessScore)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: 'var(--fi-bg-secondary)',
                  border: '1px solid var(--fi-border)',
                  color: 'var(--fi-text-secondary)',
                }}
              >
                Export CSV
              </button>
              <button
                onClick={fetchMatches}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: 'var(--fi-bg-secondary)',
                  border: '1px solid var(--fi-border)',
                  color: 'var(--fi-text-secondary)',
                }}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--fi-primary)', color: '#fff' }}
          >
            <PlusCircle className="w-4 h-4" />
            Add Investor
          </button>
        </div>
      </motion.header>

      {/* ─── Summary Stats ─── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label={isFinalSet ? 'Total Matches' : `Matches Found`}
            value={
              <span className="flex items-center gap-1.5">
                {stats.total}
                {!isFinalSet && (
                  <span className="text-xs font-normal opacity-60">/ {TARGET_MATCHES}</span>
                )}
              </span>
            }
          />
          <StatCard
            icon={<Target className="w-5 h-5" style={{ color: 'var(--fi-score-excellent)' }} />}
            label="Eligible"
            value={stats.eligible}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Match Score"
            value={
              <span style={{ color: getScoreColor(stats.avgReadiness) }}>
                {stats.avgReadiness}
              </span>
            }
          />
        </motion.div>
      )}

      {/* ─── Finding more investors banner ─── */}
      <AnimatePresence>
        {isFindingMore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 overflow-hidden"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.15)',
                color: 'var(--fi-text-muted)',
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--fi-primary)' }} />
              <span>
                Found <strong style={{ color: 'var(--fi-text-primary)' }}>{matches.length}</strong> investors so far — scanning for more to reach {TARGET_MATCHES}...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Filters ─── */}
      {matches.length > 0 && (
        <InvestorFilters
          filters={filters}
          onChange={handleFilterChange}
          totalCount={matches.length}
          filteredCount={filteredMatches.length}
        />
      )}

      {/* ─── Initial Loading (skeleton grid) ─── */}
      {isInitialLoad && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* ─── Full Pipeline Blocking State (zero matches, pipeline running) ─── */}
      {isPipelineBlocking && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fi-card p-12 flex flex-col items-center text-center mt-4"
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: status === 'generating' ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)',
                color: status === 'generating' ? 'var(--fi-primary)' : 'var(--fi-score-excellent)',
                border: status === 'generating' ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
              }}
            >
              <Brain className="w-4 h-4" />
              <span>Thesis Profile</span>
              {status === 'generating' && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <div className="w-8 h-px" style={{ background: 'var(--fi-border)' }} />
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: status === 'matching' ? 'rgba(16,185,129,0.1)' : 'var(--fi-bg-secondary)',
                color: status === 'matching' ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
                border: status === 'matching' ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
              }}
            >
              <Search className="w-4 h-4" />
              <span>Investor Matching</span>
              {status === 'matching' && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </div>

          <Loader2 className="w-12 h-12 animate-spin mb-5" style={{ color: 'var(--fi-primary)' }} />
          <p className="text-xl font-semibold mb-2" style={{ color: 'var(--fi-text-primary)' }}>
            {status === 'generating' ? 'Building your thesis profile...' : 'Scanning investors for matches...'}
          </p>
          <p className="text-sm max-w-md" style={{ color: 'var(--fi-text-muted)' }}>
            {status === 'generating'
              ? 'Analyzing your startup data, Frictionless scores, and market positioning. Usually takes 30–60 seconds.'
              : 'Running deterministic matching against our investor database. First results appear in seconds.'}
          </p>
          {elapsedStr && (
            <p className="text-xs mt-3 font-mono tabular-nums" style={{ color: 'var(--fi-text-muted)', opacity: 0.5 }}>
              Elapsed: {elapsedStr}
            </p>
          )}
        </motion.div>
      )}

      {/* ─── Error ─── */}
      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fi-card p-8 flex flex-col items-center text-center mt-4"
          style={{ borderColor: 'var(--fi-score-need-improvement)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            <AlertTriangle className="w-7 h-7" style={{ color: 'var(--fi-score-need-improvement)' }} />
          </div>
          <p className="text-xl font-semibold mb-2" style={{ color: 'var(--fi-text-primary)' }}>
            Investor Matching Failed
          </p>
          <p className="text-sm mb-6 max-w-lg" style={{ color: 'var(--fi-text-muted)' }}>{error}</p>
          <button
            onClick={retrigger}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--fi-primary)', color: '#fff' }}
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Retry Matching
          </button>
          <div
            className="mt-6 p-4 rounded-xl text-left max-w-lg w-full"
            style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--fi-text-muted)' }}>Troubleshooting:</p>
            <ul className="text-xs space-y-1.5" style={{ color: 'var(--fi-text-muted)', opacity: 0.8 }}>
              <li>1. Make sure the backend is running: <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-primary)' }}>cd Frictionless-Backend && uvicorn app.main:app --reload</code></li>
              <li>2. Check the backend terminal for error messages</li>
              <li>3. Ensure Frictionless scoring has completed first</li>
              <li>4. Verify your Supabase and API keys are configured in <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-primary)' }}>.env</code></li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* ─── Results ─── */}
      {matches.length > 0 && (
        <div className="mt-4 space-y-4">
          {/* AI Top Pick reasoning card — shows above list */}
          {topMatch && (
            <AITopPickCard match={topMatch} readinessScore={readinessScore} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visibleMatches.map((match, idx) => (
              <InvestorMatchCard
                key={match.investor_id}
                match={match}
                index={idx}
                readinessScore={readinessScore}
                isNew={match.investor_id === addedMatchId}
              />
            ))}

            {/* Skeleton placeholders while finding more */}
            {isFindingMore && visibleMatches.length < TARGET_MATCHES && Array.from({
              length: Math.min(2, TARGET_MATCHES - visibleMatches.length),
            }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
          </div>

          {/* Load more / count */}
          {filteredMatches.length > 0 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
                Showing {Math.min(showCount, filteredMatches.length)} of {filteredMatches.length} investors
                {!isFinalSet && ` (finding more...)`}
              </span>
              {showCount < filteredMatches.length && (
                <button
                  onClick={() => setShowCount((prev) => prev + 10)}
                  className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: 'var(--fi-bg-secondary)',
                    border: '1px solid var(--fi-border)',
                    color: 'var(--fi-text-secondary)',
                  }}
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
