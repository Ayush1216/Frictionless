'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';
import { useOrgStore } from '@/stores/org-store';
import { useInvestorStore } from '@/stores/investor-store';
import { getScoreLabel } from '@/lib/scores';
import { getTopGapsFromRubric } from '@/lib/readiness-rubric';
import { dummyStartups } from '@/lib/dummy-data/startups';
import { getAuthHeaders } from '@/lib/api/tasks';
import type { ActivityEvent } from '@/components/dashboard/ActivityTimeline';
import type { Task, InvestorMatchResult, User, Founder } from '@/types/database';

export interface NarrativeData {
  // Auth
  user: User | null;
  isStartup: boolean;
  bootstrapLoaded: boolean;

  // Scores
  readinessScore: number;
  readinessDelta: number;
  scoreLabel: string;
  hasAssessment: boolean;

  // Categories
  readinessCategories: { name: string; score: number; delta: number; weight: number }[];
  lowestCategories: { name: string; score: number; delta: number; weight: number }[];

  // Tasks
  tasks: Task[];
  incompleteTasks: Task[];
  topImpactTasks: Task[];
  taskCompletionRate: number;
  scoreProjection: number;

  // Company
  companyName: string;
  companyLogo: string | null;
  companyStage: string;
  companySector: string;
  companyWebsite: string | null;
  companyDescription: string | null;
  elevatorPitch: string | null;
  companyBusinessModel: string | null;
  companyFoundedYear: number | null;
  companyLocation: string | null;
  companySubsector: string | null;
  roundTarget: string | null;
  founders: Founder[];
  teamMembers: { full_name: string; title: string; bio: string; linkedin_url: string }[];
  tags: string[];
  metrics: {
    mrr: number | null;
    runway_months: number | null;
    headcount: number | null;
    arr: number | null;
  };

  // Investors
  topMatches: InvestorMatchResult[];
  highMatchCount: number;
  investorLoading: boolean;

  // Score history
  chartData: { date: string; score: number }[];
  scoreHistory: { score: number; updated_at: string }[];

  // Activity
  activities: ActivityEvent[];
  activityLoading: boolean;

  // AI analysis
  aiAnalysis: AiAnalysis;
  fetchAiInsights: () => Promise<void>;

  // Hero narrative string
  heroNarrative: string;

  // Gaps
  topGaps: { item: string; severity: string }[];

  // Readiness signals
  profileCompleteness: number;
  dataRoomCompleteness: number;
  documentCount: number;
}

export interface AiAnalysis {
  insights?: string;
  strengths?: string[];
  risks?: string[];
  recommendations?: string[];
  status: 'loading' | 'cached' | 'generated' | 'error' | 'idle';
}

export function useNarrativeData(): NarrativeData {
  const user = useAuthStore((s) => s.user);
  const isStartup = user?.org_type === 'startup';
  const { readiness, scoreHistory, bootstrapLoaded, documentCount } = useReadinessStore();
  const { tasks } = useTaskStore();
  const startupProfile = useOrgStore((s) => s.startupProfile);
  const orgData = useOrgStore((s) => s.currentOrg);
  const investorStore = useInvestorStore();

  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis>({ status: 'idle' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [extractionData, setExtractionData] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apolloData, setApolloData] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [questionnaireData, setQuestionnaireData] = useState<Record<string, any> | null>(null);

  const startup = dummyStartups[0]; // fallback

  // ─── Fetch company profile (extraction + apollo data) ───
  useEffect(() => {
    if (!isStartup || !bootstrapLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        if (cancelled || !Object.keys(headers).length) return;
        const res = await fetch('/api/company-profile', { headers });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (json.extraction) setExtractionData(json.extraction);
        if (json.apollo) setApolloData(json.apollo);
        if (json.questionnaire) setQuestionnaireData(json.questionnaire);
      } catch {
        // silently fail
      }
    })();
    return () => { cancelled = true; };
  }, [isStartup, bootstrapLoaded]);

  // ─── Fetch activity timeline ───
  useEffect(() => {
    if (!isStartup || !bootstrapLoaded) return;
    let cancelled = false;
    setActivityLoading(true);
    (async () => {
      try {
        const headers = await getAuthHeaders();
        if (cancelled || !Object.keys(headers).length) return;
        const res = await fetch('/api/startup/activity?limit=20', { headers });
        const json = await res.json().catch(() => ({ activities: [] }));
        if (!cancelled) setActivities(json.activities ?? []);
      } catch {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isStartup, bootstrapLoaded]);

  // ─── Fetch investor matches + poll while pipeline is running ───
  useEffect(() => {
    if (!isStartup || !bootstrapLoaded) return;
    investorStore.fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStartup, bootstrapLoaded]);

  useEffect(() => {
    const status = investorStore.status;
    if (!isStartup || !bootstrapLoaded) return;
    if (status !== 'generating' && status !== 'matching') return;
    const timer = setInterval(() => { investorStore.fetchMatches(); }, 4_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStartup, bootstrapLoaded, investorStore.status]);

  // ─── AI insights (always load, no mode gate) ───
  const fetchAiInsights = useCallback(async () => {
    if (!user?.org_id) return;
    setAiAnalysis((prev) => ({ ...prev, status: 'loading' }));
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/readiness/analysis?org_id=${user.org_id}`, { headers });
      const json = await res.json().catch(() => ({}));
      setAiAnalysis({
        insights: json.insights,
        strengths: json.strengths,
        risks: json.risks,
        recommendations: json.recommendations,
        status: json.status || (json.insights ? 'generated' : 'error'),
      });
    } catch {
      setAiAnalysis({ status: 'error' });
    }
  }, [user?.org_id]);

  useEffect(() => {
    if (readiness && aiAnalysis.status === 'idle') {
      fetchAiInsights();
    }
  }, [readiness, aiAnalysis.status, fetchAiInsights]);

  // ─── Derived data ───
  const readinessScore = readiness?.score_summary?._overall?.raw_percentage ?? startup.assessment.overall_score;
  const readinessDelta =
    readiness && scoreHistory.length >= 2
      ? Math.round((readinessScore - scoreHistory[scoreHistory.length - 2].score) * 10) / 10
      : readiness ? 0 : startup.score_delta;
  const scoreLabel = getScoreLabel(readinessScore);
  const hasAssessment = !!readiness;

  const readinessCategories = useMemo(() => {
    if (readiness?.score_summary && typeof readiness.score_summary === 'object') {
      return Object.entries(readiness.score_summary)
        .filter(([k]) => k !== '_overall' && k !== 'totals')
        .map(([, v]) => {
          const cat = v as { category_name?: string; percentage?: number; weight?: number };
          return { name: cat.category_name ?? '', score: cat.percentage ?? 0, delta: 0, weight: cat.weight ?? 0 };
        })
        .filter((c) => c.name);
    }
    return startup.assessment.categories;
  }, [readiness, startup.assessment.categories]);

  const lowestCategories = useMemo(
    () => [...readinessCategories].sort((a, b) => a.score - b.score).slice(0, 3),
    [readinessCategories]
  );

  const topGaps = useMemo(
    () => getTopGapsFromRubric(readinessCategories, readiness?.scored_rubric as Record<string, unknown> | null | undefined),
    [readinessCategories, readiness]
  );

  const incompleteTasks = useMemo(
    () => tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress'),
    [tasks]
  );

  const taskCompletionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.status === 'done').length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  const topImpactTasks = useMemo(() => {
    return [...tasks]
      .filter((t) => t.status !== 'done' && t.potential_points && t.potential_points > 0)
      .sort((a, b) => (b.potential_points ?? 0) - (a.potential_points ?? 0))
      .slice(0, 5);
  }, [tasks]);

  const scoreProjection = useMemo(() => {
    const topTaskPts = [...tasks]
      .filter((t) => t.status !== 'done' && t.potential_points)
      .sort((a, b) => (b.potential_points ?? 0) - (a.potential_points ?? 0))
      .slice(0, 5)
      .reduce((sum, t) => sum + (t.potential_points ?? 0), 0);
    return Math.min(readinessScore + topTaskPts, 100);
  }, [tasks, readinessScore]);

  const topMatches = useMemo(() => {
    return [...investorStore.matches]
      .sort((a, b) => b.fit_score_0_to_100 - a.fit_score_0_to_100)
      .slice(0, 6);
  }, [investorStore.matches]);

  const highMatchCount = useMemo(
    () => investorStore.matches.filter((m) => m.fit_score_0_to_100 >= 80).length,
    [investorStore.matches]
  );

  const chartData = useMemo(() => {
    return scoreHistory.map((h) => ({
      date: new Date(h.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: h.score,
    }));
  }, [scoreHistory]);

  // Company info — merge startupProfile, extraction data, and apollo data
  const ed = extractionData;
  const ap = apolloData;
  const companyName = orgData?.name ?? ed?.company_name ?? user?.org_name ?? 'Your Company';
  const companyLogo = orgData?.logo_url ?? ap?.logo_url ?? null;
  const companyStage = startupProfile?.stage ?? ed?.stage ?? startup.stage;
  const companySector = startupProfile?.sector?.name ?? ed?.industry ?? ap?.industry ?? startup.sector.name ?? '';
  const companyWebsite = orgData?.website ?? startupProfile?.org?.website ?? ed?.website ?? ap?.website_url ?? null;
  const companyDescription = startupProfile?.short_summary ?? startupProfile?.pitch_summary ?? ed?.description ?? ap?.short_description ?? null;
  const elevatorPitch = (ed?.startup_kv?.initial_details?.elevator_pitch as string | undefined) ?? null;
  const companyBusinessModel = startupProfile?.business_model ?? ed?.business_model ?? ed?.revenue_model ?? null;
  const companyFoundedYear = startupProfile?.founded_year ?? ed?.founded_year ?? ap?.founded_year ?? null;
  const companyLocation = startupProfile?.hq_location
    ? [startupProfile.hq_location.city, startupProfile.hq_location.state, startupProfile.hq_location.country].filter(Boolean).join(', ')
    : ap?.city || ap?.state || ap?.country
      ? [ap?.city, ap?.state, ap?.country].filter(Boolean).join(', ')
      : ed?.hq_city || ed?.hq_state || ed?.hq_country
        ? [ed?.hq_city, ed?.hq_state, ed?.hq_country].filter(Boolean).join(', ')
        : null;
  const companySubsector = startupProfile?.subsector?.name ?? null;

  // Round target — from questionnaire (e.g. "500k_1m", "1m_5m") → human-readable
  const qd = questionnaireData;
  const roundTargetRaw: string = qd?.round_target_other || qd?.round_target || '';
  const ROUND_TARGET_LABELS: Record<string, string> = {
    under_500k: 'Under $500K',
    '500k_1m': '$500K – $1M',
    '1m_2m': '$1M – $2M',
    '1m_5m': '$1M – $5M',
    '2m_5m': '$2M – $5M',
    '5m_10m': '$5M – $10M',
    '10m_20m': '$10M – $20M',
    '20m_plus': '$20M+',
  };
  const formatRawRoundTarget = (raw: string): string => {
    // Already has a $ sign — return as-is
    if (raw.includes('$')) return raw;
    // Numeric string like "2000000" → "$2M"
    const num = Number(raw.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
      if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1)}M`;
      if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    }
    return raw;
  };
  const roundTarget = roundTargetRaw
    ? (ROUND_TARGET_LABELS[roundTargetRaw] ?? formatRawRoundTarget(roundTargetRaw))
    : null;

  // Founders — from startupProfile or extraction data
  const founders = useMemo(() => {
    if (startupProfile?.founders && startupProfile.founders.length > 0) return startupProfile.founders;
    // Fallback: try extraction data's founder_linkedin
    const fl = ed?.founder_linkedin?.data;
    if (fl?.founders && Array.isArray(fl.founders) && fl.founders.length > 0) {
      return fl.founders.map((f: Record<string, unknown>) => ({
        full_name: (f.name || f.full_name || 'Unknown') as string,
        title: (f.title || 'Co-Founder') as string,
        bio: (f.bio || f.headline || '') as string,
        linkedin_url: (f.linkedin_url || '') as string,
      }));
    }
    return [];
  }, [startupProfile?.founders, ed]);

  // Full team members (founders + leadership, deduped)
  const teamMembers = useMemo(() => {
    const fl = ed?.founder_linkedin?.data;
    const allPeople: { full_name: string; title: string; bio: string; linkedin_url: string }[] = [];
    const seen = new Set<string>();
    const addPerson = (f: Record<string, unknown>) => {
      const name = String(f.name || f.full_name || '').trim();
      const url = String(f.linkedin_url || '').trim();
      const key = url || name;
      if (!key || seen.has(key)) return;
      seen.add(key);
      allPeople.push({
        full_name: name || 'Unknown',
        title: String(f.title || f.role || 'Team') as string,
        bio: String(f.bio || f.headline || f.summary || '') as string,
        linkedin_url: url,
      });
    };
    // From founders
    if (founders.length > 0) {
      founders.forEach((f: Founder) => {
        seen.add(f.linkedin_url || f.full_name);
        allPeople.push({ full_name: f.full_name, title: f.title, bio: f.bio ?? '', linkedin_url: f.linkedin_url ?? '' });
      });
    }
    // From leadership_team
    if (fl?.leadership_team && Array.isArray(fl.leadership_team)) {
      fl.leadership_team.forEach((m: Record<string, unknown>) => addPerson(m));
    }
    // If no founders from profile, try extraction founders
    if (founders.length === 0 && fl?.founders && Array.isArray(fl.founders)) {
      fl.founders.forEach((f: Record<string, unknown>) => addPerson(f));
    }
    return allPeople;
  }, [founders, ed]);

  const tags = startupProfile?.tags ?? (Array.isArray(ed?.keywords) ? ed.keywords as string[] : []);

  // Metrics — merge startupProfile metrics with extraction data
  const profileMetrics = startupProfile?.latest_metrics;
  const headcountFallback = ed?.headcount ?? ap?.estimated_num_employees ?? null;

  // Profile completeness estimate
  const profileCompleteness = useMemo(() => {
    let filled = 0;
    const total = 5;
    if (companyName && companyName !== 'Your Company') filled++;
    if (companyLogo) filled++;
    if (companyWebsite) filled++;
    if (companyDescription) filled++;
    if (founders.length > 0) filled++;
    return Math.round((filled / total) * 100);
  }, [companyName, companyLogo, companyWebsite, companyDescription, founders]);

  // Data room completeness
  const dataRoomCompleteness = useMemo(() => {
    // Rough estimate based on document count
    const target = 10;
    return Math.min(Math.round((documentCount / target) * 100), 100);
  }, [documentCount]);

  // Hero narrative
  const heroNarrative = useMemo(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const topTask = topImpactTasks[0];
    const topTaskStr = topTask
      ? `Your biggest opportunity is "${topTask.title}" (+${topTask.potential_points ?? 0} points).`
      : 'Complete your readiness assessment to unlock personalized insights.';
    return `${greeting}, ${companyName}. You're at ${Math.round(readinessScore)}% readiness \u2014 ${scoreLabel}. ${topTaskStr}`;
  }, [companyName, readinessScore, scoreLabel, topImpactTasks]);

  return {
    user,
    isStartup,
    bootstrapLoaded,
    readinessScore,
    readinessDelta,
    scoreLabel,
    hasAssessment,
    readinessCategories,
    lowestCategories,
    tasks,
    incompleteTasks,
    topImpactTasks,
    taskCompletionRate,
    scoreProjection,
    companyName,
    companyLogo,
    companyStage,
    companySector,
    companyWebsite,
    companyDescription,
    elevatorPitch,
    companyBusinessModel,
    companyFoundedYear,
    companyLocation,
    companySubsector,
    roundTarget,
    founders,
    teamMembers,
    tags,
    metrics: {
      mrr: profileMetrics?.mrr ?? (ed?.mrr ? Number(ed.mrr) : null),
      runway_months: profileMetrics?.runway_months ?? (ed?.runway_months ? Number(ed.runway_months) : null),
      headcount: profileMetrics?.headcount ?? (headcountFallback ? Number(headcountFallback) : null),
      arr: profileMetrics?.arr ?? (ed?.arr ? Number(ed.arr) : null),
    },
    topMatches,
    highMatchCount,
    investorLoading: investorStore.loading || investorStore.status === 'generating' || investorStore.status === 'matching',
    chartData,
    scoreHistory,
    activities,
    activityLoading,
    aiAnalysis,
    fetchAiInsights,
    heroNarrative,
    topGaps,
    profileCompleteness,
    dataRoomCompleteness,
    documentCount,
  };
}
