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
import { useInvestorStore } from '@/stores/investor-store';
import { supabase } from '@/lib/supabase/client';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SECTOR_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];
const FRICTIONLESS_LOGO = '/ai-logo.png';

type TabKey = 'overview' | 'thesis' | 'portfolio' | 'breakdown' | 'contact';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'thesis', label: 'Thesis & Focus' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'breakdown', label: 'Fit Breakdown' },
  { key: 'contact', label: 'Contact' },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function DetailSkeleton() {
  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-5 animate-pulse">
      <div className="h-4 w-28 bg-muted/30 rounded" />
      <div className="glass-card overflow-hidden">
        <div className="h-1 w-full bg-muted/20" />
        <div className="p-5 lg:p-7">
          <div className="flex gap-5">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-muted/30" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 bg-muted/30 rounded" />
              <div className="h-3 w-64 bg-muted/20 rounded" />
              <div className="h-3 w-80 bg-muted/15 rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-muted/20 rounded-full" />
                <div className="h-5 w-20 bg-muted/20 rounded-full" />
                <div className="h-5 w-14 bg-muted/20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4 space-y-2">
            <div className="h-3 w-16 bg-muted/20 rounded" />
            <div className="h-5 w-20 bg-muted/30 rounded" />
          </div>
        ))}
      </div>
      <div className="h-10 bg-muted/15 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-6 h-48 bg-muted/10" />
        <div className="glass-card p-6 h-48 bg-muted/10" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload || !(payload as Array<Record<string, unknown>>).length) return null;
  const items = payload as Array<{ value: number; name: string; color: string }>;
  return (
    <div className="glass-card px-3 py-2 text-xs border border-border/50">
      <p className="text-muted-foreground mb-1">{label as string}</p>
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
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-mono font-bold text-foreground">{value}</p>
      {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
    </motion.div>
  );
}

function AccordionSection({ title, icon: Icon, color, defaultOpen = false, children }: {
  title: string; icon: React.ElementType; color: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <h3 className="text-xs font-display font-semibold text-foreground">{title}</h3>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
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
            <div className="px-4 pb-4 pt-0">
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
      className="glass-card p-4 hover:border-primary/10 transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <h4 className="text-xs font-display font-semibold text-foreground">{title}</h4>
      </div>
      {Array.isArray(content) ? (
        <ul className="space-y-1">
          {content.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
              <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{content}</p>
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

  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [matchData, setMatchData] = useState<Record<string, any> | null>(null);
  const [aiInsights, setAiInsights] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Stale-while-revalidate: get cached match from store immediately
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

  // Show cached data immediately while loading
  const displayProfile = profile || (cachedMatch ? buildProfileFromMatch(cachedMatch) : null);
  const displayMatch = matchData || (cachedMatch ? {
    fit_score_0_to_100: cachedMatch.fit_score_0_to_100,
    eligible: cachedMatch.eligible,
    category_breakdown: cachedMatch.category_breakdown,
    gate_fail_reasons: cachedMatch.gate_fail_reasons,
  } : null);

  // Retry handler
  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setProfile(null);
    // Re-trigger effect by re-setting state (the effect depends on investorId)
    window.location.reload();
  }, []);

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (loading && !displayProfile) {
    return <DetailSkeleton />;
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error && !displayProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 text-center max-w-md">
          <AlertTriangle className="w-9 h-9 text-yellow-500 mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground mb-1">Profile not found</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => router.back()} className="px-4 py-2 rounded-lg bg-muted border border-border text-sm font-medium text-foreground hover:bg-muted/80 transition-colors">
              Go Back
            </button>
            <button onClick={handleRetry} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
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
  // Parse profile fields (handles both universal_profiles and match_embedded)
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

  const fitScore = displayMatch?.fit_score_0_to_100;
  const scoreStyle = fitScore != null ? getScoreStyle(fitScore) : null;
  const breakdown = displayMatch?.category_breakdown || {};

  // Chart data
  const checkSizeData = [
    { name: 'Min', value: parseFloat(String(checkMin)) || 0, fill: '#EAB308' },
    { name: 'Typical', value: parseFloat(String(checkTyp)) || 0, fill: '#3B82F6' },
    { name: 'Max', value: parseFloat(String(checkMax)) || 0, fill: '#10B981' },
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${name} — Investor Profile`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24 lg:pb-8 space-y-4">
      {/* Back + Share */}
      <div className="flex items-center justify-between">
        <motion.button initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Investors
        </motion.button>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40 text-xs text-muted-foreground hover:text-foreground transition-all">
          <Share2 className="w-3 h-3" />
          Share
        </motion.button>
      </div>

      {/* ================================================================ */}
      {/* HERO */}
      {/* ================================================================ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="glass-card overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-[#8B5CF6]/40 to-primary/10" />
        <div className="p-5 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5">
            {/* Logo */}
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt={name} className="w-full h-full object-contain p-2.5"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">{getInitials(name)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-xl lg:text-2xl font-display font-bold text-foreground">{name}</h1>
                {activeStatus === 'active' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 font-medium">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Active
                  </span>
                )}
                {fitScore != null && scoreStyle && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                    style={{
                      color: scoreStyle.variantColor,
                      borderColor: `${scoreStyle.variantColor}30`,
                      backgroundColor: `${scoreStyle.variantColor}10`,
                    }}
                  >
                    {Math.round(fitScore)} — {scoreStyle.label}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground mb-3">
                {investorType && <span className="flex items-center gap-1 capitalize"><Building2 className="w-3 h-3" />{investorType.replace(/_/g, ' ')}</span>}
                {location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>}
                {foundedYear && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Est. {foundedYear}</span>}
                {leadOrFollow && <span className="flex items-center gap-1 capitalize"><Target className="w-3 h-3" />{leadOrFollow} investor</span>}
              </div>

              {thesis && <p className="text-[13px] text-muted-foreground leading-relaxed max-w-2xl mb-3">{thesis}</p>}

              <div className="flex flex-wrap gap-1.5 mb-4">
                {stages.map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full capitalize bg-primary/5 text-primary/80 border border-primary/10 font-medium">{s}</span>
                ))}
                {sectors.slice(0, 5).map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full capitalize bg-[#8B5CF6]/5 text-[#8B5CF6]/80 border border-[#8B5CF6]/10 font-medium">{s}</span>
                ))}
                {prefersB2C && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/5 text-emerald-500/80 border border-emerald-500/10 font-medium">B2C</span>}
                {prefersB2B && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/5 text-blue-500/80 border border-blue-500/10 font-medium">B2B</span>}
                {requiresWarmIntro && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 border border-yellow-500/10 font-medium flex items-center gap-0.5">
                    <Handshake className="w-2.5 h-2.5" /> Warm Intro
                  </span>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors">
                    <Globe className="w-3 h-3" /> Website
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/15 text-[12px] font-medium hover:bg-[#0A66C2]/20 transition-colors">
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </a>
                )}
                {(email || contactPage) && (
                  <a href={email ? `mailto:${email}` : contactPage!} target={email ? undefined : '_blank'} rel={email ? undefined : 'noopener noreferrer'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-[12px] font-medium text-foreground hover:bg-muted/80 transition-colors">
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
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 -mx-4 px-4 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar border-b border-border/30 pb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3.5 py-2.5 text-[12px] font-medium whitespace-nowrap transition-all relative',
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================ */}
      {/* TAB CONTENT */}
      {/* ================================================================ */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Fit Score Card (if available) */}
            {fitScore != null && scoreStyle && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-display font-semibold text-foreground">Thesis Fit Score</h3>
                  <span className="text-2xl font-mono font-bold" style={{ color: scoreStyle.variantColor }}>
                    {Math.round(fitScore)}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: scoreStyle.variantColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${fitScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2" style={{ color: scoreStyle.variantColor }}>
                  {scoreStyle.label}
                </p>
              </div>
            )}

            {/* AI Insights */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                  <Image src={FRICTIONLESS_LOGO} alt="Frictionless" width={16} height={16} className="object-contain" />
                </div>
                <h2 className="text-sm font-display font-semibold text-foreground">Frictionless AI Insights</h2>
                {aiLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary ml-1" />}
              </div>

              {aiLoading && !aiInsights ? (
                <div className="glass-card p-6 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Analyzing investor data...</p>
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
                <div className="glass-card p-5 text-center text-xs text-muted-foreground">
                  AI insights will appear here when analysis completes.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'thesis' && (
          <motion.div key="thesis" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <AccordionSection title="Investment Preferences" icon={Layers} color="#8B5CF6" defaultOpen>
              <div className="space-y-2.5">
                {[
                  { l: 'Lead/Follow', v: leadOrFollow ? `${leadOrFollow.charAt(0).toUpperCase()}${leadOrFollow.slice(1)}` : '—' },
                  { l: 'Ticket Style', v: ticketStyle || '—' },
                  { l: 'Stages', v: stages.join(', ') || '—' },
                  { l: 'Geography', v: geoFocus.join(', ') || '—' },
                  { l: 'Warm Intro', v: requiresWarmIntro ? 'Required' : 'Not required' },
                  { l: 'Model', v: [prefersB2C && 'B2C', prefersB2B && 'B2B'].filter(Boolean).join(', ') || '—' },
                ].map((r) => (
                  <div key={r.l} className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">{r.l}</span>
                    <span className="font-medium text-foreground">{r.v}</span>
                  </div>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection title="Focus Keywords" icon={Shield} color="#3B82F6" defaultOpen>
              <div className="space-y-3">
                {stageKeywords.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Stage</p>
                    <div className="flex flex-wrap gap-1.5">{stageKeywords.map((k) => (
                      <span key={k} className="text-[9px] px-2 py-0.5 rounded-full capitalize bg-muted/40 border border-border/30 text-foreground/70">{k}</span>
                    ))}</div>
                  </div>
                )}
                {sectorKeywords.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Sector</p>
                    <div className="flex flex-wrap gap-1.5">{sectorKeywords.map((k) => (
                      <span key={k} className="text-[9px] px-2 py-0.5 rounded-full capitalize bg-muted/40 border border-border/30 text-foreground/70">{k}</span>
                    ))}</div>
                  </div>
                )}
                {geoFocus.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Geography</p>
                    <div className="flex flex-wrap gap-1.5">{geoFocus.map((g) => (
                      <span key={g} className="text-[9px] px-2 py-0.5 rounded-full capitalize bg-muted/40 border border-border/30 text-foreground/70">{g}</span>
                    ))}</div>
                  </div>
                )}
                {!stageKeywords.length && !sectorKeywords.length && !geoFocus.length && (
                  <p className="text-xs text-muted-foreground">No keyword data available.</p>
                )}
              </div>
            </AccordionSection>

            {/* Sector pie + Radar */}
            {(sectors.length > 0 || stages.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {sectors.length > 0 && (
                  <div className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-display font-semibold text-foreground">Sector Focus</h3>
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
                              return <div className="glass-card px-2 py-1.5 text-[10px] border border-border/50"><span className="font-semibold" style={{ color: d.color }}>{d.name}</span> — {d.value}%</div>;
                            }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-mono font-bold text-foreground">{sectorChartData.length}</span>
                          <span className="text-[8px] text-muted-foreground">sectors</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-0.5 mt-1">
                      {sectorChartData.slice(0, 5).map((s: any, i: number) => (
                        <span key={i} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />{s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-[#8B5CF6]" />
                    <h3 className="text-xs font-display font-semibold text-foreground">Focus Profile</h3>
                  </div>
                  <div className="flex items-center justify-center" style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="rgba(75,85,99,0.18)" />
                        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 8, fill: '#9CA3AF' }} />
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
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-display font-semibold text-foreground">Notable Portfolio</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto">{notablePortfolio.length} companies</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {notablePortfolio.map((c, i) => (
                    <motion.span key={c} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-[11px] font-medium text-primary">
                      {c}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}
            {recentInvestments.length > 0 && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-display font-semibold text-foreground">Recent Investments</h3>
                  <span className="text-[10px] text-muted-foreground ml-auto">{recentInvestments.length} deals</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentInvestments.map((c, i) => (
                    <motion.span key={c} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="px-2.5 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      {c}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}
            {!notablePortfolio.length && !recentInvestments.length && (
              <div className="glass-card p-8 text-center">
                <Briefcase className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No portfolio data available yet.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'breakdown' && (
          <motion.div key="breakdown" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Eligibility status */}
            {displayMatch && (
              <div className={cn(
                'glass-card p-4 flex items-start gap-3 border-l-4',
                displayMatch.eligible ? 'border-l-emerald-500' : 'border-l-amber-500'
              )}>
                {displayMatch.eligible ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">
                    {displayMatch.eligible ? 'Eligible Match' : 'Not Eligible'}
                  </p>
                  {!displayMatch.eligible && displayMatch.gate_fail_reasons?.length > 0 && (
                    <ul className="space-y-0.5 mt-1">
                      {displayMatch.gate_fail_reasons.map((reason: string, i: number) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Category Breakdown with Subcategory Reasoning */}
            {Object.keys(breakdown).length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-display font-semibold text-foreground">Category Fit Breakdown</h3>
                {Object.entries(breakdown).map(([key, data]: [string, any]) => {
                  const pct = data.max_point > 0 ? Math.round((data.raw_points / data.max_point) * 100) : 0;
                  const barStyle = getScoreStyle(pct);
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
                    <div key={key} className="glass-card overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-foreground capitalize">{label}</span>
                            {weight && <span className="text-[9px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">weight: {weight}</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">{data.raw_points}/{data.max_point} pts</span>
                            <span className="text-sm font-mono font-bold" style={{ color: barStyle.variantColor }}>{pct}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden mb-3">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: barStyle.variantColor }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(pct, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>

                        {/* Subcategory reasoning */}
                        {Object.keys(subcats).length > 0 && (
                          <div className="space-y-1.5 pl-3 border-l-2 border-border/40">
                            {Object.entries(subcats).map(([subKey, subData]: [string, any]) => {
                              const subPct = subData.max_point > 0 ? Math.round((subData.raw_points / subData.max_point) * 100) : 0;
                              const subLabel = subKey.replace(/_/g, ' ');
                              const optionChosen = subData.option_chosen || '';

                              return (
                                <div key={subKey} className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] text-muted-foreground capitalize truncate">{subLabel}</span>
                                      <span className="text-[10px] font-mono font-semibold shrink-0" style={{ color: getScoreStyle(subPct).variantColor }}>
                                        {subData.raw_points}/{subData.max_point}
                                      </span>
                                    </div>
                                    {optionChosen && (
                                      <p className="text-[10px] text-foreground/60 leading-snug mt-0.5 italic">{optionChosen}</p>
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
              <div className="glass-card p-8 text-center">
                <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No fit breakdown data available.</p>
              </div>
            )}

            {/* Check Size Chart */}
            {(checkMin || checkTyp || checkMax) && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-display font-semibold text-foreground">Check Size Range</h3>
                </div>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={checkSizeData} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.12)" />
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickFormatter={(v) => formatUsd(v)} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
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
            <div className="glass-card p-5">
              <h3 className="text-sm font-display font-semibold text-foreground mb-4">Contact Information</h3>
              <div className="space-y-3">
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground group-hover:text-primary transition-colors">Website</p>
                      <p className="text-[11px] text-muted-foreground truncate">{website}</p>
                    </div>
                  </a>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center">
                      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground group-hover:text-[#0A66C2] transition-colors">LinkedIn</p>
                      <p className="text-[11px] text-muted-foreground truncate">{linkedinUrl}</p>
                    </div>
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground group-hover:text-emerald-500 transition-colors">Email</p>
                      <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                    </div>
                  </a>
                )}
                {contactPage && (
                  <a href={contactPage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground group-hover:text-yellow-500 transition-colors">Contact Page</p>
                      <p className="text-[11px] text-muted-foreground truncate">{contactPage}</p>
                    </div>
                  </a>
                )}
                {!website && !linkedinUrl && !email && !contactPage && (
                  <div className="text-center py-6">
                    <Mail className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No contact information available.</p>
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

