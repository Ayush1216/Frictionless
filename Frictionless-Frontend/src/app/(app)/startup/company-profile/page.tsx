'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Edit3,
  Save,
  X,
  Loader2,
  RefreshCw,
  Sparkles,
  DollarSign,
  Users,
  FileText,
  Globe,
  Linkedin,
  Target,
  MapPin,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Phone,
  ExternalLink,
  UserPlus,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Rocket,
  CheckCircle2,
  Calendar,
  Hash,
  Link as LinkIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { QUESTIONNAIRE } from '@/lib/onboarding-questionnaire';
import Link from 'next/link';
import Image from 'next/image';
import { slugFromName } from '@/lib/founder-utils';
import { InsightPanel } from '@/components/company-profile/InsightPanel';
import { AddPersonModal } from '@/components/company-profile/AddPersonModal';
import { TeamMemberCard } from '@/components/company-profile/TeamMemberCard';
import { ExtractionChart } from '@/components/analytics/ExtractionChart';
import { TabGroup } from '@/components/ui/TabGroup';
import { StatCard } from '@/components/ui/StatCard';
import { TooltipInfo } from '@/components/ui/TooltipInfo';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonChart } from '@/components/ui/fi-skeleton';
import { getScoreColor } from '@/lib/scores';
import { isGeminiEnabled, geminiSummarize } from '@/lib/ai/gemini-client';
import {
  buildCanonicalCompanyProfile,
  getCachedCanonicalProfile,
  setCachedCanonicalProfile,
  CORE_IDENTITY_KEYS_ALREADY_SHOWN,
  type CanonicalCompanyProfile,
} from '@/lib/company-profile-canonical';
import {
  Tooltip as RadixTooltip,
  TooltipContent as RadixTooltipContent,
  TooltipTrigger as RadixTooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

type QuestionnaireRecord = {
  primary_sector?: string;
  product_status?: string;
  funding_stage?: string;
  round_target?: string;
  entity_type?: string;
  revenue_model?: string;
  primary_sector_other?: string;
  round_target_other?: string;
  entity_type_other?: string;
};

type UnifiedField = { label: string; value: string; href?: string; path?: string };

type ExtractionData = {
  startup_kv?: {
    initial_details?: Record<string, string>;
    financial_data?: Record<string, string | number>;
    founder_and_other_data?: Record<string, string | unknown[]>;
  };
  founder_linkedin?: { data?: { founders?: any[]; leadership_team?: any[] } };
  charts?: { startup_name?: string; charts?: unknown[]; kpi_cards?: unknown[] };
  meta?: {
    company_name?: string;
    company_linkedin?: string;
    last_scraped_at?: string;
    linkedin_scrape_status?: 'success' | 'failed' | 'in_progress';
    linkedin_scrape_error?: string;
  };
  ai_summary?: string;
  ai_insights?: string;
};

// ─── Animation variants ───
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: [0, 0, 0.58, 1] as const },
  }),
};

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

export default function CompanyProfilePage() {
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);

  const [extraction, setExtraction] = useState<ExtractionData | null>(null);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [questionnaireEdits, setQuestionnaireEdits] = useState<Partial<QuestionnaireRecord>>({});
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [scrapeInProgress, setScrapeInProgress] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [apollo, setApollo] = useState<Record<string, unknown> | null>(null);
  const [fillProfileLoading, setFillProfileLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [addPersonModalOpen, setAddPersonModalOpen] = useState(false);
  const [canonical, setCanonical] = useState<CanonicalCompanyProfile | null>(null);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [slowLoadHint, setSlowLoadHint] = useState(false);
  const autoFillDoneRef = useRef(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('overview');

  // ─── Helpers ───
  function displayVal(obj: Record<string, unknown> | null, key: string, fallback: string | undefined): string {
    if (!obj || obj[key] == null || obj[key] === '') return fallback ?? '';
    const v = obj[key];
    if (Array.isArray(v)) return v.filter(Boolean).join(', ');
    return String(v);
  }

  const getToken = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }, []);

  // ─── AI Generation ───
  const generateAISummary = useCallback(async (currentExtraction: ExtractionData, currentQuestionnaire: QuestionnaireRecord) => {
    const token = await getToken();
    if (!token) return;
    setAiLoading(true);
    try {
      const profileBlob = {
        extraction: JSON.stringify(currentExtraction, null, 2).slice(0, 4000),
        questionnaire: currentQuestionnaire,
      };
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: profileBlob }),
      });
      if (res.ok) {
        const data = await res.json();
        const summary = data.summary || data.text || '';
        setAiSummary(summary);
        await fetch('/api/company-profile', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ extraction_patch: { ai_summary: summary }, regenerate_readiness: false }),
        });
        if (user?.id) localStorage.setItem(`ai_summary_${user.id}`, summary);
      }
    } catch (e) { console.error('Failed to generate AI summary', e); }
    setAiLoading(false);
  }, [getToken, user?.id]);

  const generateAIInsights = useCallback(async (currentExtraction: ExtractionData, currentQuestionnaire: QuestionnaireRecord) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { extraction: currentExtraction, questionnaire: currentQuestionnaire },
          systemPrompt: 'You are a strategic business analyst. Based on the startup profile, provide a concise "Strategic Outlook" in 3 bullet points: 1. Market Opportunity, 2. Key Competitive Advantage, 3. Critical Next Milestone. Be specific.',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const insights = data.summary || data.text || '';
        setAiInsights(insights);
        await fetch('/api/company-profile', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ extraction_patch: { ai_insights: insights }, regenerate_readiness: false }),
        });
      }
    } catch (e) { console.error('Failed to generate AI insights', e); }
  }, [getToken]);

  // ─── Fetch Profile ───
  const fetchProfile = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/company-profile', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (data.extraction) {
      setExtraction(data.extraction);
      if (data.extraction.ai_summary) setAiSummary(data.extraction.ai_summary);
      else if (user?.id) { const cached = localStorage.getItem(`ai_summary_${user.id}`); if (cached) setAiSummary(cached); }
      if (data.extraction.ai_insights) setAiInsights(data.extraction.ai_insights);
      setScrapeError(data.extraction.meta?.linkedin_scrape_error ?? null);
    }
    if (data.questionnaire) setQuestionnaire(data.questionnaire);
    if (data.apollo && typeof data.apollo === 'object') {
      setApollo(data.apollo as Record<string, unknown>);
      setLinkedinUrl((prev) => prev || String((data.apollo as { linkedin_url?: string })?.linkedin_url ?? ''));
    } else { setApollo(null); }
    if (data.orgId) setOrgId(data.orgId);
    setLoading(false);
    if (data.extraction && data.questionnaire) {
      if (!data.extraction.ai_summary) {
        const cached = user?.id ? localStorage.getItem(`ai_summary_${user.id}`) : null;
        if (!cached) generateAISummary(data.extraction, data.questionnaire);
      }
      if (!data.extraction.ai_insights) generateAIInsights(data.extraction, data.questionnaire);
    }
  }, [getToken, generateAISummary, generateAIInsights, user?.id]);

  useEffect(() => {
    if (!user || user.org_type !== 'startup') { setLoading(false); return; }
    setSlowLoadHint(false);
    const t = setTimeout(() => setSlowLoadHint(true), 4000);
    fetchProfile().finally(() => { clearTimeout(t); setSlowLoadHint(false); });
  }, [user, fetchProfile]);

  // Auto-generate elevator pitch if missing
  useEffect(() => {
    if (!extraction || !questionnaire) return;
    const existing = extraction?.startup_kv?.initial_details?.elevator_pitch;
    if (existing) return; // already set
    const id = extraction?.startup_kv?.initial_details ?? {};
    const problem = (id as any).problem ?? '';
    const solution = (id as any).solution ?? '';
    const uniqueValue = (id as any).unique_value_proposition ?? (id as any).uvp ?? '';
    const productName = (id as any).product_name ?? (id as any).name ?? '';
    const targetMarket = (id as any).target_market ?? (id as any).target_customer ?? '';
    const businessModel = (id as any).business_model ?? (id as any).revenue_model ?? '';
    const traction = (id as any).traction ?? (id as any).key_metrics ?? '';
    const sector = questionnaire?.primary_sector ?? '';
    if (!problem && !solution && !uniqueValue) return; // nothing to work with
    getToken().then(async (token) => {
      if (!token) return;
      try {
        const pitchContext: Record<string, string> = { problem, solution, unique_value: uniqueValue, sector };
        if (productName) pitchContext.product_name = productName;
        if (targetMarket) pitchContext.target_market = targetMarket;
        if (businessModel) pitchContext.business_model = businessModel;
        if (traction) pitchContext.traction = traction;
        const res = await fetch('/api/ai/summary', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: pitchContext,
            systemPrompt: `You are a startup pitch expert. Write a concise 1-2 sentence elevator pitch based ONLY on the company data provided (problem, solution, unique value, target market, business model, traction). Do NOT use the organization name. Focus on: who they help, the core problem solved, and the unique value. Do NOT start with "Introducing" or "Welcome". Output ONLY the pitch text, no labels or formatting. Maximum 200 characters.`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const pitch = (data.summary || data.text || '').slice(0, 220).trim();
          if (pitch) {
            await fetch('/api/company-profile', {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ extraction_patch: { startup_kv: { initial_details: { elevator_pitch: pitch } } }, regenerate_readiness: false }),
            });
            await fetchProfile();
          }
        }
      } catch { /* silently fail */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraction?.startup_kv?.initial_details?.problem, questionnaire]);

  // Canonical merge
  useEffect(() => {
    if (!orgId || (!extraction && !apollo && !questionnaire)) { setCanonical(null); return; }
    const rawSources = { extraction: extraction ?? undefined, apollo: apollo ?? undefined, questionnaire: questionnaire ?? undefined };
    const cached = getCachedCanonicalProfile(orgId, rawSources);
    if (cached) { setCanonical(cached); return; }
    try {
      const profile = buildCanonicalCompanyProfile(rawSources);
      setCachedCanonicalProfile(orgId, rawSources, profile);
      setCanonical(profile);
    } catch { setCanonical(buildCanonicalCompanyProfile(rawSources)); }
  }, [orgId, extraction, apollo, questionnaire]);

  // Frictionless score
  useEffect(() => {
    if (!orgId) return;
    getToken().then((token) => {
      if (!token) return;
      fetch('/api/readiness/status', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          const pct = data?.scored_rubric?._overall?.raw_percentage ?? data?.score_summary?._overall?.raw_percentage;
          if (typeof pct === 'number') setReadinessScore(pct);
        })
        .catch(() => {});
    });
  }, [orgId, getToken]);

  // ─── Save / Edit Actions ───
  const saveExtractionField = async (path: string, value: string | number) => {
    const token = await getToken();
    if (!token) { toast.error('Session expired'); return; }
    setSaving(true);
    setEditingField(null);
    const keys = path.split('.');
    const patch: Record<string, unknown> = {};
    let cur = patch;
    for (let i = 0; i < keys.length - 1; i++) { const k = keys[i]; cur[k] = {}; cur = cur[k] as Record<string, unknown>; }
    cur[keys[keys.length - 1]] = value;
    try {
      const res = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction_patch: patch, regenerate_readiness: false }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Saved');
      await fetchProfile();
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const saveQuestionnaire = async () => {
    const token = await getToken();
    if (!token) return;
    if (Object.keys(questionnaireEdits).length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaire: questionnaireEdits, regenerate_readiness: false }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Saved');
      setQuestionnaire((q) => (q ? { ...q, ...questionnaireEdits } : questionnaireEdits as QuestionnaireRecord));
      setQuestionnaireEdits({});
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const regenerateFrictionless = async () => {
    const token = await getToken();
    if (!token) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_readiness: true }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Frictionless score is being recalculated. This may take a minute.');
    } catch { toast.error('Failed to regenerate Frictionless'); }
    setRegenerating(false);
  };

  const triggerRegenerateWithSave = async () => {
    const token = await getToken();
    if (!token) return;
    setRegenerating(true);
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (Object.keys(questionnaireEdits).length > 0) updates.questionnaire = questionnaireEdits;
      const res = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, regenerate_readiness: true }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Saved and recalculating Frictionless score.');
      setQuestionnaireEdits({});
      await fetchProfile();
    } catch { toast.error('Failed'); }
    setRegenerating(false);
    setSaving(false);
  };

  const triggerLinkedInScrape = async () => {
    const token = await getToken();
    if (!token) return;
    // Use manually entered URL, or fall back to stored LinkedIn URL
    const url = linkedinUrl.trim()
      || extraction?.meta?.company_linkedin
      || (apollo?.linkedin_url != null ? String(apollo.linkedin_url) : '')
      || '';
    if (!url) { toast.error('Paste a company LinkedIn URL first'); return; }
    setScrapeInProgress(true);
    setScrapeError(null);
    try {
      const res = await fetch('/api/company-profile/linkedin-scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedin_url: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error && !data.extraction_data) { setScrapeError(data.error); toast.error(data.error); return; }
      if (data.extraction_data) {
        setExtraction(data.extraction_data);
        setScrapeError(data.status === 'failed' ? data.error ?? null : null);
      }
      if (data.status === 'success') {
        toast.success('Profile updated with fresh LinkedIn data');
        setLinkedinUrl('');
        await fetchProfile();
      } else if (data.status === 'failed') toast.error(data.error || 'Scrape failed');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scrape request failed';
      setScrapeError(msg);
      toast.error(msg);
    }
    setScrapeInProgress(false);
  };

  // ─── Derived Data ───
  const initDetails = extraction?.startup_kv?.initial_details ?? {};
  const financialData = extraction?.startup_kv?.financial_data ?? {};
  const founderData = extraction?.startup_kv?.founder_and_other_data ?? {};
  const founders = extraction?.founder_linkedin?.data?.founders ?? [];
  const leadership = extraction?.founder_linkedin?.data?.leadership_team ?? [];

  // Also include people from Apollo organization data if not already in founder_linkedin
  const apolloPeople = useMemo(() => {
    const people = (apollo?.people ?? []) as any[];
    return people
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({
        full_name: p.name || p.full_name || '',
        title: p.title || '',
        linkedin_url: p.linkedin_url || '',
        bio: p.headline || p.bio || '',
        location: p.city ? [p.city, p.state, p.country].filter(Boolean).join(', ') : (p.location || ''),
      }))
      .filter((p) => p.full_name.trim());
  }, [apollo]);

  const teamMembers = useMemo(() => {
    const normName = (n: string) => (n || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const normUrl = (u: string) => (u || '').trim().toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '');
    const seen = new Map<string, boolean>();

    return [...founders, ...leadership, ...apolloPeople].filter((curr) => {
      const name = normName(curr.full_name);
      const url = normUrl(curr.linkedin_url);
      // Check both name and URL for duplicates
      if (name && seen.has(`name:${name}`)) return false;
      if (url && seen.has(`url:${url}`)) return false;
      if (name) seen.set(`name:${name}`, true);
      if (url) seen.set(`url:${url}`, true);
      return true;
    });
  }, [founders, leadership, apolloPeople]);

  const str = (v: unknown): string => (v != null && v !== '' ? String(v).trim() : '');
  const get = (key: string) => str(initDetails[key]) || '';

  const companyName = canonical?.company_name ?? extraction?.meta?.company_name ?? initDetails.name ?? (apollo?.name != null ? String(apollo.name) : '') ?? extraction?.charts?.startup_name ?? 'Your startup';
  const logoUrl = (canonical?.logo_url && canonical.logo_url !== '') ? canonical.logo_url : (apollo?.logo_url != null ? String(apollo.logo_url) : undefined);
  const apolloLocJoin = [apollo?.city, apollo?.state, apollo?.country].filter(Boolean).map(String).join(', ');
  const locationDisplay = (canonical?.location_display ?? apolloLocJoin) || initDetails.location || '';
  const linkedinForDisplay = canonical?.linkedin_url ?? (apollo?.linkedin_url != null ? String(apollo.linkedin_url) : '') ?? '';
  const websiteForBanner = canonical?.website_url ?? (apollo?.website_url != null ? String(apollo.website_url) : '') ?? get('website_url');
  const websiteForBannerHref = websiteForBanner ? (websiteForBanner.startsWith('http') ? websiteForBanner : `https://${websiteForBanner}`) : '';
  const websiteForBannerLabel = websiteForBanner.replace(/^https?:\/\//, '').split('/')[0];
  const phoneDisplay = canonical?.phone ?? (apollo?.primary_phone && typeof apollo.primary_phone === 'object' && (apollo.primary_phone as { number?: string }).number ? (apollo.primary_phone as { number: string }).number : undefined) ?? (apollo?.sanitized_phone != null ? String(apollo.sanitized_phone) : undefined);
  const keywordsDisplay = canonical?.keywords ?? [];
  const industriesDisplay = canonical?.industries ?? [];
  const overviewText = canonical?.overview_deduped ?? canonical?.short_description ?? initDetails.summary ?? initDetails.company_overview ?? (apollo?.short_description != null ? String(apollo.short_description) : undefined) ?? undefined;
  const totalFundingDisplay = canonical?.total_funding ?? (apollo?.total_funding_printed != null ? String(apollo.total_funding_printed) : (apollo?.total_funding != null ? String(apollo.total_funding) : '')) ?? '';
  const organizationRevenueDisplay = canonical?.organization_revenue ?? (apollo?.organization_revenue_printed != null ? String(apollo.organization_revenue_printed) : (apollo?.organization_revenue != null ? String(apollo.organization_revenue) : '')) ?? '';
  const hasMeaningfulRevenue = organizationRevenueDisplay.trim() !== '' && organizationRevenueDisplay.trim() !== '0' && organizationRevenueDisplay.trim() !== '0.00';
  const employeesDisplay = canonical?.estimated_num_employees ?? (apollo?.estimated_num_employees != null ? String(apollo.estimated_num_employees) : '') ?? '—';
  const foundedYearDisplay = canonical?.founded_year ?? (apollo?.founded_year != null ? String(apollo.founded_year) : '');
  const primarySectorDisplay = (() => {
    const raw = canonical?.primary_sector ?? questionnaire?.primary_sector ?? '';
    if (raw) {
      const mapped = raw.split(',').map((v: string) => {
        const trimmed = v.trim();
        return QUESTIONNAIRE.primary_sector?.options?.find((o) => o.value === trimmed)?.label ?? trimmed.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      }).join(', ');
      if (mapped) return mapped;
    }
    return canonical?.industry ?? (apollo?.industry != null ? String(apollo.industry) : '');
  })();

  // Build unified fields for Details tab
  const unifiedFields = useMemo((): UnifiedField[] => {
    const fields: UnifiedField[] = [];
    const add = (label: string, initKey: string | undefined, apolloValue: string, href?: string) => {
      const value = (initKey ? get(initKey) : '') || apolloValue;
      if (!value) return;
      const path = initKey ? `startup_kv.initial_details.${initKey}` : undefined;
      fields.push({ label, value, href, path });
    };
    const addRo = (label: string, apolloValue: string, href?: string) => add(label, undefined, apolloValue, href);

    add('Founded year', 'founded_year', canonical?.founded_year ?? str(apollo?.founded_year));
    add('Legal name', 'legal_name', str((apollo as any)?.legal_name) || str(apollo?.name) || (canonical?.company_name ?? ''));
    const linkedinVal = canonical?.linkedin_url ?? str(apollo?.linkedin_url);
    addRo('LinkedIn URL', linkedinVal, linkedinVal || undefined);
    const websiteUrlRaw = canonical?.website_url ?? str(apollo?.website_url);
    const websiteDisplay = (get('website_url') || websiteUrlRaw || '').replace(/^https?:\/\//, '').split('/')[0];
    const websiteFull = (get('website_url') || websiteUrlRaw || '').trim();
    if (websiteDisplay) add('Website', 'website_url', websiteDisplay, websiteFull ? (websiteFull.startsWith('http') ? websiteFull : `https://${websiteFull}`) : undefined);
    add('Industry', 'industry', canonical?.industry ?? str(apollo?.industry));
    add('HQ city', 'hq_city', str(apollo?.city));
    add('HQ state', 'hq_state', str(apollo?.state));
    add('HQ country', 'hq_country', str(apollo?.country));
    add('Address', 'address', canonical?.raw_address ?? str(apollo?.raw_address));
    const phoneVal = canonical?.phone ?? str(apollo?.primary_phone && typeof apollo.primary_phone === 'object' ? (apollo.primary_phone as { number?: string }).number : null) ?? str(apollo?.sanitized_phone);
    if (phoneVal) addRo('Phone', phoneVal);
    addRo('Total funding', canonical?.total_funding ?? str(apollo?.total_funding_printed) ?? str(apollo?.total_funding));
    const rev = canonical?.organization_revenue ?? str(apollo?.organization_revenue_printed) ?? str(apollo?.organization_revenue);
    if (rev && rev !== '0' && rev !== '0.00') addRo('Revenue', rev);
    add('Entity type', 'entity_type', str((apollo as any)?.entity_type));
    if (keywordsDisplay.length > 0) addRo('Keywords', keywordsDisplay.slice(0, 8).join(', '));
    if (industriesDisplay.length > 0) addRo('Industries', industriesDisplay.slice(0, 6).join(', '));

    const unifiedKeys = new Set(['founded_year', 'legal_name', 'website_url', 'industry', 'hq_city', 'hq_state', 'hq_country', 'address', 'entity_type']);
    Object.entries(initDetails).forEach(([key, val]) => {
      if (CORE_IDENTITY_KEYS_ALREADY_SHOWN.has(key) || unifiedKeys.has(key)) return;
      const v = String(val ?? '').trim();
      if (!v) return;
      fields.push({ label: key.replace(/_/g, ' '), value: v, path: `startup_kv.initial_details.${key}` });
    });

    return fields;
  }, [canonical, apollo, initDetails, keywordsDisplay, industriesDisplay]);

  const QUESTION_ORDER = ['primary_sector', 'product_status', 'funding_stage', 'round_target', 'entity_type', 'revenue_model'] as const;

  // AI auto-fill
  const apolloShortDesc = apollo?.short_description != null ? String(apollo.short_description) : '';
  const fillProfileWithAI = async () => {
    const token = await getToken();
    if (!token) return;
    setFillProfileLoading(true);
    try {
      const res = await fetch('/api/ai/fill-profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            extraction: extraction ?? undefined,
            apollo: apollo ? { short_description: apolloShortDesc || undefined, name: companyName || undefined, industry: apollo?.industry } : undefined,
          },
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast.error(err.error || 'Failed to fill profile'); return; }
      const fields = await res.json();
      const patch = {
        startup_kv: {
          initial_details: {
            problem: fields.problem ?? initDetails.problem ?? '',
            solution: fields.solution ?? initDetails.solution ?? '',
            unique_value_proposition: fields.unique_value_proposition ?? initDetails.unique_value_proposition ?? initDetails.uvp ?? '',
            why_now: fields.why_now ?? initDetails.why_now ?? '',
            traction: fields.traction ?? initDetails.traction ?? initDetails.milestones ?? '',
          },
        },
      };
      const patchRes = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraction_patch: patch, regenerate_readiness: false }),
      });
      if (!patchRes.ok) throw new Error('Save failed');
      toast.success('Profile filled from AI');
      await fetchProfile();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setFillProfileLoading(false);
  };

  const hasApolloOrExtractionForFill = Boolean(apolloShortDesc || (extraction && Object.keys(initDetails).length > 0));
  const businessFieldsEmpty = [initDetails.problem ?? initDetails.problem_statement, initDetails.solution ?? initDetails.solution_summary, initDetails.unique_value_proposition ?? initDetails.uvp, initDetails.why_now, initDetails.traction ?? initDetails.traction_summary ?? initDetails.milestones].every((v) => !String(v ?? '').trim());

  useEffect(() => {
    if (loading || fillProfileLoading) return;
    if (!extraction && !apollo) return;
    if (!hasApolloOrExtractionForFill || !businessFieldsEmpty) return;
    if (autoFillDoneRef.current) return;
    autoFillDoneRef.current = true;
    fillProfileWithAI();
  }, [loading, fillProfileLoading, extraction, apollo, hasApolloOrExtractionForFill, businessFieldsEmpty]);

  // Profile completeness
  const completenessFields = useMemo(() => [
    { label: 'Company name', filled: !!companyName },
    { label: 'Logo', filled: !!logoUrl },
    { label: 'Industry/sector', filled: !!(canonical?.primary_sector || canonical?.industry || questionnaire?.primary_sector) },
    { label: 'Elevator pitch', filled: !!initDetails.elevator_pitch },
    { label: 'Problem statement', filled: !!(canonical?.problem || initDetails.problem) },
    { label: 'Solution', filled: !!(canonical?.solution || initDetails.solution) },
    { label: 'Value proposition', filled: !!(canonical?.unique_value_proposition || initDetails.unique_value_proposition || initDetails.uvp) },
    { label: 'Executive team', filled: teamMembers.length > 0 },
    { label: 'Funding stage', filled: !!questionnaire?.funding_stage },
    { label: 'Traction/momentum', filled: !!(canonical?.traction || initDetails.traction || initDetails.traction_summary || initDetails.milestones) },
    { label: 'Location', filled: !!locationDisplay },
  ], [companyName, logoUrl, canonical, questionnaire, initDetails, teamMembers, locationDisplay]);

  const completenessPercent = Math.round((completenessFields.filter((f) => f.filled).length / completenessFields.length) * 100);

  // KPI data
  const kpiCards = (extraction?.charts?.kpi_cards ?? []) as Array<{ label: string; value: number | string; unit?: string; kpi_id?: string }>;
  const charts = (extraction?.charts?.charts ?? []) as Array<{
    chart_type: string; chart_title: string; chart_id?: string;
    series: Array<{ name: string; data: Array<{ x: string; y: number }> }>;
    unit?: string; x_axis_label?: string | null; y_axis_label?: string | null;
    insight?: string; categories?: string[];
  }>;

  const lastScrapedAt = extraction?.meta?.last_scraped_at;
  const scrapeStatus = extraction?.meta?.linkedin_scrape_status;

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'business', label: 'Business & Product' },
    { id: 'financials', label: 'Financials' },
    { id: 'team', label: 'Executive Team' },
    { id: 'details', label: 'Details' },
  ];

  // ─── Guards ───
  if (!user || user.org_type !== 'startup') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <p style={{ color: 'var(--fi-text-muted)' }}>Company Profile is for startups only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 xl:p-8 space-y-6 max-w-[1600px] mx-auto">
        <div className="space-y-2">
          <div className="fi-skeleton h-8 w-72 rounded-lg" />
          <div className="fi-skeleton h-4 w-48 rounded" />
        </div>
        <SkeletonCard />
        <div className="fi-skeleton h-10 w-full rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><SkeletonChart /></div>
          <SkeletonCard />
        </div>
        {slowLoadHint && (
          <p className="text-xs text-center" style={{ color: 'var(--fi-text-muted)' }}>
            Taking longer than usual. You may see partial data when it loads.
          </p>
        )}
      </div>
    );
  }

  if (!extraction && !questionnaire && !apollo) {
    return (
      <div className="p-8">
        <EmptyState
          icon={<Building2 className="w-12 h-12" />}
          title="No company data yet"
          description="Complete onboarding — add your website and pitch deck — to populate your company profile."
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <TooltipProvider>
      <div className="w-full min-w-0 px-4 lg:px-6 xl:px-8 max-w-[1600px] mx-auto pb-20">

        {/* ════════ HERO SECTION ════════ */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl overflow-hidden mt-6 mb-4"
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, var(--fi-bg-secondary) 0%, var(--fi-bg-primary) 100%)'
              : 'linear-gradient(135deg, var(--fi-bg-secondary) 0%, var(--fi-bg-card) 100%)',
            border: '1px solid var(--fi-border)',
          }}
        >
          {/* Top accent bar */}
          <div className="h-0.5 w-full" style={{ background: 'linear-gradient(to right, var(--fi-primary), rgba(16,185,129,0.2), transparent)' }} />

          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              {/* Logo */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="w-20 h-20 rounded-2xl object-cover shrink-0"
                  style={{ border: '2px solid var(--fi-border)' }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 text-2xl font-bold"
                  style={{
                    background: 'rgba(16,185,129,0.1)',
                    border: '2px solid var(--fi-border)',
                    color: 'var(--fi-primary)',
                  }}
                >
                  {companyName.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Name + badges */}
              <div className="min-w-0 flex-1">
                <h1
                  className="text-2xl font-bold truncate mb-2"
                  style={{ color: 'var(--fi-text-primary)' }}
                >
                  {companyName}
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {questionnaire?.funding_stage && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                      style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--fi-primary)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {(QUESTIONNAIRE.funding_stage.options.find((o) => o.value === questionnaire.funding_stage)?.label) ?? questionnaire.funding_stage}
                    </span>
                  )}
                  {locationDisplay && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium" style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-muted)', border: '1px solid var(--fi-border)' }}>
                      <MapPin className="w-3 h-3" /> {locationDisplay}
                    </span>
                  )}
                  {primarySectorDisplay && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium" style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-muted)', border: '1px solid var(--fi-border)' }}>
                      <Briefcase className="w-3 h-3" /> {primarySectorDisplay}
                    </span>
                  )}
                  {foundedYearDisplay && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium" style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-muted)', border: '1px solid var(--fi-border)' }}>
                      <Calendar className="w-3 h-3" /> Founded {foundedYearDisplay}
                    </span>
                  )}
                </div>

                {/* Info links row */}
                {(websiteForBannerLabel || linkedinForDisplay || overviewText) && (
                  <div className="flex flex-wrap items-center gap-3 mb-3 text-xs" style={{ color: 'var(--fi-text-muted)' }}>
                    {websiteForBannerLabel && (
                      <a
                        href={websiteForBannerHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:underline transition-colors"
                        style={{ color: 'var(--fi-primary)' }}
                      >
                        <Globe className="w-3 h-3" />
                        {websiteForBannerLabel}
                      </a>
                    )}
                    {linkedinForDisplay && (
                      <a
                        href={linkedinForDisplay.startsWith('http') ? linkedinForDisplay : `https://${linkedinForDisplay}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:underline transition-colors"
                        style={{ color: '#0A66C2' }}
                      >
                        <Linkedin className="w-3 h-3" />
                        LinkedIn
                      </a>
                    )}
                    {overviewText && !websiteForBannerLabel && !linkedinForDisplay && (
                      <span className="line-clamp-1 text-xs" style={{ color: 'var(--fi-text-muted)' }}>
                        {overviewText}
                      </span>
                    )}
                    {overviewText && (websiteForBannerLabel || linkedinForDisplay) && (
                      <>
                        <span style={{ color: 'var(--fi-border)' }}>|</span>
                        <span className="line-clamp-1 flex-1 min-w-0" style={{ color: 'var(--fi-text-muted)' }}>
                          {overviewText}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Stat chips row */}
                <div className="flex flex-wrap gap-3">
                  {teamMembers.length > 0 && (
                    <HeroStat icon={<Users className="w-4 h-4" />} label="Executive Team" value={String(teamMembers.length)} />
                  )}
                  {readinessScore != null && (
                    <HeroStat
                      icon={<Target className="w-4 h-4" />}
                      label="Frictionless"
                      value={`${Math.round(readinessScore)}%`}
                      valueColor={getScoreColor(readinessScore)}
                    />
                  )}
                  {completenessPercent < 100 && (
                    <HeroStat
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      label="Profile"
                      value={`${completenessPercent}%`}
                      valueColor={getScoreColor(completenessPercent)}
                    />
                  )}
                  {totalFundingDisplay && (
                    <HeroStat icon={<DollarSign className="w-4 h-4" />} label="Funding" value={totalFundingDisplay} />
                  )}
                  {hasMeaningfulRevenue && (
                    <HeroStat icon={<TrendingUp className="w-4 h-4" />} label="Revenue" value={organizationRevenueDisplay} />
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-start gap-2 shrink-0 self-start">
                <button
                  onClick={regenerateFrictionless}
                  disabled={regenerating || saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: 'var(--fi-bg-secondary)', color: 'var(--fi-text-secondary)', border: '1px solid var(--fi-border)' }}
                >
                  {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Regenerate</span>
                </button>
                <button
                  onClick={triggerRegenerateWithSave}
                  disabled={regenerating || saving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: 'var(--fi-primary)', color: '#fff' }}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save & recalculate
                </button>
              </div>
            </div>
          </div>

          {/* ── Elevator Pitch ── */}
          {(() => {
            const elevatorPitch = str(initDetails.elevator_pitch) || '';
            const path = 'startup_kv.initial_details.elevator_pitch';
            const isEditing = editingField === path;
            return (
              <div className="mt-4 pt-4 mx-1" style={{ borderTop: '1px solid var(--fi-border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fi-primary)' }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fi-text-muted)' }}>
                    Elevator Pitch
                  </span>
                  {!isEditing && (
                    <button
                      onClick={() => { setEditingField(path); setEditValue(elevatorPitch); }}
                      className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md transition-colors"
                      style={{ color: 'var(--fi-text-muted)', border: '1px solid var(--fi-border)' }}
                    >
                      <Edit3 className="w-3 h-3" />
                      {elevatorPitch ? 'Edit' : 'Add'}
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value.slice(0, 220))}
                      rows={2}
                      placeholder="One or two sentences: what you do, for whom, and why it matters..."
                      className="text-sm resize-none"
                      style={{ background: 'var(--fi-bg-secondary)', borderColor: 'var(--fi-border)', color: 'var(--fi-text-primary)' }}
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
                        {editValue.length}/220 characters
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingField(null)}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ color: 'var(--fi-text-muted)', border: '1px solid var(--fi-border)' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveExtractionField(path, editValue.trim())}
                          disabled={saving || !editValue.trim()}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: 'var(--fi-primary)', color: '#fff', opacity: (!editValue.trim() || saving) ? 0.6 : 1 }}
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : elevatorPitch ? (
                  <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--fi-text-secondary)' }}>
                    &ldquo;{elevatorPitch}&rdquo;
                  </p>
                ) : (
                  <button
                    onClick={() => { setEditingField(path); setEditValue(''); }}
                    className="text-sm italic transition-opacity hover:opacity-100"
                    style={{ color: 'var(--fi-text-muted)', opacity: 0.5 }}
                  >
                    + Add your elevator pitch (1–2 sentences)
                  </button>
                )}
              </div>
            );
          })()}

          {/* Completion bar (only if < 100%) */}
          {completenessPercent < 100 && (
            <div className="px-5 sm:px-6 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold" style={{ color: 'var(--fi-text-muted)' }}>
                  Profile {completenessPercent}% complete
                </span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${completenessPercent}%`, background: getScoreColor(completenessPercent) }}
                  />
                </div>
              </div>
            </div>
          )}
        </motion.section>

        {/* ════════ TAB NAVIGATION ════════ */}
        <div className="mb-6 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <TabGroup
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
            size="md"
          />
        </div>

        {/* ════════ MAIN CONTENT + SIDEBAR ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Main content (8/12 on desktop) ── */}
          <div className="lg:col-span-8 space-y-5">
            <AnimatePresence mode="wait">
              {/* ═══ TAB 1: OVERVIEW ═══ */}
              {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  {/* Summary cards row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SummaryCard
                      accent="var(--fi-primary)"
                      icon={<FileText className="w-4 h-4" />}
                      label="One Line Summary"
                      text={overviewText}
                      hint="one-line company overview for investors"
                    />
                    <SummaryCard
                      accent="var(--fi-score-good)"
                      icon={<Lightbulb className="w-4 h-4" />}
                      label="Solution Summary"
                      text={canonical?.solution ?? initDetails.solution ?? initDetails.solution_summary}
                      hint="product/solution description for investors"
                    />
                    <SummaryCard
                      accent="var(--fi-score-excellent)"
                      icon={<TrendingUp className="w-4 h-4" />}
                      label="Traction Summary"
                      text={canonical?.traction ?? initDetails.traction ?? initDetails.traction_summary ?? initDetails.milestones}
                      hint="traction and key metrics for investors"
                    />
                  </div>

                  {/* Problem statement */}
                  {(canonical?.problem || initDetails.problem || initDetails.problem_statement) && (
                    <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" className="fi-card">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" style={{ color: 'var(--fi-score-good)' }} />
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Problem Statement</h3>
                      </div>
                      <ExpandableTextBlock text={canonical?.problem ?? initDetails.problem ?? initDetails.problem_statement} clampLines={3} />
                    </motion.div>
                  )}

                  {/* Key metrics */}
                  {kpiCards.length > 0 && (
                    <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
                      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--fi-text-primary)' }}>Key Metrics</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
                        {kpiCards.map((kpi) => (
                          <div
                            key={kpi.kpi_id || kpi.label}
                            className="fi-card shrink-0 min-w-[160px] max-w-[200px]"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 line-clamp-2" style={{ color: 'var(--fi-text-muted)' }}>
                              {kpi.label}
                            </p>
                            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--fi-text-primary)' }}>
                              {formatKpiValue(kpi.value, kpi.unit)}
                            </p>
                            {kpi.unit && kpi.unit !== 'USD' && kpi.unit !== '%' && kpi.unit !== 'Billion USD' && (
                              <p className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>{kpi.unit}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Momentum & Milestones */}
                  {(canonical?.traction || initDetails.traction || initDetails.traction_summary || initDetails.milestones) && (
                    <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="fi-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Rocket className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Momentum & Milestones</h3>
                      </div>
                      <ExpandableTextBlock text={(canonical?.traction ?? initDetails.traction ?? initDetails.traction_summary) ?? initDetails.milestones} clampLines={4} />
                    </motion.div>
                  )}

                  {/* Market (TAM/SAM/SOM) */}
                  {(initDetails.tam || initDetails.sam || initDetails.som) && (
                    <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="fi-card">
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Market Size</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(['tam', 'sam', 'som'] as const).map((k) => {
                          const v = initDetails[k];
                          if (!v) return null;
                          return (
                            <div key={k} className="p-3 rounded-lg" style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}>
                              <p className="text-[10px] font-bold uppercase tracking-tight mb-1" style={{ color: 'var(--fi-text-muted)' }}>{k.toUpperCase()}</p>
                              <p className="text-sm break-words" style={{ color: 'var(--fi-text-primary)' }}>{String(v)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ═══ TAB 2: BUSINESS & PRODUCT ═══ */}
              {activeTab === 'business' && (
                <motion.div key="business" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BusinessCard accent="var(--fi-score-good)" icon={<AlertTriangle className="w-4 h-4" />} title="Problem" text={canonical?.problem ?? initDetails.problem} />
                    <BusinessCard accent="var(--fi-score-excellent)" icon={<Lightbulb className="w-4 h-4" />} title="Solution" text={canonical?.solution ?? initDetails.solution} />
                    <BusinessCard accent="#3B82F6" icon={<Target className="w-4 h-4" />} title="Unique Value" text={(canonical?.unique_value_proposition ?? initDetails.unique_value_proposition) ?? initDetails.uvp} />
                    <BusinessCard accent="#8B5CF6" icon={<TrendingUp className="w-4 h-4" />} title="Why Now" text={canonical?.why_now ?? initDetails.why_now} />
                  </div>

                  {/* Refresh with AI */}
                  {hasApolloOrExtractionForFill && (
                    <div className="flex justify-center">
                      <button
                        onClick={fillProfileWithAI}
                        disabled={fillProfileLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                        style={{
                          background: 'var(--fi-bg-secondary)',
                          color: 'var(--fi-primary)',
                          border: '1px solid rgba(16,185,129,0.2)',
                        }}
                      >
                        {fillProfileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {businessFieldsEmpty ? 'Fill with AI' : 'Refresh with AI'}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ TAB 3: FINANCIALS ═══ */}
              {activeTab === 'financials' && (
                <motion.div key="financials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  {/* Financial snapshot */}
                  {Object.keys(financialData).length > 0 && (
                    <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--fi-text-primary)' }}>
                        <DollarSign className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                        Financial Snapshot
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(financialData).map(([key, val]) => {
                          if (val === '' || val == null) return null;
                          const path = `startup_kv.financial_data.${key}`;
                          const isEditing = editingField === path;
                          const rawStr = String(val);
                          const lk = key.toLowerCase();
                          const isMonetary = lk.includes('usd') || lk.includes('funding') || lk.includes('revenue') || lk.includes('burn') || lk.includes('mrr') || lk.includes('arr') || lk.includes('cash') || lk.includes('round_amount') || lk.includes('valuation') || lk.includes('salary') || lk.includes('cost');
                          const isPercent = lk.includes('percent') || lk.includes('margin') || lk.includes('growth') || lk.includes('churn') || lk.includes('rate');
                          const numVal = Number(rawStr);
                          const displayValStr = (!isNaN(numVal) && rawStr.trim() !== '')
                            ? isMonetary
                              ? `$${numVal.toLocaleString('en-US')}`
                              : isPercent
                                ? `${numVal.toLocaleString('en-US')}%`
                                : numVal.toLocaleString('en-US')
                            : rawStr;
                          const isLongText = displayValStr.length > 80;
                          return (
                            <div
                              key={key}
                              className="fi-card min-h-[4.5rem]"
                            >
                              <label className="text-[10px] font-bold uppercase tracking-tighter block mb-1" style={{ color: 'var(--fi-text-muted)' }}>
                                {key.replace(/_/g, ' ')}
                              </label>
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-8 text-xs px-2"
                                    style={{ background: 'var(--fi-bg-secondary)', borderColor: 'var(--fi-border)' }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveExtractionField(path, isNaN(Number(editValue)) ? editValue : Number(editValue))}
                                    disabled={saving}
                                    className="shrink-0 w-8 h-8 rounded flex items-center justify-center"
                                    style={{ background: 'var(--fi-primary)', color: '#fff' }}
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : isLongText ? (
                                <div>
                                  <ExpandableTextBlock text={displayValStr} clampLines={3} />
                                  <button
                                    onClick={() => { setEditingField(path); setEditValue(displayValStr); }}
                                    className="inline-flex items-center gap-1 mt-1 text-xs font-medium"
                                    style={{ color: 'var(--fi-text-muted)' }}
                                  >
                                    <Edit3 className="w-3 h-3" /> Edit
                                  </button>
                                </div>
                              ) : (
                                <div
                                  className="flex items-start justify-between gap-2 group cursor-pointer"
                                  onClick={() => { setEditingField(path); setEditValue(displayValStr); }}
                                >
                                  <span className="text-sm font-bold tabular-nums break-words flex-1" style={{ color: 'var(--fi-text-primary)' }}>
                                    {displayValStr}
                                  </span>
                                  <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" style={{ color: 'var(--fi-text-muted)' }} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Charts */}
                  {charts.length > 0 && (
                    <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Charts & Projections</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-muted)' }}>
                          {charts.length} chart{charts.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {charts.map((chart, idx) => (
                          <ExtractionChart key={chart.chart_id || idx} chart={chart} index={idx} />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {Object.keys(financialData).length === 0 && charts.length === 0 && (
                    <EmptyState
                      icon={<DollarSign className="w-10 h-10" />}
                      title="No financial data yet"
                      description="Upload a pitch deck or data room documents to extract financial projections."
                    />
                  )}
                </motion.div>
              )}

              {/* ═══ TAB 5: TEAM ═══ */}
              {activeTab === 'team' && (
                <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--fi-text-primary)' }}>
                      <Users className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
                      Executive Team
                    </h3>
                    <button
                      onClick={() => setAddPersonModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--fi-primary)', border: '1px solid rgba(16,185,129,0.2)' }}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  {teamMembers.length > 0 ? (
                    <div className="space-y-4">
                      {/* Featured card for first member (CEO/Founder) */}
                      {teamMembers.length > 0 && (
                        <FeaturedTeamCard
                          key={(teamMembers[0].linkedin_url || teamMembers[0].full_name || 0).toString()}
                          name={teamMembers[0].full_name}
                          title={teamMembers[0].title}
                          location={teamMembers[0].location}
                          linkedinUrl={teamMembers[0].linkedin_url}
                          bio={teamMembers[0].headline || teamMembers[0].bio || teamMembers[0].summary}
                          confidenceScore={teamMembers[0].confidence_score}
                        />
                      )}
                      {/* Grid for remaining members */}
                      {teamMembers.length > 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                          {teamMembers.slice(1).map((f: any, i: number) => (
                            <TeamCard
                              key={(f.linkedin_url || f.full_name || i + 1).toString()}
                              name={f.full_name}
                              title={f.title}
                              location={f.location}
                              linkedinUrl={f.linkedin_url}
                              bio={f.headline || f.bio || f.summary}
                              confidenceScore={f.confidence_score}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : Object.keys(founderData).length > 0 ? (
                    <div className="fi-card">
                      <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--fi-text-muted)' }}>From pitch deck</p>
                      {Object.entries(founderData).slice(0, 4).map(([k, v]) => (
                        <div key={k} className="flex flex-col gap-0.5 mb-2">
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--fi-text-muted)' }}>{k.replace(/_/g, ' ')}</span>
                          <span className="text-xs break-words" style={{ color: 'var(--fi-text-primary)' }}>
                            {Array.isArray(v) ? (v as unknown[]).join(', ') || '—' : String(v || '—')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Users className="w-10 h-10" />}
                      title="No founders yet"
                      description='Click "Add" to add founders from LinkedIn.'
                    />
                  )}
                </motion.div>
              )}

              {/* ═══ TAB 6: DETAILS ═══ */}
              {activeTab === 'details' && (
                <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  {unifiedFields.length > 0 ? (
                    <>
                      {/* Group fields into sections */}
                      {(() => {
                        const IDENTITY_LABELS = new Set(['Legal name', 'Founded year', 'Entity type', 'Industry']);
                        const LOCATION_LABELS = new Set(['HQ city', 'HQ state', 'HQ country', 'Address']);
                        const ONLINE_LABELS = new Set(['Website', 'LinkedIn URL', 'Phone']);
                        const FINANCIAL_LABELS = new Set(['Total funding', 'Revenue']);
                        const TAG_LABELS = new Set(['Keywords', 'Industries']);

                        type SectionDef = { id: string; title: string; icon: React.ReactNode; fields: UnifiedField[] };
                        const sections: SectionDef[] = [
                          { id: 'identity', title: 'Identity', icon: <Building2 className="w-4 h-4" />, fields: [] },
                          { id: 'location', title: 'Location', icon: <MapPin className="w-4 h-4" />, fields: [] },
                          { id: 'online', title: 'Online', icon: <Globe className="w-4 h-4" />, fields: [] },
                          { id: 'financial', title: 'Financial', icon: <DollarSign className="w-4 h-4" />, fields: [] },
                          { id: 'tags', title: 'Tags', icon: <Hash className="w-4 h-4" />, fields: [] },
                          { id: 'other', title: 'Other Details', icon: <FileText className="w-4 h-4" />, fields: [] },
                        ];

                        unifiedFields.forEach((field) => {
                          if (IDENTITY_LABELS.has(field.label)) sections[0].fields.push(field);
                          else if (LOCATION_LABELS.has(field.label)) sections[1].fields.push(field);
                          else if (ONLINE_LABELS.has(field.label)) sections[2].fields.push(field);
                          else if (FINANCIAL_LABELS.has(field.label)) sections[3].fields.push(field);
                          else if (TAG_LABELS.has(field.label)) sections[4].fields.push(field);
                          else sections[5].fields.push(field);
                        });

                        const SECTION_ACCENTS: Record<string, string> = {
                          identity: 'var(--fi-primary)',
                          location: '#8B5CF6',
                          online: '#3B82F6',
                          financial: '#F59E0B',
                          tags: '#EC4899',
                          other: 'var(--fi-text-muted)',
                        };

                        return sections.filter((s) => s.fields.length > 0).map((section, sIdx) => {
                          const accent = SECTION_ACCENTS[section.id] || 'var(--fi-primary)';
                          const isTags = section.id === 'tags';

                          return (
                            <motion.div
                              key={section.id}
                              custom={sIdx}
                              variants={cardVariants}
                              initial="hidden"
                              animate="visible"
                              className="fi-card relative overflow-hidden p-0"
                            >
                              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
                              <div className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div style={{ color: accent }}>{section.icon}</div>
                                  <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{section.title}</h3>
                                </div>

                                {isTags ? (
                                  <div className="space-y-3">
                                    {section.fields.map((field) => (
                                      <div key={field.label}>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fi-text-muted)' }}>{field.label}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {field.value.split(', ').filter(Boolean).map((tag) => (
                                            <span
                                              key={tag}
                                              className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium"
                                              style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                                    {section.fields.map(({ label, value, href, path }) => {
                                      const isFieldEditing = path && editingField === path;
                                      const displayValStr = (value || '').trim() || '—';
                                      return (
                                        <div key={label} className="py-2 border-b" style={{ borderColor: 'var(--fi-border)' }}>
                                          <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--fi-text-muted)' }}>
                                            {label}
                                          </label>
                                          {path ? (
                                            isFieldEditing ? (
                                              <div className="flex flex-col gap-2">
                                                <Textarea
                                                  value={editValue}
                                                  onChange={(e) => setEditValue(e.target.value)}
                                                  className="min-h-[80px] w-full resize-y text-sm"
                                                  style={{ background: 'var(--fi-bg-secondary)', borderColor: 'var(--fi-border)' }}
                                                  autoFocus
                                                />
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() => saveExtractionField(path, editValue)}
                                                    disabled={saving}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                    style={{ background: 'var(--fi-primary)', color: '#fff' }}
                                                  >
                                                    <Save className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    onClick={() => setEditingField(null)}
                                                    className="px-3 py-1.5 rounded-lg text-xs"
                                                    style={{ color: 'var(--fi-text-muted)' }}
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div
                                                className="flex items-start justify-between gap-2 group cursor-pointer"
                                                onClick={() => { setEditingField(path); setEditValue(displayValStr); }}
                                              >
                                                {href ? (
                                                  <a
                                                    href={href.startsWith('http') ? href : `https://${href}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm break-all flex-1 min-w-0 hover:underline inline-flex items-center gap-1"
                                                    style={{ color: 'var(--fi-primary)' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    {section.id === 'online' && <ExternalLink className="w-3 h-3 shrink-0" />}
                                                    {displayValStr}
                                                  </a>
                                                ) : (
                                                  <span className="text-sm break-words flex-1 min-w-0 font-medium" style={{ color: 'var(--fi-text-primary)' }}>{displayValStr}</span>
                                                )}
                                                <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" style={{ color: 'var(--fi-text-muted)' }} />
                                              </div>
                                            )
                                          ) : (
                                            <div>
                                              {href ? (
                                                <a
                                                  href={href.startsWith('http') ? href : `https://${href}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-sm break-all hover:underline inline-flex items-center gap-1"
                                                  style={{ color: 'var(--fi-primary)' }}
                                                >
                                                  {section.id === 'online' && <ExternalLink className="w-3 h-3 shrink-0" />}
                                                  {displayValStr}
                                                </a>
                                              ) : (
                                                <span className="text-sm break-words font-medium" style={{ color: 'var(--fi-text-primary)' }}>{displayValStr}</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        });
                      })()}
                    </>
                  ) : (
                    <EmptyState
                      icon={<FileText className="w-10 h-10" />}
                      title="No details available"
                      description="Add company details through onboarding or LinkedIn import."
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right Sidebar (4/12 on desktop) ── */}
          <div className="lg:col-span-4 space-y-4">
            {/* AI Insights */}
            <InsightPanel
              structured={canonical?.ai_insights_structured ?? null}
              aiInsightsDeduped={canonical?.ai_insights_deduped ?? null}
              aiSummary={canonical?.ai_summary ?? aiSummary ?? null}
              defaultExpanded={false}
              headerAction={
                <button
                  onClick={() => extraction && questionnaire && generateAIInsights(extraction, questionnaire).then(() => fetchProfile())}
                  disabled={aiLoading}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--fi-primary)' }}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
              }
            />

            {/* LinkedIn Re-scrape */}
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="fi-card"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--fi-text-primary)' }}>
                <Linkedin className="w-4 h-4" style={{ color: '#0A66C2' }} />
                Refresh from LinkedIn
              </h3>
              {/* Show stored URL as a badge if available */}
              {(extraction?.meta?.company_linkedin || linkedinForDisplay) && !linkedinUrl && (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded-lg text-[11px]" style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)', color: 'var(--fi-text-muted)' }}>
                  <Linkedin className="w-3 h-3 shrink-0" style={{ color: '#0A66C2' }} />
                  <span className="truncate flex-1 min-w-0">
                    {(extraction?.meta?.company_linkedin || linkedinForDisplay).replace(/^https?:\/\/(www\.)?/, '')}
                  </span>
                </div>
              )}
              <p className="text-[11px] mb-2" style={{ color: 'var(--fi-text-muted)' }}>
                {(extraction?.meta?.company_linkedin || linkedinForDisplay) ? 'Re-scrape to refresh founder & leadership data.' : 'Paste LinkedIn URL to import data.'}
              </p>
              <Input
                placeholder="https://linkedin.com/company/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="mb-2 h-8 text-xs"
                style={{ background: 'var(--fi-bg-secondary)', borderColor: 'var(--fi-border)' }}
              />
              {(scrapeError || scrapeStatus === 'failed') && (
                <p className="text-xs mb-2" style={{ color: 'var(--fi-score-need-improvement)' }}>
                  {extraction?.meta?.linkedin_scrape_error || scrapeError}
                </p>
              )}
              {lastScrapedAt && scrapeStatus === 'success' && (
                <p className="text-[10px] mb-2" style={{ color: 'var(--fi-score-excellent)' }}>
                  Last scraped: {new Date(lastScrapedAt).toLocaleString()}
                </p>
              )}
              {(() => {
                const hasStoredUrl = !!(extraction?.meta?.company_linkedin || linkedinForDisplay);
                const canScrape = !scrapeInProgress && (!!linkedinUrl.trim() || hasStoredUrl);
                return (
                  <button
                    onClick={triggerLinkedInScrape}
                    disabled={!canScrape}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: 'var(--fi-primary)',
                      color: '#fff',
                      opacity: canScrape ? 1 : 0.5,
                    }}
                  >
                    {scrapeInProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {scrapeInProgress ? 'Scraping...' : 'Re-scrape'}
                  </button>
                );
              })()}
            </motion.div>

            {/* Company Information (formerly Frictionless Signals) */}
            {questionnaire && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="fi-card"
              >
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: 'var(--fi-text-primary)' }}>
                  <Globe className="w-4 h-4" style={{ color: '#6366F1' }} />
                  {companyName} Information
                </h3>
                <div className="space-y-3">
                  {QUESTION_ORDER.map((key) => {
                    const q = QUESTIONNAIRE[key];
                    const currentVal = (questionnaireEdits[key] ?? questionnaire[key]) as string | undefined;
                    const options = q?.options ?? [];
                    const isMulti = (q as { multiSelect?: boolean }).multiSelect === true;
                    // For multi-select, parse comma-separated stored values
                    const selectedValues = isMulti
                      ? (currentVal || '').split(',').map((v) => v.trim()).filter(Boolean)
                      : [];
                    return (
                      <div key={key} className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-tight" style={{ color: 'var(--fi-text-muted)' }}>
                          {q?.question}
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {options.map((o) => {
                            const isSelected = isMulti
                              ? selectedValues.includes(o.value)
                              : currentVal === o.value;
                            return (
                              <button
                                key={o.value}
                                onClick={() => {
                                  if (isMulti) {
                                    const next = isSelected
                                      ? selectedValues.filter((v) => v !== o.value)
                                      : [...selectedValues, o.value];
                                    setQuestionnaireEdits((p) => ({ ...p, [key]: next.join(',') }));
                                  } else {
                                    setQuestionnaireEdits((p) => ({ ...p, [key]: o.value }));
                                  }
                                }}
                                className="px-2 py-0.5 rounded-md text-[11px] font-medium transition-all"
                                style={{
                                  background: isSelected ? 'var(--fi-primary)' : 'var(--fi-bg-secondary)',
                                  color: isSelected ? '#fff' : 'var(--fi-text-muted)',
                                  border: `1px solid ${isSelected ? 'var(--fi-primary)' : 'var(--fi-border)'}`,
                                }}
                              >
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(questionnaireEdits).length > 0 && (
                    <button
                      onClick={saveQuestionnaire}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: '#6366F1', color: '#fff' }}
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Apply changes
                    </button>
                  )}
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* Add Person Modal */}
        <AddPersonModal
          open={addPersonModalOpen}
          onOpenChange={setAddPersonModalOpen}
          getToken={getToken}
          onSuccess={(person, extractionData, status) => {
            if (extractionData) setExtraction(extractionData as ExtractionData);
            toast.success(status === 'already_exists' ? 'Already in team list' : 'Person added');
            fetchProfile();
          }}
        />
      </div>
    </TooltipProvider>
  );
}


// ═══════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════

function HeroStat({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
      style={{ background: 'var(--fi-bg-tertiary)', border: '1px solid var(--fi-border)' }}
    >
      <div style={{ color: 'var(--fi-primary)', opacity: 0.7 }}>{icon}</div>
      <div>
        <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--fi-text-muted)' }}>{label}</p>
        <p
          className="text-sm font-bold leading-tight truncate max-w-[120px]"
          style={{ color: valueColor || 'var(--fi-text-primary)' }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ accent, icon, label, text, hint }: { accent: string; icon: React.ReactNode; label: string; text?: string | null; hint?: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    const raw = (text || '').trim();
    if (!raw || ran.current) return;
    ran.current = true;

    if (!isGeminiEnabled()) {
      setSummary(raw);
      return;
    }

    setLoading(true);
    geminiSummarize(raw, hint)
      .then((s) => setSummary(s))
      .catch(() => setSummary(raw))
      .finally(() => setLoading(false));
  }, [text, hint]);

  const display = (summary ?? (text || '').trim()) || '—';

  return (
    <motion.div
      custom={0}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="fi-card relative overflow-hidden p-0 flex flex-col"
      style={{ minHeight: '96px' }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <div style={{ color: accent }}>{icon}</div>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--fi-text-muted)' }}>{label}</span>
        </div>
        {loading ? (
          <div className="space-y-1.5 mt-1">
            <div className="fi-skeleton h-3 w-full rounded" />
            <div className="fi-skeleton h-3 w-4/5 rounded" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>
            {display}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function BusinessCard({ accent, icon, title, text }: { accent: string; icon: React.ReactNode; title: string; text?: string | null }) {
  return (
    <motion.div
      custom={0}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="fi-card relative overflow-hidden p-0"
      style={{ minHeight: '12rem' }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div style={{ color: accent }}>{icon}</div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{title}</h3>
        </div>
        <ExpandableTextBlock text={text} clampLines={4} />
      </div>
    </motion.div>
  );
}

function ExpandableTextBlock({ text, clampLines = 4, maxExpandedHeight = 200 }: { text?: string | null; clampLines?: number; maxExpandedHeight?: number }) {
  const [expanded, setExpanded] = useState(false);
  const content = (text || '').trim() || '—';
  const needsToggle = content.length > 120;

  return (
    <div className="flex flex-col min-w-0">
      {expanded ? (
        <div className="overflow-y-auto" style={{ maxHeight: maxExpandedHeight }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--fi-text-secondary)' }}>
            {content}
          </p>
        </div>
      ) : (
        <p
          className="text-sm leading-relaxed break-words overflow-hidden"
          style={{
            color: 'var(--fi-text-secondary)',
            display: '-webkit-box',
            WebkitLineClamp: clampLines,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {content}
        </p>
      )}
      {needsToggle && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-medium self-start inline-flex items-center gap-1"
          style={{ color: 'var(--fi-primary)' }}
        >
          {expanded ? <>Read less <ChevronUp className="w-3.5 h-3.5" /></> : <>Read more <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      )}
    </div>
  );
}

function getTeamInitials(name?: string): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

const ROLE_ACCENTS: Record<string, string> = {
  ceo: '#10B981',
  founder: '#10B981',
  'co-founder': '#10B981',
  cto: '#3B82F6',
  coo: '#8B5CF6',
  cfo: '#F59E0B',
  vp: '#6366F1',
  director: '#EC4899',
};

function getRoleAccent(title?: string): string {
  if (!title) return 'var(--fi-primary)';
  const lower = title.toLowerCase();
  for (const [key, color] of Object.entries(ROLE_ACCENTS)) {
    if (lower.includes(key)) return color;
  }
  return 'var(--fi-primary)';
}

function FeaturedTeamCard({ name, title, location, linkedinUrl, bio, confidenceScore }: {
  name?: string; title?: string; location?: string; linkedinUrl?: string; bio?: string; confidenceScore?: number;
}) {
  const slug = slugFromName(name);
  const initial = getTeamInitials(name);
  const accent = getRoleAccent(title);

  return (
    <Link href={`/startup/founders/${slug}`} className="block group">
      <motion.div
        custom={0}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="fi-card relative overflow-hidden p-0"
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${accent}, transparent)` }} />
        <div className="p-5 flex flex-col sm:flex-row gap-4">
          {/* Avatar with gradient ring */}
          <div className="shrink-0 self-start">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl"
              style={{
                background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
                color: accent,
                boxShadow: `0 0 0 3px ${accent}33, 0 0 0 6px ${accent}11`,
              }}
            >
              {initial}
            </div>
          </div>
          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-bold truncate" style={{ color: 'var(--fi-text-primary)' }}>{name || 'Unknown'}</h4>
              {linkedinUrl && (
                <a
                  href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 p-1 rounded-md transition-colors hover:bg-[rgba(10,102,194,0.1)]"
                >
                  <Linkedin className="w-3.5 h-3.5" style={{ color: '#0A66C2' }} />
                </a>
              )}
            </div>
            {title && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold mb-2"
                style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
              >
                {title}
              </span>
            )}
            {location && (
              <p className="text-xs flex items-center gap-1 mb-1" style={{ color: 'var(--fi-text-muted)' }}>
                <MapPin className="w-3 h-3" /> {location}
              </p>
            )}
            {bio && (
              <p className="text-xs leading-relaxed line-clamp-2 mt-1" style={{ color: 'var(--fi-text-secondary)' }}>{bio}</p>
            )}
            {confidenceScore != null && confidenceScore > 0 && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium" style={{ color: accent }}>
                <CheckCircle2 className="w-3 h-3" /> {(confidenceScore * 100).toFixed(0)}% verified
              </span>
            )}
          </div>
          {/* Arrow hint */}
          <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-4 h-4" style={{ color: 'var(--fi-text-muted)' }} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function TeamCard({ name, title, location, linkedinUrl, bio, confidenceScore }: {
  name?: string; title?: string; location?: string; linkedinUrl?: string; bio?: string; confidenceScore?: number;
}) {
  const slug = slugFromName(name);
  const initial = getTeamInitials(name);
  const accent = getRoleAccent(title);

  return (
    <Link href={`/startup/founders/${slug}`} className="block group">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15 }}
        className="fi-card fi-card-interactive p-4 flex flex-col items-center text-center gap-2"
      >
        {/* Avatar with gradient ring */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm"
          style={{
            background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
            color: accent,
            boxShadow: `0 0 0 2px ${accent}33, 0 0 0 4px ${accent}11`,
          }}
        >
          {initial}
        </div>
        <div className="min-w-0 w-full">
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--fi-text-primary)' }}>
              {name || 'Unknown'}
            </p>
            {linkedinUrl && (
              <a
                href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 p-0.5 rounded transition-colors hover:bg-[rgba(10,102,194,0.1)]"
              >
                <Linkedin className="w-3 h-3" style={{ color: '#0A66C2' }} />
              </a>
            )}
          </div>
          {title && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold mt-1"
              style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}
            >
              {title}
            </span>
          )}
          {location && (
            <p className="text-[11px] mt-1 truncate flex items-center justify-center gap-1" style={{ color: 'var(--fi-text-muted)' }}>
              <MapPin className="w-2.5 h-2.5" /> {location}
            </p>
          )}
          {bio && (
            <p className="text-[11px] leading-relaxed line-clamp-2 mt-1" style={{ color: 'var(--fi-text-secondary)' }}>{bio}</p>
          )}
          {confidenceScore != null && confidenceScore > 0 && (
            <span className="inline-flex items-center gap-1 mt-1 text-[10px]" style={{ color: accent }}>
              <CheckCircle2 className="w-2.5 h-2.5" /> {(confidenceScore * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

function formatKpiValue(value: number | string, unit?: string): string {
  if (unit === 'USD' || unit === 'Billion USD') {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return String(value);
    if (unit === 'Billion USD') return `$${num}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
    return `$${num.toLocaleString()}`;
  }
  if (unit === '%') return `${value}%`;
  return String(value);
}
