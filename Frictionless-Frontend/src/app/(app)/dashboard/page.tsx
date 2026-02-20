'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowUpRight,
  ExternalLink,
  Zap,
  Users,
  CheckCircle2,
  MapPin,
  Briefcase,
  UserCircle2,
  Globe2,
  Shield,
  Eye,
  Swords,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useNarrativeData } from '@/components/dashboard/story/useNarrativeData';
import { IntelligenceSidebar } from '@/components/dashboard/IntelligenceSidebar';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { AskButton } from '@/components/ui/AskButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { TooltipInfo } from '@/components/ui/TooltipInfo';
import { SkeletonCard, SkeletonTable } from '@/components/ui/fi-skeleton';
import { getScoreColor, calculateReadinessScore } from '@/lib/scores';
import { isGeminiEnabled, geminiStream, geminiAnalyze } from '@/lib/ai/gemini-client';
import { getAuthHeaders } from '@/lib/api/tasks';
import type { NarrativeData } from '@/components/dashboard/story/useNarrativeData';

// ─── Animation variants ───
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
    },
  }),
};

function formatCurrency(n: number | null | undefined): string {
  if (!n) return '\u2014';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function formatStage(stage: string): string {
  const map: Record<string, string> = {
    pre_seed: 'Pre-Seed',
    seed: 'Seed',
    series_a: 'Series A',
    series_b: 'Series B',
    series_c: 'Series C',
    growth: 'Growth',
    ipo: 'IPO',
  };
  return map[stage.toLowerCase()] ?? stage.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ─── AI Next Steps Insight ───
function NextStepsInsight({ data }: { data: NarrativeData }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const stage = data.companyStage ? formatStage(data.companyStage) : null;
    const topTasks = data.topImpactTasks.slice(0, 3).map((t) => t.title).join(', ');
    const roundTarget = data.roundTarget;

    const buildStatic = () => {
      if (topTasks)
        return `Your highest-leverage actions right now are ${topTasks} — completing these will have the strongest impact on your fundraising outcome.`;
      return `Focus on demonstrating clear traction, a tight use-of-funds narrative, and warm introductions to your top investor matches.`;
    };

    if (!isGeminiEnabled()) {
      setInsight(buildStatic());
      return;
    }

    setLoading(true);
    const prompt = `You are a sharp fundraising advisor. A ${stage ?? 'startup'} ${roundTarget ? `raising ${roundTarget}` : ''} needs to move faster on their round. Top pending tasks: ${topTasks || 'not specified'}. Write 2 short sentences of the most important advice to raise faster. Be concrete and direct. No bullet points, no headers, no percentages, no "Frictionless score" mention.`;

    (async () => {
      let text = '';
      try {
        for await (const chunk of geminiStream(prompt, { temperature: 0.3, maxTokens: 90 })) {
          text += chunk;
          setInsight(text);
        }
      } catch {
        setInsight(buildStatic());
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !insight) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3" style={{ background: 'var(--fi-bg-secondary)' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: 'var(--fi-primary)' }} />
        <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Generating insight…</span>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div
      className="px-3 py-2.5 rounded-xl mb-3"
      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--fi-primary)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>
          {insight}
        </p>
      </div>
    </div>
  );
}

// ─── AI Fundraising Insight ───
function FundingInsight({ data }: { data: NarrativeData }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const stage = data.companyStage ? formatStage(data.companyStage) : null;
    const matchCount = data.topMatches.length;
    const highFit = data.highMatchCount;
    const roundTarget = data.roundTarget;

    // Static fallback insight
    const buildStatic = () => {
      if (matchCount > 0 && highFit > 0)
        return `You have ${matchCount}+ investor matches for your ${stage ?? 'current'} round — focus your outreach on the ${highFit} high-fit investor${highFit > 1 ? 's' : ''} first.`;
      if (matchCount > 0)
        return `${matchCount}+ investors matched to your ${stage ?? ''} profile. Review their theses to tailor your pitch deck before reaching out.`;
      if (roundTarget)
        return `Targeting ${roundTarget} for your ${stage ?? ''} round. Complete your Frictionless assessment to surface the best-fit investors.`;
      return `Strengthen your pitch, financials, and traction narrative to attract the right investors for your ${stage ?? 'current'} stage.`;
    };

    if (!isGeminiEnabled()) {
      setInsight(buildStatic());
      return;
    }

    setLoading(true);
    const prompt = `You are an expert startup fundraising advisor. Give a single, specific 1-2 sentence fundraising tip for a ${stage ?? 'startup'} startup${roundTarget ? ` raising ${roundTarget}` : ''}${matchCount > 0 ? ` with ${matchCount} investor matches (${highFit} high-fit)` : ''}. Be direct and actionable. No fluff. Don't mention "Frictionless score".`;

    (async () => {
      let text = '';
      try {
        for await (const chunk of geminiStream(prompt, { temperature: 0.35, maxTokens: 80 })) {
          text += chunk;
          setInsight(text);
        }
      } catch {
        setInsight(buildStatic());
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !insight) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--fi-bg-secondary)' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: 'var(--fi-primary)' }} />
        <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Generating insight…</span>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <div
      className="px-3 py-2.5 rounded-xl"
      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--fi-primary)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>
          {insight}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════

export default function DashboardPage() {
  const data = useNarrativeData();

  // ─── Loading skeleton ───
  if (!data.user || (data.isStartup && !data.bootstrapLoaded)) {
    return (
      <div className="p-4 lg:p-6 xl:p-8 space-y-6 max-w-[1600px] mx-auto">
        <div className="space-y-2">
          <div className="fi-skeleton h-8 w-72 rounded-lg" />
          <div className="fi-skeleton h-4 w-48 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><SkeletonTable /></div>
          <div className="lg:col-span-2"><SkeletonCard /></div>
        </div>
      </div>
    );
  }

  return <NormalDashboard data={data} />;
}

// ═══════════════════════════════════════════
// NORMAL DASHBOARD
// ═══════════════════════════════════════════

function NormalDashboard({ data }: { data: NarrativeData }) {
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [intelligencePrompt, setIntelligencePrompt] = useState<string | null>(null);
  const [pitchModalOpen, setPitchModalOpen] = useState(false);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [pitchOptions, setPitchOptions] = useState<string[]>([]);
  const [savingPitch, setSavingPitch] = useState<number | null>(null);

  const openAskWithPrompt = (prompt: string) => {
    setIntelligencePrompt(prompt);
    setIntelligenceOpen(true);
  };

  const openPitchEditor = async () => {
    setPitchModalOpen(true);
    setPitchOptions([]);
    setGeneratingPitch(true);
    const context = [
      `Company: ${data.companyName}`,
      data.companySector && `Sector: ${data.companySector}`,
      `Stage: ${formatStage(data.companyStage)}`,
      data.companyBusinessModel && `Business model: ${data.companyBusinessModel}`,
      data.companyLocation && `Location: ${data.companyLocation}`,
      data.elevatorPitch && `Current pitch: "${data.elevatorPitch}"`,
    ].filter(Boolean).join('\n');
    const prompt = `You are a startup pitch coach. Write 3 elevator pitch options for an investor.\n\nCompany context:\n${context}\n\nRules:\n- Each pitch MUST be exactly 1 sentence\n- Maximum 25 words per pitch\n- Focus on WHO they help, WHAT they do, and WHY it's unique\n- No buzzwords like "revolutionizing" or "disrupting"\n- Output ONLY a numbered list, nothing else:\n1. [pitch]\n2. [pitch]\n3. [pitch]`;
    try {
      const raw = await geminiAnalyze(prompt, { temperature: 0.4, maxTokens: 300 });
      const lines = raw.split('\n').filter(l => /^\d+\./.test(l.trim()));
      const opts = lines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
      setPitchOptions(opts.length >= 2 ? opts : [raw.trim()]);
    } catch {
      setPitchOptions([]);
    } finally {
      setGeneratingPitch(false);
    }
  };

  const applyPitch = async (pitch: string, idx: number) => {
    setSavingPitch(idx);
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction_patch: { startup_kv: { initial_details: { elevator_pitch: pitch } } }, regenerate_readiness: false }),
      });
      setPitchModalOpen(false);
      // Refresh page data
      window.location.reload();
    } catch {
      setSavingPitch(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative p-4 lg:p-5 xl:p-6 space-y-5 w-full max-w-[1600px] mx-auto"
    >
      {/* ════════ WELCOME HEADER ════════ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <h1 className="text-2xl lg:text-3xl font-display font-bold" style={{ color: 'var(--fi-text-primary)' }}>
          Welcome back, {data.user?.org_name ?? 'Team'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fi-text-tertiary)' }}>
          Here&apos;s your funding journey at a glance
        </p>
      </motion.div>

      {/* ════════ ROW 1: Three Cards ════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* ── Card 1: Frictionless Score ── */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="fi-card flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
                Frictionless Score
              </h3>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
              >
                !
              </span>
            </div>
            <Link
              href="/startup/readiness"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shrink-0"
              style={{
                border: '1.5px solid var(--fi-primary)',
                color: 'var(--fi-primary)',
              }}
            >
              View Breakdown
            </Link>
          </div>
          <p className="text-xs mb-2 leading-snug" style={{ color: 'var(--fi-text-muted)' }}>
            Improving your Frictionless increases investor response rates and warm intro success.
          </p>

          {/* Gauge + sub-labels */}
          <div className="flex flex-col items-center pt-2 pb-1">
            <ScoreGauge
              score={data.readinessScore}
              size="xl"
              showPercent
              variant="semicircle"
            />
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--fi-text-muted)' }}>
              Top investors prefer &ge;70%
            </p>
            {data.readinessScore < 70 && (
              <p className="text-xs font-semibold mt-1" style={{ color: getScoreColor(data.readinessScore) }}>
                ↗ {(70 - data.readinessScore).toFixed(1)}% to green zone
              </p>
            )}
            {data.readinessScore >= 70 && (
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--fi-score-excellent)' }}>
                ✓ Above investor threshold
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="mt-4 mb-3" style={{ borderTop: '1px solid var(--fi-border)' }} />

          {/* Biggest Gaps */}
          {data.lowestCategories.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--fi-text-primary)' }}>
                Biggest Gaps
              </p>
              <ul className="space-y-2">
                {data.lowestCategories.slice(0, 3).map((cat) => (
                  <li
                    key={cat.name}
                    className="flex items-center gap-2.5 text-sm"
                    style={{ color: 'var(--fi-text-secondary)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: 'var(--fi-text-muted)' }}
                    />
                    {cat.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* ── Card 2: Company Profile (enriched) ── */}
        <motion.div
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="fi-card flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-secondary)' }}>
              Company Profile
            </h3>
          </div>

          <div className="flex items-center gap-3 mb-3">
            {data.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.companyLogo}
                alt={data.companyName}
                width={40}
                height={40}
                className="rounded-lg object-cover shrink-0 w-10 h-10"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold shrink-0"
                style={{ background: 'var(--fi-primary)', color: 'white' }}
              >
                {data.companyName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h4 className="text-lg font-bold truncate" style={{ color: 'var(--fi-text-primary)' }}>
                {data.companyName}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="fi-badge fi-badge-green text-[11px]">{formatStage(data.companyStage)}</span>
                {data.companyWebsite && (
                  <a
                    href={data.companyWebsite.startsWith('http') ? data.companyWebsite : `https://${data.companyWebsite}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs hover:underline"
                    style={{ color: 'var(--fi-text-link)' }}
                  >
                    {data.companyWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Key info rows — max 4 */}
          <div className="space-y-1.5">
            {data.companySector && (
              <InfoRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Sector" value={data.companySubsector ? `${data.companySector} / ${data.companySubsector}` : data.companySector} />
            )}
            {data.companyLocation && (
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="HQ" value={data.companyLocation} />
            )}
            {data.teamMembers.length > 0 && (
              <InfoRow icon={<Users className="w-3.5 h-3.5" />} label="Team" value={`${data.teamMembers.length} ${data.teamMembers.length === 1 ? 'person' : 'people'}`} />
            )}
            {data.founders.length > 0 && (
              <InfoRow
                icon={<UserCircle2 className="w-3.5 h-3.5" />}
                label="Founders"
                value={data.founders.map((f) => f.full_name).join(', ')}
              />
            )}
          </div>

          {/* Elevator pitch — inline, no box */}
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fi-text-muted)' }}>
                Elevator Pitch
              </p>
              <button
                onClick={openPitchEditor}
                className="flex items-center gap-1 text-[11px] font-medium hover:underline"
                style={{ color: 'var(--fi-primary)' }}
              >
                <Sparkles className="w-3 h-3" />
                {data.elevatorPitch ? 'Edit with AI' : 'Write with AI'}
              </button>
            </div>
            {data.elevatorPitch ? (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--fi-text-secondary)', fontStyle: 'italic' }}>
                &ldquo;{data.elevatorPitch}&rdquo;
              </p>
            ) : (
              <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
                No elevator pitch yet — use AI to craft one.
              </p>
            )}
          </div>

          {/* Financials */}
          {(data.metrics.mrr != null || data.metrics.arr != null || data.metrics.runway_months != null) && (
            <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '1px solid var(--fi-border)' }}>
              {data.metrics.arr != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>ARR</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{formatCurrency(data.metrics.arr)}</span>
                </div>
              )}
              {data.metrics.mrr != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>MRR</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{formatCurrency(data.metrics.mrr)}</span>
                </div>
              )}
              {data.metrics.runway_months != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Runway</span>
                  <span className="text-xs font-semibold" style={{ color: data.metrics.runway_months < 6 ? 'var(--fi-score-need-improvement)' : 'var(--fi-text-primary)' }}>
                    {data.metrics.runway_months} months
                  </span>
                </div>
              )}
            </div>
          )}

          <Link
            href="/startup/company-profile"
            className="fi-btn fi-btn-outline w-full justify-center mt-auto"
          >
            View Full Profile <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>

        {/* ── Card 3: Funding Progress ── */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="fi-card flex flex-col md:col-span-2 lg:col-span-1"
        >
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
              Funding Progress
            </h3>
            <TooltipInfo text="Track your fundraising round progress and key metrics." />
          </div>
          <p className="text-xs mb-2 leading-snug" style={{ color: 'var(--fi-text-muted)' }}>
            Track how far along your round is and key funding metrics.
          </p>

          {/* Funding Raised semicircle — large, prominent */}
          <div className="flex flex-col items-center pt-2 pb-1">
            <ScoreGauge
              score={0}
              size="xl"
              showPercent
              variant="semicircle"
              showLabel={false}
              color="var(--fi-primary)"
            />
            <p className="text-xs font-medium -mt-1" style={{ color: 'var(--fi-text-muted)' }}>
              Funding Raised
            </p>
          </div>

          {/* Funding stats */}
          <div className="space-y-2 pt-3 mb-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
            {data.roundTarget && (
              <StatRow label="Round Target" value={data.roundTarget} highlight={false} accent />
            )}
            {data.companyStage && (
              <StatRow label="Stage" value={formatStage(data.companyStage)} />
            )}
            {data.metrics.mrr != null && (
              <StatRow label="MRR" value={formatCurrency(data.metrics.mrr)} />
            )}
            {data.metrics.runway_months != null && (
              <StatRow
                label="Runway"
                value={`${data.metrics.runway_months} months`}
                highlight={data.metrics.runway_months < 6}
              />
            )}
          </div>

          <Link
            href="/startup/investors"
            className="fi-btn fi-btn-outline w-full justify-center mt-auto"
          >
            View Matches <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>

      {/* ════════ ROW 2: Investor Matches + Next Steps ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── Card 4: Top Investor Matches ── */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="fi-card lg:col-span-3"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
                Top investor matches
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fi-text-tertiary)' }}>
                Matched to your stage, sector &amp; ticket size
              </p>
            </div>
            <div className="flex items-center gap-2">
              {data.highMatchCount > 0 && (
                <span className="fi-badge fi-badge-green">{data.highMatchCount} high match</span>
              )}
              <Link
                href="/startup/investors"
                className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0"
                style={{ border: '1.5px solid var(--fi-primary)', color: 'var(--fi-primary)' }}
              >
                View Investors
              </Link>
            </div>
          </div>

          {data.investorLoading ? (
            <SkeletonTable rows={5} />
          ) : data.topMatches.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="No investor matches yet"
              description="Complete your Frictionless assessment to start matching with relevant investors."
              action={
                <Link href="/startup/readiness" className="fi-btn fi-btn-primary">
                  Run Assessment
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--fi-border)' }}>
                    <th className="text-left px-6 py-2 text-xs font-semibold" style={{ color: 'var(--fi-text-muted)' }}>#</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--fi-text-muted)' }}>Investor</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--fi-text-muted)' }}>Potential Ticket</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--fi-text-muted)' }}>Match Score</th>
                    <th className="text-right px-6 py-2 text-xs font-semibold" style={{ color: 'var(--fi-text-muted)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.topMatches.slice(0, 5).map((match, idx) => {
                    const fscore = calculateReadinessScore(data.readinessScore, match.fit_score_0_to_100);
                    const ip = match.investor_profile;
                    return (
                      <tr
                        key={match.investor_id}
                        className="transition-colors duration-150"
                        style={{ borderBottom: idx < Math.min(data.topMatches.length, 5) - 1 ? '1px solid var(--fi-border)' : undefined }}
                      >
                        <td className="px-6 py-3 text-sm font-medium" style={{ color: 'var(--fi-text-muted)' }}>{idx + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            {ip.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={ip.logo_url} alt="" width={28} height={28} className="rounded-md object-cover w-7 h-7" />
                            ) : (
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
                                style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-secondary)' }}
                              >
                                {(ip.name ?? '?').charAt(0)}
                              </div>
                            )}
                            <span className="text-sm font-medium" style={{ color: 'var(--fi-text-primary)' }}>
                              {ip.name ?? 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm" style={{ color: 'var(--fi-text-secondary)' }}>
                          {formatCurrency(ip.check_min_usd)} - {formatCurrency(ip.check_max_usd)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${fscore}%`, background: getScoreColor(fscore) }}
                              />
                            </div>
                            <span className="text-xs font-semibold tabular-nums" style={{ color: getScoreColor(fscore) }}>
                              {fscore}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            href={`/startup/investors/${match.investor_id}`}
                            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                            style={{ color: 'var(--fi-primary)', background: 'var(--fi-primary-50)' }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* ── Card 5: Next Steps ── */}
        <motion.div
          custom={4}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="fi-card lg:col-span-2"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
                Next steps to raise faster
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fi-text-tertiary)' }}>
                Prioritized for your round
              </p>
            </div>
            <Link
              href="/startup/readiness"
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0 mt-0.5"
              style={{ border: '1.5px solid var(--fi-primary)', color: 'var(--fi-primary)' }}
            >
              View Tasks
            </Link>
          </div>

          {data.topImpactTasks.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="All caught up"
              description="Complete a Frictionless assessment to get personalized action items."
            />
          ) : (
            <div className="space-y-1">
              {data.topImpactTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg transition-colors"
                  style={{ borderBottom: '1px solid var(--fi-border)' }}
                >
                  <div
                    className="w-1 h-8 rounded-full shrink-0"
                    style={{ background: 'var(--fi-primary)', opacity: 0.4 }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--fi-text-primary)' }}
                    >
                      {task.title}
                    </p>
                  </div>
                  <AskButton onClick={() => openAskWithPrompt(`Help me complete this task: "${task.title}". ${task.description ? 'Details: ' + task.description : ''} This task has a potential impact of +${task.potential_points ?? 0} points on my Frictionless score. Give me a step-by-step guide with examples on how to complete this effectively for investor Frictionless.`)} size="sm" variant="outline" />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ════════ ROW 3: Frictionless Intelligence ════════ */}
      <motion.div
        custom={5}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-3">
          <Globe2 className="w-5 h-5" style={{ color: 'var(--fi-primary)' }} />
          <h2 className="text-lg font-display font-bold" style={{ color: 'var(--fi-text-primary)' }}>
            Frictionless Intelligence
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── Investor View ── */}
          <div className="fi-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <Eye className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
                  Investor View
                </h3>
                <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>
                  What investors look for in your startup
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* What investors evaluate */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--fi-bg-secondary)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--fi-text-secondary)' }}>
                  Key evaluation criteria for {data.companyStage || 'your stage'}
                </p>
                <div className="space-y-2.5">
                  {getInvestorCriteria(data).map(({ label, status, detail }) => (
                    <div key={label} className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ background: status === 'strong' ? 'var(--fi-score-excellent)' : status === 'moderate' ? 'var(--fi-score-good)' : 'var(--fi-score-need-improvement)' }}
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{label}</span>
                        <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--fi-text-muted)' }}>{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to get investor attention */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--fi-bg-secondary)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--fi-text-secondary)' }}>
                  How to get investor attention
                </p>
                <div className="space-y-2">
                  {getAttentionActions(data).map((action, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--fi-primary)' }} />
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>{action}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stats */}
              {data.topMatches.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat label="Matches" value={String(data.topMatches.length)} />
                  <MiniStat label="High Fit" value={String(data.highMatchCount)} accent />
                  <MiniStat label="Avg Ticket" value={
                    formatCurrency(
                      data.topMatches.reduce((s, m) => s + (m.investor_profile.check_typical_usd ?? 0), 0) / data.topMatches.length || 0
                    )
                  } />
                </div>
              )}

              <Link
                href="/startup/investors"
                className="fi-btn fi-btn-outline w-full justify-center mt-2"
              >
                Explore All Investors <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ── Competitive Positioning ── */}
          <div className="fi-card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Swords className="w-4 h-4" style={{ color: 'hsl(263 70% 58%)' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
                  Competitive Positioning
                </h3>
                <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>
                  Your market landscape in {data.companySector || 'your sector'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Market overview */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--fi-bg-secondary)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--fi-text-secondary)' }}>
                  Market Dynamics
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>
                  {data.companySector
                    ? `The ${data.companySector} market is experiencing strong growth with increasing investor interest. ${data.companyStage} startups in this space are competing on product differentiation, go-to-market speed, and capital efficiency.`
                    : 'Complete your profile to unlock competitive intelligence for your sector.'
                  }
                </p>
              </div>

              {/* Competitive factors */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--fi-bg-secondary)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--fi-text-secondary)' }}>
                  Key Competitive Factors
                </p>
                <div className="space-y-2.5">
                  {getCompetitiveFactors(data).map(({ factor, yourPosition, tip }) => (
                    <div key={factor} className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ background: yourPosition === 'leading' ? 'var(--fi-score-excellent)' : yourPosition === 'competitive' ? 'var(--fi-score-good)' : 'var(--fi-score-need-improvement)' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{factor}</span>
                          <span
                            className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: yourPosition === 'leading' ? 'rgba(16,185,129,0.1)' : yourPosition === 'competitive' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                              color: yourPosition === 'leading' ? 'var(--fi-score-excellent)' : yourPosition === 'competitive' ? 'var(--fi-score-good)' : 'var(--fi-score-need-improvement)',
                            }}
                          >
                            {yourPosition}
                          </span>
                        </div>
                        <p className="text-xs leading-snug mt-0.5" style={{ color: 'var(--fi-text-muted)' }}>{tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Your differentiators */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--fi-bg-secondary)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--fi-text-secondary)' }}>
                  What Sets You Apart
                </p>
                <div className="space-y-2">
                  {getDifferentiators(data).map((diff, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--fi-primary)' }} />
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>{diff}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIntelligenceOpen(true)}
                className="fi-btn fi-btn-primary w-full justify-center mt-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Deep Dive Analysis
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Intelligence Sidebar */}
      <IntelligenceSidebar
        open={intelligenceOpen}
        onClose={() => { setIntelligenceOpen(false); setIntelligencePrompt(null); }}
        data={data}
        initialPrompt={intelligencePrompt}
        onPromptConsumed={() => setIntelligencePrompt(null)}
      />

      {/* ── Elevator Pitch AI Editor Modal ── */}
      {pitchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPitchModalOpen(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fi-card w-full max-w-lg"
            style={{ background: 'var(--fi-bg-card)', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                <h3 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
                  AI Elevator Pitch Options
                </h3>
              </div>
              <button
                onClick={() => setPitchModalOpen(false)}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ color: 'var(--fi-text-muted)', background: 'var(--fi-bg-secondary)' }}
              >
                ✕
              </button>
            </div>

            {generatingPitch ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-xl space-y-2" style={{ background: 'var(--fi-bg-secondary)' }}>
                    <div className="fi-skeleton h-3 w-full rounded" />
                    <div className="fi-skeleton h-3 w-3/4 rounded" />
                  </div>
                ))}
                <p className="text-xs text-center" style={{ color: 'var(--fi-text-muted)' }}>
                  <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />Generating options…
                </p>
              </div>
            ) : pitchOptions.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--fi-text-muted)' }}>
                Could not generate options. Please try again.
              </p>
            ) : (
              <div className="space-y-3">
                {pitchOptions.map((opt, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl"
                    style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
                  >
                    <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--fi-text-primary)' }}>
                      &ldquo;{opt}&rdquo;
                    </p>
                    <button
                      onClick={() => applyPitch(opt, i)}
                      disabled={savingPitch !== null}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: savingPitch === i ? 'var(--fi-bg-tertiary)' : 'var(--fi-primary)',
                        color: 'white',
                        opacity: savingPitch !== null && savingPitch !== i ? 0.5 : 1,
                      }}
                    >
                      {savingPitch === i ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                      ) : (
                        <><CheckCircle2 className="w-3 h-3" /> Use this pitch</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--fi-text-muted)' }}>{icon}</span>
      <span className="text-xs shrink-0" style={{ color: 'var(--fi-text-muted)' }}>{label}:</span>
      <span className="text-xs font-medium truncate" style={{ color: 'var(--fi-text-primary)' }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-2.5 rounded-lg text-center" style={{ background: 'var(--fi-bg-secondary)' }}>
      <div
        className="text-xl font-bold"
        style={{ color: accent ? 'var(--fi-primary)' : 'var(--fi-text-primary)' }}
      >
        {value}
      </div>
      <div className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>{label}</div>
    </div>
  );
}

function StatRow({ label, value, highlight = false, accent = false }: { label: string; value: string; highlight?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>{label}</span>
      <span
        className="text-sm font-medium"
        style={{ color: highlight ? 'var(--fi-score-need-improvement)' : accent ? 'var(--fi-primary)' : 'var(--fi-text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Utility functions for Intelligence section ───

function getInvestorCriteria(data: NarrativeData) {
  const criteria: { label: string; status: 'strong' | 'moderate' | 'weak'; detail: string }[] = [];
  const score = data.readinessScore;

  // Team & Founders
  criteria.push({
    label: 'Team & Founders',
    status: data.founders.length > 0 ? 'strong' : 'weak',
    detail: data.founders.length > 0
      ? `${data.founders.length} founder${data.founders.length > 1 ? 's' : ''} identified — investors want to see a strong, complementary team`
      : 'Add your founding team info — investors evaluate founders first',
  });

  // Product-Market Fit
  const pmfCat = data.readinessCategories.find(c => c.name.toLowerCase().includes('product') || c.name.toLowerCase().includes('market'));
  criteria.push({
    label: 'Product-Market Fit',
    status: pmfCat ? (pmfCat.score >= 75 ? 'strong' : pmfCat.score >= 50 ? 'moderate' : 'weak') : 'moderate',
    detail: pmfCat
      ? `Score: ${pmfCat.score}% — ${pmfCat.score >= 75 ? 'demonstrate traction metrics and retention' : 'strengthen evidence of customer demand and engagement'}`
      : 'Show clear evidence of demand, early revenue, or strong user growth',
  });

  // Financials & Metrics
  criteria.push({
    label: 'Financial Frictionless',
    status: data.metrics.arr ? 'strong' : data.metrics.runway_months ? 'moderate' : 'weak',
    detail: data.metrics.arr
      ? `ARR: ${formatCurrency(data.metrics.arr)} — show clear path to unit economics`
      : 'Prepare detailed financial projections and key metrics for investors',
  });

  // Overall Frictionless
  criteria.push({
    label: 'Investment Frictionless',
    status: score >= 75 ? 'strong' : score >= 50 ? 'moderate' : 'weak',
    detail: score >= 75
      ? `Score: ${Math.round(score)}% — you\'re well-prepared, focus on differentiation in pitch`
      : `Score: ${Math.round(score)}% — improve Frictionless to stand out to top-tier investors`,
  });

  return criteria;
}

function getAttentionActions(data: NarrativeData): string[] {
  const actions: string[] = [];
  const stage = data.companyStage?.toLowerCase() || '';
  const sector = data.companySector || 'your sector';

  if (data.readinessScore < 70) {
    actions.push(`Improve Frictionless Score from ${Math.round(data.readinessScore)}% to 70%+ — top investors prefer green zone`);
  }
  if (data.lowestCategories.length > 0) {
    actions.push(`Address ${data.lowestCategories[0].name} (${data.lowestCategories[0].score}%) — your biggest gap that investors will notice`);
  }
  if (stage.includes('seed') || stage.includes('pre')) {
    actions.push(`For ${data.companyStage}, emphasize unique insight, team pedigree, and early signals of traction`);
  } else {
    actions.push(`At ${data.companyStage || 'your'} stage, investors want strong unit economics and scalable growth metrics`);
  }
  actions.push(`Build warm intros to ${sector} investors — ${data.highMatchCount} high-fit matches are active in your space`);

  return actions.slice(0, 4);
}

function getCompetitiveFactors(data: NarrativeData) {
  const factors: { factor: string; yourPosition: 'leading' | 'competitive' | 'catching up'; tip: string }[] = [];
  const score = data.readinessScore;
  const cats = data.readinessCategories;

  // Product & Technology
  const techCat = cats.find(c => c.name.toLowerCase().includes('product') || c.name.toLowerCase().includes('tech'));
  factors.push({
    factor: 'Product & Technology',
    yourPosition: techCat ? (techCat.score >= 75 ? 'leading' : techCat.score >= 50 ? 'competitive' : 'catching up') : 'competitive',
    tip: techCat && techCat.score >= 75
      ? 'Your product scores well — keep innovating and building defensibility'
      : 'Invest in unique technology moats that competitors can\'t easily replicate',
  });

  // Market Position & Traction
  const marketCat = cats.find(c => c.name.toLowerCase().includes('market') || c.name.toLowerCase().includes('traction'));
  factors.push({
    factor: 'Market Traction',
    yourPosition: marketCat ? (marketCat.score >= 75 ? 'leading' : marketCat.score >= 50 ? 'competitive' : 'catching up') : 'competitive',
    tip: data.metrics.arr
      ? `${formatCurrency(data.metrics.arr)} ARR — demonstrate growth rate and retention to win over competitors`
      : 'Track and present core growth metrics to demonstrate market pull',
  });

  // Team & Execution
  factors.push({
    factor: 'Team & Execution',
    yourPosition: data.founders.length >= 2 && score >= 60 ? 'leading' : data.founders.length > 0 ? 'competitive' : 'catching up',
    tip: data.founders.length >= 2
      ? 'Strong founding team — highlight domain expertise and relevant track record'
      : 'Strengthen your team narrative — investors bet on people first',
  });

  // Fundraising Frictionless
  factors.push({
    factor: 'Fundraising Frictionless',
    yourPosition: score >= 80 ? 'leading' : score >= 60 ? 'competitive' : 'catching up',
    tip: score >= 80
      ? 'You\'re in the green zone — capitalize with targeted investor outreach'
      : `Reach 80%+ to stand out to top-tier ${data.companySector || 'sector'} investors`,
  });

  return factors;
}

function getDifferentiators(data: NarrativeData): string[] {
  const diffs: string[] = [];
  const sector = data.companySector || 'your market';
  const topCats = [...data.readinessCategories].sort((a, b) => b.score - a.score).slice(0, 2);

  if (topCats.length > 0) {
    diffs.push(`Strong ${topCats[0].name.toLowerCase()} (${topCats[0].score}%) positions you above typical ${sector} competitors`);
  }
  if (data.companyBusinessModel) {
    diffs.push(`Your ${data.companyBusinessModel} model — demonstrate how it creates sustainable competitive advantage`);
  }
  if (data.metrics.headcount) {
    diffs.push(`Team of ${data.metrics.headcount} — show investors you can execute faster than well-funded incumbents`);
  }
  if (diffs.length === 0) {
    diffs.push('Complete your profile and assessment to identify your key competitive differentiators');
  }

  return diffs.slice(0, 3);
}
