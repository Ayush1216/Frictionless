'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { InvestorMatchResult } from '@/types/database';
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Target,
  TrendingUp,
  Briefcase,
  Calendar,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Zap,
  CheckCircle2,
  Handshake,
  Trophy,
  Clock,
  Layers,
  Shield,
  Share2,
  ChevronDown,
  BarChart3,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getScoreStyle, formatUsd, getInitials } from '@/lib/investor-utils';
import { calculateReadinessScore, getScoreColor, getScoreLabel } from '@/lib/scores';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { TabGroup } from '@/components/ui/TabGroup';
import { useInvestorStore } from '@/stores/investor-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { supabase } from '@/lib/supabase/client';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SECTOR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];
const FRICTIONLESS_LOGO = '/ai-logo.png';

type TabKey = 'overview' | 'thesis' | 'portfolio' | 'breakdown' | 'contact';

const TABS: { id: string; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'thesis', label: 'Thesis & Focus' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'breakdown', label: 'Fit Breakdown' },
  { id: 'contact', label: 'Contact' },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function DetailSkeleton() {
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-5 animate-pulse">
      <div className="h-4 w-28 rounded" style={{ background: 'var(--fi-bg-tertiary)' }} />
      <div className="fi-card overflow-hidden p-0">
        <div className="h-1 w-full" style={{ background: 'var(--fi-bg-secondary)' }} />
        <div className="p-5 lg:p-7">
          <div className="flex gap-5">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl" style={{ background: 'var(--fi-bg-tertiary)' }} />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 rounded" style={{ background: 'var(--fi-bg-tertiary)' }} />
              <div className="h-3 w-64 rounded" style={{ background: 'var(--fi-bg-secondary)' }} />
              <div className="h-3 w-80 rounded" style={{ background: 'var(--fi-bg-secondary)' }} />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full" style={{ background: 'var(--fi-bg-secondary)' }} />
                <div className="h-5 w-20 rounded-full" style={{ background: 'var(--fi-bg-secondary)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="fi-card p-4 space-y-2">
            <div className="h-3 w-16 rounded" style={{ background: 'var(--fi-bg-secondary)' }} />
            <div className="h-5 w-20 rounded" style={{ background: 'var(--fi-bg-tertiary)' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ChartTooltipContent({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload || !(payload as Array<Record<string, unknown>>).length) return null;
  const items = payload as Array<{ value: number; name: string; color: string }>;
  return (
    <div className="fi-card px-3 py-2 text-xs" style={{ background: 'var(--fi-bg-card)', border: '1px solid var(--fi-border)' }}>
      <p className="mb-1" style={{ color: 'var(--fi-text-muted)' }}>{label as string}</p>
      {items.map((item, i) => (
        <p key={i} className="font-mono font-semibold" style={{ color: item.color }}>
          {item.name}: {typeof item.value === 'number' && item.value > 1000 ? formatUsd(item.value) : item.value}
        </p>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, color, index = 0 }: {
  icon: React.ElementType; label: string; value: string; subtext?: string; color: string; index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.08 + index * 0.04 }}
      className="fi-card p-4"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-[11px]" style={{ color: 'var(--fi-text-muted)' }}>{label}</span>
      </div>
      <p className="text-lg font-mono font-bold" style={{ color: 'var(--fi-text-primary)' }}>{value}</p>
      {subtext && <p className="text-[10px] mt-0.5" style={{ color: 'var(--fi-text-muted)' }}>{subtext}</p>}
    </motion.div>
  );
}

function AccordionSection({ title, icon: Icon, color, defaultOpen = false, children }: {
  title: string; icon: React.ElementType; color: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="fi-card overflow-hidden p-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <h3 className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{title}</h3>
        </div>
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} style={{ color: 'var(--fi-text-muted)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0" style={{ borderTop: '1px solid var(--fi-border)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InsightCard({ icon: Icon, title, content, color, index = 0 }: {
  icon: React.ElementType; title: string; content: string | string[]; color: string; index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 + index * 0.04 }}
      className="fi-card p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <h4 className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{title}</h4>
      </div>
      {Array.isArray(content) ? (
        <ul className="space-y-1">
          {content.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>
              <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>{content}</p>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function InvestorProfilePage() {
  const { investorId } = useParams<{ investorId: string }>();
  const router = useRouter();
  const getMatchById = useInvestorStore((s) => s.getMatchById);
  const readiness = useReadinessStore((s) => s.readiness);

  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [matchData, setMatchData] = useState<Record<string, any> | null>(null);
  const [aiInsights, setAiInsights] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [copied, setCopied] = useState(false);

  // Readiness score for Frictionless Score
  const readinessScore = readiness?.score_summary?._overall?.raw_percentage
    ? Math.round(readiness.score_summary._overall.raw_percentage as number)
    : readiness?.score_summary?._overall?.weighted_total
      ? Math.round(readiness.score_summary._overall.weighted_total as number)
      : 0;

  // Stale-while-revalidate
  const cachedMatch = investorId ? getMatchById(investorId) : undefined;

  const getToken = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }, []);

  // Load profile
  useEffect(() => {
    if (!investorId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        const res = await fetch(`/api/startup/investors/${encodeURIComponent(investorId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load investor profile');
        }
        const json = await res.json();
        if (cancelled) return;
        if (json.profile) setProfile(json.profile);
        if (json.match) setMatchData(json.match);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [investorId, getToken]);

  // Lazy-load AI insights
  useEffect(() => {
    if (!investorId || !profile) return;
    let cancelled = false;

    (async () => {
      setAiLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/startup/investors/${encodeURIComponent(investorId)}?ai=1`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json.ai_insights && !json.ai_insights.error) {
          setAiInsights(json.ai_insights);
        }
      } catch { /* AI insights are optional */ }
      finally { if (!cancelled) setAiLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [investorId, profile, getToken]);

  const displayProfile = profile || (cachedMatch ? buildProfileFromMatch(cachedMatch) : null);
  const displayMatch = matchData || (cachedMatch ? {
    fit_score_0_to_100: cachedMatch.fit_score_0_to_100,
    eligible: cachedMatch.eligible,
    category_breakdown: cachedMatch.category_breakdown,
    gate_fail_reasons: cachedMatch.gate_fail_reasons,
  } : null);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setProfile(null);
    window.location.reload();
  }, []);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});

    if (navigator.share) {
      navigator.share({
        title: `${displayProfile?.investor_name || displayProfile?.name || 'Investor'} — Match Report`,
        url,
      }).catch(() => {});
    }
  }, [displayProfile]);

  // Loading
  if (loading && !displayProfile) return <DetailSkeleton />;

  // Error
  if (error && !displayProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="fi-card p-8 text-center max-w-md">
          <AlertTriangle className="w-9 h-9 mx-auto mb-3" style={{ color: 'var(--fi-score-good)' }} />
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--fi-text-primary)' }}>Profile not found</p>
          <p className="text-sm mb-4" style={{ color: 'var(--fi-text-muted)' }}>{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)', color: 'var(--fi-text-primary)' }}
            >
              Go Back
            </button>
            <button
              onClick={handleRetry}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              style={{ background: 'var(--fi-primary)', color: '#fff' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!displayProfile) return <DetailSkeleton />;

  // ---------------------------------------------------------------------------
  // Parse profile fields
  // ---------------------------------------------------------------------------
  const name = displayProfile.investor_name || displayProfile.name || 'Unknown Investor';
  const logoUrl = displayProfile.logo_url || displayProfile.metadata_json?.logo_public_url || displayProfile.raw_profile_json?.logo_url || null;
  const investorType = displayProfile.investor_type || '';
  const location = [
    displayProfile.investor_hq_city || displayProfile.city,
    displayProfile.investor_hq_state || displayProfile.state,
    displayProfile.investor_hq_country || displayProfile.country,
  ].filter(Boolean).join(', ');
  const website = displayProfile.investor_url || displayProfile.website;
  const linkedinUrl = displayProfile.investor_linkedin_url;
  const email = displayProfile.investor_email;
  const contactPage = displayProfile.investor_contact_page;
  const thesis = displayProfile.investor_thesis_summary;
  const foundedYear = displayProfile.investor_founded_year;
  const aum = displayProfile.investor_aum_usd;
  const checkMin = displayProfile.investor_minimum_check_usd;
  const checkMax = displayProfile.investor_maximum_check_usd;
  const checkTyp = displayProfile.investor_typical_check_usd;
  const portfolioSize = displayProfile.investor_portfolio_size;
  const leadOrFollow = displayProfile.investor_lead_or_follow;
  const ticketStyle = displayProfile.investor_ticket_style;
  const requiresWarmIntro = displayProfile.investor_requires_warm_intro;
  const activeStatus = displayProfile.investor_active_status;
  const prefersB2C = displayProfile.investor_prefers_b2c;
  const prefersB2B = displayProfile.investor_prefers_b2b;
  const stages: string[] = toStringArray(displayProfile.investor_stages || displayProfile.stages);
  const sectors: string[] = toStringArray(displayProfile.investor_sectors || displayProfile.sectors);
  const geoFocus: string[] = toStringArray(displayProfile.investor_geography_focus);
  const stageKeywords: string[] = toStringArray(displayProfile.investor_stage_keywords);
  const sectorKeywords: string[] = toStringArray(displayProfile.investor_sector_keywords);
  const recentInvestments: string[] = toStringArray(displayProfile.investor_recent_investments);
  const notablePortfolio: string[] = toStringArray(displayProfile.investor_notable_portfolio);

  const thesisFitScore = displayMatch?.fit_score_0_to_100;
  const frictionlessScore = thesisFitScore != null ? calculateReadinessScore(readinessScore, thesisFitScore) : null;
  const breakdown = displayMatch?.category_breakdown || {};

  // Chart data
  const checkSizeData = [
    { name: 'Min', value: parseFloat(String(checkMin)) || 0, fill: 'var(--fi-score-good)' },
    { name: 'Typical', value: parseFloat(String(checkTyp)) || 0, fill: 'var(--fi-primary)' },
    { name: 'Max', value: parseFloat(String(checkMax)) || 0, fill: 'var(--fi-score-excellent)' },
  ];

  const sectorChartData = aiInsights?.sector_trend_data?.length
    ? aiInsights.sector_trend_data.map((s: any, i: number) => ({ name: s.sector, value: s.weight, color: SECTOR_COLORS[i % SECTOR_COLORS.length] }))
    : sectors.map((s, i) => ({ name: s, value: Math.round(100 / Math.max(sectors.length, 1)), color: SECTOR_COLORS[i % SECTOR_COLORS.length] }));

  const radarData = [
    { dim: 'Growth', v: stages.some(s => s.toLowerCase().includes('growth')) ? 90 : 30 },
    { dim: 'Series B+', v: stages.some(s => s.toLowerCase().includes('series')) ? 85 : 25 },
    { dim: 'B2C', v: prefersB2C ? 85 : 20 },
    { dim: 'Lead Deals', v: leadOrFollow === 'lead' ? 95 : 40 },
    { dim: 'Synergy', v: aiInsights?.portfolio_synergy_score || 70 },
    { dim: 'Active', v: ticketStyle?.toLowerCase()?.includes('active') ? 85 : 40 },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24 lg:pb-8 space-y-4">
      {/* ─── Back + Share ─── */}
      <div className="flex items-center justify-between">
        <motion.button initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm transition-colors group"
          style={{ color: 'var(--fi-text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Investors
        </motion.button>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)', color: 'var(--fi-text-muted)' }}
        >
          {copied ? <Check className="w-3 h-3" style={{ color: 'var(--fi-score-excellent)' }} /> : <Share2 className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Share'}
        </motion.button>
      </div>

      {/* ================================================================ */}
      {/* HERO */}
      {/* ================================================================ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="fi-card overflow-hidden p-0">
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--fi-primary), rgba(139,92,246,0.4), transparent)' }} />
        <div className="p-5 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5">
            {/* Logo */}
            <div
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
              style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
            >
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt={name} className="w-full h-full object-contain p-2.5"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="text-2xl font-bold" style={{ color: 'var(--fi-text-muted)' }}>{getInitials(name)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--fi-text-primary)' }}>{name}</h1>
                {activeStatus === 'active' && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--fi-score-excellent)', border: '1px solid rgba(16,185,129,0.15)' }}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" /> Active
                  </span>
                )}
                {frictionlessScore != null && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      color: getScoreColor(frictionlessScore),
                      borderColor: getScoreColor(frictionlessScore),
                      border: `1px solid`,
                      background: `color-mix(in srgb, ${getScoreColor(frictionlessScore)} 8%, transparent)`,
                    }}
                  >
                    {frictionlessScore} — {getScoreLabel(frictionlessScore)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] mb-3" style={{ color: 'var(--fi-text-muted)' }}>
                {investorType && <span className="flex items-center gap-1 capitalize"><Building2 className="w-3 h-3" />{investorType.replace(/_/g, ' ')}</span>}
                {location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>}
                {foundedYear && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Est. {foundedYear}</span>}
                {leadOrFollow && <span className="flex items-center gap-1 capitalize"><Target className="w-3 h-3" />{leadOrFollow} investor</span>}
              </div>

              {thesis && <p className="text-[13px] leading-relaxed max-w-2xl mb-3" style={{ color: 'var(--fi-text-muted)' }}>{thesis}</p>}

              <div className="flex flex-wrap gap-1.5 mb-4">
                {stages.map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full capitalize font-medium"
                    style={{ background: 'rgba(16,185,129,0.05)', color: 'var(--fi-primary)', border: '1px solid rgba(16,185,129,0.1)' }}>{s}</span>
                ))}
                {sectors.slice(0, 5).map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full capitalize font-medium"
                    style={{ background: 'rgba(139,92,246,0.05)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.1)' }}>{s}</span>
                ))}
                {prefersB2C && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.05)', color: 'var(--fi-score-excellent)', border: '1px solid rgba(16,185,129,0.1)' }}>B2C</span>}
                {prefersB2B && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(59,130,246,0.05)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.1)' }}>B2B</span>}
                {requiresWarmIntro && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
                    style={{ background: 'rgba(245,158,11,0.05)', color: 'var(--fi-score-good)', border: '1px solid rgba(245,158,11,0.1)' }}>
                    <Handshake className="w-2.5 h-2.5" /> Warm Intro
                  </span>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{ background: 'var(--fi-primary)', color: '#fff' }}>
                    <Globe className="w-3 h-3" /> Website
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{ background: 'rgba(10,102,194,0.1)', color: '#0A66C2', border: '1px solid rgba(10,102,194,0.15)' }}>
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </a>
                )}
                {(email || contactPage) && (
                  <a href={email ? `mailto:${email}` : contactPage!} target={email ? undefined : '_blank'} rel={email ? undefined : 'noopener noreferrer'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)', color: 'var(--fi-text-primary)' }}>
                    <Mail className="w-3 h-3" /> Contact
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ================================================================ */}
      {/* METRICS BAR */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={DollarSign} label="AUM" value={formatUsd(aum)} color="#3B82F6" index={0} />
        <MetricCard icon={Target} label="Typical Check" value={formatUsd(checkTyp)} subtext={checkMin || checkMax ? `${formatUsd(checkMin)} – ${formatUsd(checkMax)}` : undefined} color="#10B981" index={1} />
        <MetricCard icon={Briefcase} label="Portfolio Size" value={portfolioSize ? String(portfolioSize) : '—'} subtext={ticketStyle || undefined} color="#8B5CF6" index={2} />
        <MetricCard icon={TrendingUp} label="Founded" value={foundedYear ? String(foundedYear) : '—'} subtext={geoFocus.length ? geoFocus.slice(0, 2).join(', ') : undefined} color="#F59E0B" index={3} />
      </div>

      {/* ================================================================ */}
      {/* TABS */}
      {/* ================================================================ */}
      <TabGroup
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabKey)}
        variant="underline"
        size="md"
      />

      {/* ================================================================ */}
      {/* TAB CONTENT */}
      {/* ================================================================ */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Frictionless Score Card */}
            {frictionlessScore != null && (
              <div className="fi-card p-5">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ScoreGauge score={frictionlessScore} size="lg" showLabel animated />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fi-text-primary)' }}>Match Score</h3>
                      <p className="text-2xl font-bold font-mono" style={{ color: getScoreColor(frictionlessScore) }}>
                        {frictionlessScore}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--fi-text-muted)' }}>
                        = (Frictionless: {readinessScore}% + Thesis Fit: {Math.round(thesisFitScore!)}%) / 2
                      </p>
                    </div>

                    {/* Sub-score bars */}
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Frictionless Score</span>
                          <span className="text-xs font-mono font-semibold" style={{ color: getScoreColor(readinessScore) }}>{readinessScore}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: getScoreColor(readinessScore) }}
                            initial={{ width: 0 }} animate={{ width: `${readinessScore}%` }} transition={{ duration: 0.8 }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Thesis Fit Score</span>
                          <span className="text-xs font-mono font-semibold" style={{ color: getScoreColor(Math.round(thesisFitScore!)) }}>{Math.round(thesisFitScore!)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: getScoreColor(Math.round(thesisFitScore!)) }}
                            initial={{ width: 0 }} animate={{ width: `${thesisFitScore}%` }} transition={{ duration: 0.8, delay: 0.1 }} />
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
                      The Match Score combines your Frictionless Score with how well this investor&apos;s thesis matches your profile.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Insights */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <Image src={FRICTIONLESS_LOGO} alt="Frictionless" width={16} height={16} className="object-contain" />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Frictionless AI Insights</h2>
                {aiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" style={{ color: 'var(--fi-primary)' }} />}
              </div>

              {aiLoading && !aiInsights ? (
                <div className="fi-card p-6 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fi-primary)' }} />
                  <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Analyzing investor data...</p>
                </div>
              ) : aiInsights ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiInsights.strategic_summary && <InsightCard icon={Lightbulb} title="Strategy" content={aiInsights.strategic_summary} color="#3B82F6" index={0} />}
                  {aiInsights.competitive_edge && <InsightCard icon={Trophy} title="Competitive Edge" content={aiInsights.competitive_edge} color="#8B5CF6" index={1} />}
                  {aiInsights.ideal_startup_profile && <InsightCard icon={Target} title="Ideal Startup" content={aiInsights.ideal_startup_profile} color="#10B981" index={2} />}
                  {aiInsights.approach_tips?.length > 0 && <InsightCard icon={Zap} title="Approach Tips" content={aiInsights.approach_tips} color="#F59E0B" index={3} />}
                  {aiInsights.red_flags?.length > 0 && <InsightCard icon={AlertTriangle} title="Watch Out" content={aiInsights.red_flags} color="#EF4444" index={4} />}
                  {aiInsights.investment_pace && <InsightCard icon={Clock} title="Pacing" content={aiInsights.investment_pace} color="#06B6D4" index={5} />}
                </div>
              ) : (
                <div className="fi-card p-5 text-center text-xs" style={{ color: 'var(--fi-text-muted)' }}>
                  AI insights will appear here when analysis completes.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'thesis' && (
          <motion.div key="thesis" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <AccordionSection title="Investment Preferences" icon={Layers} color="#8B5CF6" defaultOpen>
              <div className="space-y-2.5 pt-3">
                {[
                  { l: 'Lead/Follow', v: leadOrFollow ? `${leadOrFollow.charAt(0).toUpperCase()}${leadOrFollow.slice(1)}` : '—' },
                  { l: 'Ticket Style', v: ticketStyle || '—' },
                  { l: 'Stages', v: stages.join(', ') || '—' },
                  { l: 'Geography', v: geoFocus.join(', ') || '—' },
                  { l: 'Warm Intro', v: requiresWarmIntro ? 'Required' : 'Not required' },
                  { l: 'Model', v: [prefersB2C && 'B2C', prefersB2B && 'B2B'].filter(Boolean).join(', ') || '—' },
                ].map((r) => (
                  <div key={r.l} className="flex items-center justify-between text-[12px]">
                    <span style={{ color: 'var(--fi-text-muted)' }}>{r.l}</span>
                    <span className="font-medium" style={{ color: 'var(--fi-text-primary)' }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection title="Focus Keywords" icon={Shield} color="#3B82F6" defaultOpen>
              <div className="space-y-3 pt-3">
                {stageKeywords.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-medium mb-1.5" style={{ color: 'var(--fi-text-muted)' }}>Stage</p>
                    <div className="flex flex-wrap gap-1.5">{stageKeywords.map((k) => (
                      <span key={k} className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)', color: 'var(--fi-text-secondary)' }}>{k}</span>
                    ))}</div>
                  </div>
                )}
                {sectorKeywords.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-medium mb-1.5" style={{ color: 'var(--fi-text-muted)' }}>Sector</p>
                    <div className="flex flex-wrap gap-1.5">{sectorKeywords.map((k) => (
                      <span key={k} className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)', color: 'var(--fi-text-secondary)' }}>{k}</span>
                    ))}</div>
                  </div>
                )}
                {geoFocus.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-medium mb-1.5" style={{ color: 'var(--fi-text-muted)' }}>Geography</p>
                    <div className="flex flex-wrap gap-1.5">{geoFocus.map((g) => (
                      <span key={g} className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)', color: 'var(--fi-text-secondary)' }}>{g}</span>
                    ))}</div>
                  </div>
                )}
                {!stageKeywords.length && !sectorKeywords.length && !geoFocus.length && (
                  <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>No keyword data available.</p>
                )}
              </div>
            </AccordionSection>

            {/* Sector pie + Radar */}
            {(sectors.length > 0 || stages.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {sectors.length > 0 && (
                  <div className="fi-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                      <h3 className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Sector Focus</h3>
                    </div>
                    <div className="flex items-center justify-center" style={{ height: 160 }}>
                      <div className="relative" style={{ width: 150, height: 150 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={sectorChartData} cx="50%" cy="50%" innerRadius="48%" outerRadius="82%" paddingAngle={3} dataKey="value" isAnimationActive animationDuration={800}>
                              {sectorChartData.map((e: any, i: number) => <Cell key={i} fill={e.color} stroke="none" />)}
                            </Pie>
                            <Tooltip content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload;
                              return <div className="fi-card px-2 py-1.5 text-[10px]" style={{ background: 'var(--fi-bg-card)', border: '1px solid var(--fi-border)' }}><span className="font-semibold" style={{ color: d.color }}>{d.name}</span> — {d.value}%</div>;
                            }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-mono font-bold" style={{ color: 'var(--fi-text-primary)' }}>{sectorChartData.length}</span>
                          <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>sectors</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-0.5 mt-1">
                      {sectorChartData.slice(0, 5).map((s: any, i: number) => (
                        <span key={i} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />{s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="fi-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                    <h3 className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Focus Profile</h3>
                  </div>
                  <div className="flex items-center justify-center" style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="var(--fi-border)" />
                        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} />
                        <Radar dataKey="v" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.12} strokeWidth={2} isAnimationActive animationDuration={800} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'portfolio' && (
          <motion.div key="portfolio" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {notablePortfolio.length > 0 && (
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4" style={{ color: 'var(--fi-score-excellent)' }} />
                  <h3 className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Notable Portfolio</h3>
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--fi-text-muted)' }}>{notablePortfolio.length} companies</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {notablePortfolio.map((c, i) => (
                    <motion.span key={c} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: 'rgba(16,185,129,0.05)', color: 'var(--fi-primary)', border: '1px solid rgba(16,185,129,0.1)' }}>
                      {c}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}
            {recentInvestments.length > 0 && (
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                  <h3 className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Recent Investments</h3>
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--fi-text-muted)' }}>{recentInvestments.length} deals</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentInvestments.map((c, i) => (
                    <motion.span key={c} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: 'rgba(16,185,129,0.05)', color: 'var(--fi-score-excellent)', border: '1px solid rgba(16,185,129,0.1)' }}>
                      {c}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}
            {!notablePortfolio.length && !recentInvestments.length && (
              <div className="fi-card p-8 text-center">
                <Briefcase className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--fi-text-muted)', opacity: 0.3 }} />
                <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>No portfolio data available yet.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'breakdown' && (
          <motion.div key="breakdown" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Eligibility status */}
            {displayMatch && (
              <div
                className="fi-card p-4 flex items-start gap-3"
                style={{ borderLeft: `4px solid ${displayMatch.eligible ? 'var(--fi-score-excellent)' : 'var(--fi-score-good)'}` }}
              >
                {displayMatch.eligible ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--fi-score-excellent)' }} />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--fi-score-good)' }} />
                )}
                <div>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--fi-text-primary)' }}>
                    {displayMatch.eligible ? 'Eligible Match' : 'Not Eligible'}
                  </p>
                  {!displayMatch.eligible && displayMatch.gate_fail_reasons?.length > 0 && (
                    <ul className="space-y-0.5 mt-1">
                      {displayMatch.gate_fail_reasons.map((reason: string, i: number) => (
                        <li key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: 'var(--fi-text-muted)' }}>
                          <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--fi-score-good)' }} />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {Object.keys(breakdown).length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Category Fit Breakdown</h3>
                {Object.entries(breakdown).map(([key, data]: [string, any]) => {
                  const pct = data.max_point > 0 ? Math.round((data.raw_points / data.max_point) * 100) : 0;
                  const label = {
                    deal_compatibility: 'Deal Compatibility',
                    sector_business_model_fit: 'Sector & Business Model',
                    traction_vs_thesis_bar: 'Traction vs Thesis',
                    founder_team_fit: 'Founder & Team Fit',
                    risk_regulatory_alignment: 'Risk & Regulatory Alignment',
                    diligence_process_fit: 'Diligence Process Fit',
                  }[key] || key.replace(/_/g, ' ');
                  const subcats = data.subcategories || {};
                  const weight = data.weight != null ? `${Math.round(data.weight * 100)}%` : null;

                  return (
                    <div key={key} className="fi-card overflow-hidden p-0">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold capitalize" style={{ color: 'var(--fi-text-primary)' }}>{label}</span>
                            {weight && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--fi-bg-secondary)', color: 'var(--fi-text-muted)' }}>
                                weight: {weight}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>{data.raw_points}/{data.max_point} pts</span>
                            <span className="text-sm font-mono font-bold" style={{ color: getScoreColor(pct) }}>{pct}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--fi-bg-tertiary)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: getScoreColor(pct) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(pct, 100)}%` }}
                            transition={{ duration: 0.8, ease: [0, 0, 0.58, 1] }}
                          />
                        </div>

                        {/* Subcategory reasoning */}
                        {Object.keys(subcats).length > 0 && (
                          <div className="space-y-1.5 pl-3" style={{ borderLeft: '2px solid var(--fi-border)' }}>
                            {Object.entries(subcats).map(([subKey, subData]: [string, any]) => {
                              const subPct = subData.max_point > 0 ? Math.round((subData.raw_points / subData.max_point) * 100) : 0;
                              const subLabel = subKey.replace(/_/g, ' ');
                              const optionChosen = subData.option_chosen || '';

                              return (
                                <div key={subKey} className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] capitalize truncate" style={{ color: 'var(--fi-text-muted)' }}>{subLabel}</span>
                                      <span className="text-[10px] font-mono font-semibold shrink-0" style={{ color: getScoreColor(subPct) }}>
                                        {subData.raw_points}/{subData.max_point}
                                      </span>
                                    </div>
                                    {optionChosen && (
                                      <p className="text-[10px] leading-snug mt-0.5 italic" style={{ color: 'var(--fi-text-muted)', opacity: 0.6 }}>{optionChosen}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="fi-card p-8 text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--fi-text-muted)', opacity: 0.3 }} />
                <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>No fit breakdown data available.</p>
              </div>
            )}

            {/* Check Size Chart */}
            {(checkMin || checkTyp || checkMax) && (
              <div className="fi-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                  <h3 className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Check Size Range</h3>
                </div>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={checkSizeData} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--fi-border)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} tickFormatter={(v) => formatUsd(v)} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" name="Amount" radius={[0, 5, 5, 0]} isAnimationActive animationDuration={800}>
                        {checkSizeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'contact' && (
          <motion.div key="contact" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="fi-card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fi-text-primary)' }}>Contact Information</h3>
              <div className="space-y-3">
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors group"
                    style={{ background: 'var(--fi-bg-secondary)' }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                      <Globe className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium transition-colors" style={{ color: 'var(--fi-text-primary)' }}>Website</p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--fi-text-muted)' }}>{website}</p>
                    </div>
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors group"
                    style={{ background: 'var(--fi-bg-secondary)' }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(10,102,194,0.1)' }}>
                      <Linkedin className="w-4 h-4" style={{ color: '#0A66C2' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium transition-colors" style={{ color: 'var(--fi-text-primary)' }}>LinkedIn</p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--fi-text-muted)' }}>{linkedinUrl}</p>
                    </div>
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors group"
                    style={{ background: 'var(--fi-bg-secondary)' }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                      <Mail className="w-4 h-4" style={{ color: 'var(--fi-score-excellent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium transition-colors" style={{ color: 'var(--fi-text-primary)' }}>Email</p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--fi-text-muted)' }}>{email}</p>
                    </div>
                  </a>
                )}
                {contactPage && (
                  <a href={contactPage} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors group"
                    style={{ background: 'var(--fi-bg-secondary)' }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                      <Mail className="w-4 h-4" style={{ color: 'var(--fi-score-good)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium transition-colors" style={{ color: 'var(--fi-text-primary)' }}>Contact Page</p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--fi-text-muted)' }}>{contactPage}</p>
                    </div>
                  </a>
                )}
                {!website && !linkedinUrl && !email && !contactPage && (
                  <div className="text-center py-6">
                    <Mail className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--fi-text-muted)', opacity: 0.3 }} />
                    <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>No contact information available.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
}

function buildProfileFromMatch(match: InvestorMatchResult): Record<string, any> {
  const inv = match.investor_profile || {};
  return {
    id: match.investor_id,
    investor_name: (inv as any)?.name || 'Unknown Investor',
    investor_type: (inv as any)?.investor_type || null,
    investor_hq_city: (inv as any)?.city || null,
    investor_hq_state: (inv as any)?.state || null,
    investor_hq_country: (inv as any)?.country || null,
    investor_url: (inv as any)?.website || null,
    logo_url: (inv as any)?.logo_url || null,
    investor_stages: (inv as any)?.stages || [],
    investor_sectors: (inv as any)?.sectors || [],
    investor_minimum_check_usd: (inv as any)?.check_min_usd || null,
    investor_maximum_check_usd: (inv as any)?.check_max_usd || null,
    investor_typical_check_usd: (inv as any)?.check_typical_usd || null,
    _source: 'match_cached',
  };
}
