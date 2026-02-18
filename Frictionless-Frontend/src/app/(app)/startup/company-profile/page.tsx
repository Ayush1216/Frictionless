'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { QUESTIONNAIRE } from '@/lib/onboarding-questionnaire';
import Link from 'next/link';
import { slugFromName } from '@/lib/founder-utils';
import { ProfileCard, ProfileCardExpandableBody } from '@/components/company-profile/ProfileCard';
import { SectionCard } from '@/components/company-profile/SectionCard';
import { MetaChips } from '@/components/company-profile/MetaChips';
import { ExpandableText } from '@/components/company-profile/ExpandableText';
import { InsightPanel } from '@/components/company-profile/InsightPanel';
import { AddPersonModal } from '@/components/company-profile/AddPersonModal';
import { TeamMemberCard } from '@/components/company-profile/TeamMemberCard';
import {
  buildCanonicalCompanyProfile,
  getCachedCanonicalProfile,
  setCachedCanonicalProfile,
  CORE_IDENTITY_KEYS_ALREADY_SHOWN,
  type CanonicalCompanyProfile,
} from '@/lib/company-profile-canonical';

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

/** One row in More company details: value = editable if set, else Apollo/company fallback. path = save path when editable. */
type UnifiedField = { label: string; value: string; href?: string; path?: string };

function CoreIdentityAccordion({
  fields,
  defaultOpen = true,
  editingField,
  editValue,
  setEditingField,
  setEditValue,
  saveExtractionField,
  saving,
}: {
  fields: UnifiedField[];
  defaultOpen?: boolean;
  editingField: string | null;
  editValue: string;
  setEditingField: (v: string | null) => void;
  setEditValue: (v: string) => void;
  saveExtractionField: (path: string, value: string | number) => Promise<void>;
  saving: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full gap-2 p-5 pb-3 border-b border-border text-left hover:bg-muted/30 transition-colors"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          More company details
        </h3>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {open && fields.length > 0 && (
        <div className="p-5 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {fields.map(({ label, value, href, path }) => {
              const isEditing = path && editingField === path;
              const displayVal = (value || '').trim() || '—';
              return (
                <div key={label} className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
                  {path ? (
                    isEditing ? (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="min-h-[100px] w-full resize-y bg-muted border-primary/50 text-sm"
                          placeholder="Enter text…"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => saveExtractionField(path, editValue)} disabled={saving}><Save className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3 group rounded-xl px-4 py-3 bg-muted/30 border border-transparent hover:border-border cursor-pointer text-left" onClick={() => { setEditingField(path); setEditValue(displayVal); }}>
                        {href ? (
                          <a href={href.startsWith('http') ? href : `https://${href}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            {displayVal}
                          </a>
                        ) : (
                          <span className="text-sm text-foreground break-words flex-1 min-w-0">{displayVal}</span>
                        )}
                        <Edit3 className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl px-4 py-3 bg-muted/30 border border-border">
                      {href ? (
                        <a href={href.startsWith('http') ? href : `https://${href}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                          {displayVal}
                        </a>
                      ) : (
                        <span className="text-sm text-foreground break-words">{displayVal}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

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

export default function CompanyProfilePage() {
  const user = useAuthStore((s) => s.user);
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
  /** Canonical UI model (cross-source merge, UI only; never written to DB) */
  const [canonical, setCanonical] = useState<CanonicalCompanyProfile | null>(null);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);
  const [slowLoadHint, setSlowLoadHint] = useState(false);
  const autoFillDoneRef = useRef(false);

  function simpleHash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h.toString(36);
  }

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
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: profileBlob }),
      });
      if (res.ok) {
        const data = await res.json();
        const summary = data.summary || data.text || '';
        setAiSummary(summary);
        
        // Save to DB
        await fetch('/api/company-profile', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            extraction_patch: { ai_summary: summary },
            regenerate_readiness: false,
          }),
        });
        
        // Save to localStorage
        if (user?.id) {
          localStorage.setItem(`ai_summary_${user.id}`, summary);
        }
      }
    } catch (e) {
      console.error('Failed to generate AI summary', e);
    }
    setAiLoading(false);
  }, [getToken, user?.id]);

  const generateAIInsights = useCallback(async (currentExtraction: ExtractionData, currentQuestionnaire: QuestionnaireRecord) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          context: { extraction: currentExtraction, questionnaire: currentQuestionnaire },
          systemPrompt: 'You are a strategic business analyst. Based on the startup profile, provide a concise "Strategic Outlook" in 3 bullet points: 1. Market Opportunity, 2. Key Competitive Advantage, 3. Critical Next Milestone. Be specific.'
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
    } catch (e) {
      console.error('Failed to generate AI insights', e);
    }
  }, [getToken]);

  const fetchProfile = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/company-profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (data.extraction) {
      setExtraction(data.extraction);
      if (data.extraction.ai_summary) {
        setAiSummary(data.extraction.ai_summary);
      } else if (user?.id) {
        const cached = localStorage.getItem(`ai_summary_${user.id}`);
        if (cached) setAiSummary(cached);
      }
      if (data.extraction.ai_insights) {
        setAiInsights(data.extraction.ai_insights);
      }
      setScrapeError(data.extraction.meta?.linkedin_scrape_error ?? null);
    }
    if (data.questionnaire) setQuestionnaire(data.questionnaire);
    if (data.apollo && typeof data.apollo === 'object') {
      setApollo(data.apollo as Record<string, unknown>);
      setLinkedinUrl((prev) => prev || String((data.apollo as { linkedin_url?: string })?.linkedin_url ?? ''));
    } else {
      setApollo(null);
    }
    if (data.orgId) setOrgId(data.orgId);
    setLoading(false);

    if (data.extraction && data.questionnaire) {
      if (!data.extraction.ai_summary) {
        const cached = user?.id ? localStorage.getItem(`ai_summary_${user.id}`) : null;
        if (!cached) generateAISummary(data.extraction, data.questionnaire);
      }
      if (!data.extraction.ai_insights) {
        generateAIInsights(data.extraction, data.questionnaire);
      }
    }
  }, [getToken, generateAISummary, generateAIInsights, user?.id]);

  useEffect(() => {
    if (!user || user.org_type !== 'startup') {
      setLoading(false);
      return;
    }
    setSlowLoadHint(false);
    const t = setTimeout(() => setSlowLoadHint(true), 4000);
    fetchProfile().finally(() => {
      clearTimeout(t);
      setSlowLoadHint(false);
    });
  }, [user, fetchProfile]);

  // Cross-source canonical merge (cached 24h). UI only; never writes to DB.
  useEffect(() => {
    if (!orgId || (!extraction && !apollo && !questionnaire)) {
      setCanonical(null);
      return;
    }
    const rawSources = { extraction: extraction ?? undefined, apollo: apollo ?? undefined, questionnaire: questionnaire ?? undefined };
    const cached = getCachedCanonicalProfile(orgId, rawSources);
    if (cached) {
      setCanonical(cached);
      return;
    }
    try {
      const profile = buildCanonicalCompanyProfile(rawSources);
      setCachedCanonicalProfile(orgId, rawSources, profile);
      setCanonical(profile);
    } catch {
      setCanonical(buildCanonicalCompanyProfile(rawSources));
    }
  }, [orgId, extraction, apollo, questionnaire]);

  // Optional: fetch readiness score for hero KPI strip
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

  const saveExtractionField = async (path: string, value: string | number) => {
    const token = await getToken();
    if (!token) {
      toast.error('Session expired');
      return;
    }
    setSaving(true);
    setEditingField(null);
    const keys = path.split('.');
    const patch: Record<string, unknown> = {};
    let cur = patch;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      cur[k] = {};
      cur = cur[k] as Record<string, unknown>;
    }
    cur[keys[keys.length - 1]] = value;
    try {
      const res = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extraction_patch: patch,
          regenerate_readiness: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Saved');
      await fetchProfile();
    } catch {
      toast.error('Failed to save');
    }
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
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionnaire: questionnaireEdits,
          regenerate_readiness: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Saved');
      setQuestionnaire((q) => (q ? { ...q, ...questionnaireEdits } : questionnaireEdits as QuestionnaireRecord));
      setQuestionnaireEdits({});
    } catch {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const regenerateReadiness = async () => {
    const token = await getToken();
    if (!token) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regenerate_readiness: true,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Readiness score is being recalculated. This may take a minute.');
    } catch {
      toast.error('Failed to regenerate readiness');
    }
    setRegenerating(false);
  };

  const triggerRegenerateWithSave = async () => {
    const token = await getToken();
    if (!token) return;
    setRegenerating(true);
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (Object.keys(questionnaireEdits).length > 0) {
        updates.questionnaire = questionnaireEdits;
      }
      const res = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          regenerate_readiness: true,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Saved and recalculating readiness score. This may take a minute.');
      setQuestionnaireEdits({});
      await fetchProfile();
    } catch {
      toast.error('Failed');
    }
    setRegenerating(false);
    setSaving(false);
  };

  const triggerLinkedInScrape = async () => {
    const token = await getToken();
    if (!token) return;
    const url = linkedinUrl.trim();
    if (!url) {
      toast.error('Paste a company LinkedIn URL first');
      return;
    }
    setScrapeInProgress(true);
    setScrapeError(null);
    try {
      const res = await fetch('/api/company-profile/linkedin-scrape', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkedin_url: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error && !data.extraction_data) {
        setScrapeError(data.error);
        toast.error(data.error);
        return;
      }
      if (data.extraction_data) {
        setExtraction(data.extraction_data);
        setScrapeError(data.status === 'failed' ? data.error ?? null : null);
      }
      if (data.status === 'success') {
        toast.success('Profile updated with fresh LinkedIn data');
      } else if (data.status === 'failed') {
        toast.error(data.error || 'Scrape failed');
      }
      setLinkedinUrl('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scrape request failed';
      setScrapeError(msg);
      toast.error(msg);
    }
    setScrapeInProgress(false);
  };

  const initDetails = extraction?.startup_kv?.initial_details ?? {};
  const financialData = extraction?.startup_kv?.financial_data ?? {};
  const founderData = extraction?.startup_kv?.founder_and_other_data ?? {};
  const founders = extraction?.founder_linkedin?.data?.founders ?? [];
  const leadership = extraction?.founder_linkedin?.data?.leadership_team ?? [];
  
  // Deduplicate team members based on full_name or linkedin_url
  const teamMembers = [...founders, ...leadership].reduce((acc: any[], curr) => {
    const exists = acc.find(m => 
      (m.full_name && curr.full_name && m.full_name === curr.full_name) || 
      (m.linkedin_url && curr.linkedin_url && m.linkedin_url === curr.linkedin_url)
    );
    if (!exists) acc.push(curr);
    return acc;
  }, []);

  const apolloLinkedIn = apollo?.linkedin_url != null ? String(apollo.linkedin_url) : '';
  const companyName = canonical?.company_name ?? extraction?.meta?.company_name ?? initDetails.name ?? (apollo?.name != null ? String(apollo.name) : '') ?? extraction?.charts?.startup_name ?? 'Your startup';
  const logoUrl = (canonical?.logo_url && canonical.logo_url !== '') ? canonical.logo_url : (apollo?.logo_url != null ? String(apollo.logo_url) : undefined);
  const apolloLocJoin = [apollo?.city, apollo?.state, apollo?.country].filter(Boolean).map(String).join(', ');
  const locationFallback = (apolloLocJoin || initDetails.location || '') as string;
  const locationDisplay = (canonical?.location_display ?? locationFallback);
  const linkedinForDisplay = canonical?.linkedin_url ?? apolloLinkedIn ?? '';
  const rawAddress = canonical?.raw_address ?? (apollo?.raw_address != null && apollo.raw_address !== '' ? String(apollo.raw_address) : undefined);
  const phoneDisplay = canonical?.phone ?? (apollo?.primary_phone && typeof apollo.primary_phone === 'object' && (apollo.primary_phone as { number?: string }).number ? (apollo.primary_phone as { number: string }).number : undefined) ?? (apollo?.sanitized_phone != null ? String(apollo.sanitized_phone) : undefined);
  const keywordsDisplay = canonical?.keywords ?? [];
  const industriesDisplay = canonical?.industries ?? [];
  const overviewText = canonical?.overview_deduped ?? canonical?.short_description ?? initDetails.summary ?? initDetails.company_overview ?? (apollo?.short_description != null ? String(apollo.short_description) : undefined) ?? undefined;

  const str = (v: unknown): string => (v != null && v !== '' ? String(v).trim() : '');
  const get = (key: string) => str(initDetails[key]) || '';
  const unifiedFields: UnifiedField[] = [];
  const add = (label: string, initKey: string | undefined, apolloValue: string, href?: string) => {
    const value = (initKey ? get(initKey) : '') || apolloValue;
    if (!value) return;
    const path = initKey ? `startup_kv.initial_details.${initKey}` : undefined;
    unifiedFields.push({ label, value, href, path });
  };
  const addRo = (label: string, apolloValue: string, href?: string) => add(label, undefined, apolloValue, href);

  add('Founded year', 'founded_year', canonical?.founded_year ?? str(apollo?.founded_year));
  const legalNameApollo = str((apollo as { legal_name?: string })?.legal_name) || str(apollo?.name) || (canonical?.company_name ?? '');
  add('Legal name', 'legal_name', legalNameApollo);
  add('Team size', 'team_size', canonical?.estimated_num_employees ?? str(apollo?.estimated_num_employees));
  const linkedinVal = canonical?.linkedin_url ?? str(apollo?.linkedin_url);
  addRo('LinkedIn URL', linkedinVal, linkedinVal || undefined);
  const websiteUrlRaw = canonical?.website_url ?? str(apollo?.website_url);
  const websiteDomain = str(apollo?.primary_domain) || (websiteUrlRaw && websiteUrlRaw.replace(/^https?:\/\//, '').split('/')[0]) || '';
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
  add('Entity type', 'entity_type', str((apollo as { entity_type?: string })?.entity_type));
  if (keywordsDisplay.length > 0) addRo('Keywords', keywordsDisplay.slice(0, 8).join(', '));
  if (industriesDisplay.length > 0) addRo('Industries', industriesDisplay.slice(0, 6).join(', '));

  const unifiedKeys = new Set(['founded_year', 'legal_name', 'team_size', 'website_url', 'industry', 'hq_city', 'hq_state', 'hq_country', 'address', 'entity_type']);
  Object.entries(initDetails).forEach(([key, val]) => {
    if (CORE_IDENTITY_KEYS_ALREADY_SHOWN.has(key) || unifiedKeys.has(key)) return;
    const v = String(val ?? '').trim();
    if (!v) return;
    unifiedFields.push({
      label: key.replace(/_/g, ' '),
      value: v,
      path: `startup_kv.initial_details.${key}`,
    });
  });

  const QUESTION_ORDER = ['primary_sector', 'product_status', 'funding_stage', 'round_target', 'entity_type', 'revenue_model'] as const;

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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to fill profile');
        return;
      }
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
    setFillProfileLoading(false);
  };

  const hasApolloOrExtractionForFill = Boolean(apolloShortDesc || (extraction && Object.keys(initDetails).length > 0));
  const businessFieldsEmpty = [initDetails.problem, initDetails.solution, initDetails.unique_value_proposition ?? initDetails.uvp, initDetails.why_now, initDetails.traction ?? initDetails.milestones].every((v) => !String(v ?? '').trim());

  // Auto-fill business fields with AI when profile loads and those fields are empty (no need to wait for user to click)
  useEffect(() => {
    if (loading || fillProfileLoading) return;
    if (!extraction && !apollo) return;
    if (!hasApolloOrExtractionForFill || !businessFieldsEmpty) return;
    if (autoFillDoneRef.current) return;
    autoFillDoneRef.current = true;
    fillProfileWithAI();
  }, [loading, fillProfileLoading, extraction, apollo, hasApolloOrExtractionForFill, businessFieldsEmpty]);

  if (!user || user.org_type !== 'startup') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Company Profile is for startups only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading company profile…</p>
        {slowLoadHint && (
          <p className="text-xs text-muted-foreground/80">Taking longer than usual. You may see partial data when it loads.</p>
        )}
      </div>
    );
  }

  if (!extraction && !questionnaire && !apollo) {
    return (
      <div className="p-8 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">No company data yet</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Complete onboarding—add your website and pitch deck—to populate your company profile.
        </p>
      </div>
    );
  }

  const lastScrapedAt = extraction?.meta?.last_scraped_at;
  const scrapeStatus = extraction?.meta?.linkedin_scrape_status;

  // Profile completeness score
  const completenessFields = [
    { label: 'Company name', filled: !!companyName },
    { label: 'Logo', filled: !!logoUrl },
    { label: 'Industry/sector', filled: !!(canonical?.primary_sector || canonical?.industry || questionnaire?.primary_sector) },
    { label: 'Problem statement', filled: !!(canonical?.problem || initDetails.problem) },
    { label: 'Solution', filled: !!(canonical?.solution || initDetails.solution) },
    { label: 'Value proposition', filled: !!(canonical?.unique_value_proposition || initDetails.unique_value_proposition || initDetails.uvp) },
    { label: 'Team members', filled: teamMembers.length > 0 },
    { label: 'Funding stage', filled: !!questionnaire?.funding_stage },
    { label: 'Traction/momentum', filled: !!(canonical?.traction || initDetails.traction || initDetails.milestones) },
    { label: 'Location', filled: !!locationDisplay },
  ];
  const completenessFilledCount = completenessFields.filter((f) => f.filled).length;
  const completenessPercent = Math.round((completenessFilledCount / completenessFields.length) * 100);

  const totalFundingDisplay = canonical?.total_funding ?? (apollo?.total_funding_printed != null ? String(apollo.total_funding_printed) : (apollo?.total_funding != null ? String(apollo.total_funding) : '')) ?? '';
  const organizationRevenueDisplay = canonical?.organization_revenue ?? (apollo?.organization_revenue_printed != null ? String(apollo.organization_revenue_printed) : (apollo?.organization_revenue != null ? String(apollo.organization_revenue) : '')) ?? '';
  const hasMeaningfulRevenue = organizationRevenueDisplay.trim() !== '' && organizationRevenueDisplay.trim() !== '0' && organizationRevenueDisplay.trim() !== '0.00';
  const employeesDisplay = canonical?.estimated_num_employees ?? (apollo?.estimated_num_employees != null ? String(apollo.estimated_num_employees) : '') ?? '—';
  const foundedYearDisplay = canonical?.founded_year ?? (apollo?.founded_year != null ? String(apollo.founded_year) : '');
  const primarySectorDisplay = canonical?.primary_sector ?? canonical?.industry ?? (questionnaire?.primary_sector ? (QUESTIONNAIRE.primary_sector?.options?.find((o) => o.value === questionnaire.primary_sector)?.label ?? questionnaire.primary_sector) : '') ?? (apollo?.industry != null ? String(apollo.industry) : '');

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 max-w-[1600px] mx-auto pb-20">
      {/* Hero: strong top spacing, title visible */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-12 sm:pt-16 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
      >
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
            Company Profile
          </h1>
          <p className="text-base text-muted-foreground max-w-xl">
            Your startup&apos;s unified view across all data sources.
          </p>
          {/* Profile Completeness */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${completenessPercent >= 80 ? 'bg-score-excellent' : completenessPercent >= 50 ? 'bg-score-good' : 'bg-score-fair'}`}
                  style={{ width: `${completenessPercent}%` }}
                />
              </div>
              <span className={`text-sm font-mono font-bold ${completenessPercent >= 80 ? 'text-score-excellent' : completenessPercent >= 50 ? 'text-score-good' : 'text-score-fair'}`}>
                {completenessPercent}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {completenessFilledCount}/{completenessFields.length} fields complete
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button variant="outline" size="sm" onClick={regenerateReadiness} disabled={regenerating || saving} className="border-border text-muted-foreground hover:bg-muted">
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Regenerate readiness</span>
          </Button>
          <Button variant="outline" size="sm" onClick={triggerRegenerateWithSave} disabled={regenerating || saving} className="border-primary/40 text-primary hover:bg-primary/10">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="ml-2">Save & recalculate</span>
          </Button>
        </div>
      </motion.header>

      {/* Hero card: company name, logo, badges, KPI strip */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border border-border/50 bg-gradient-to-br from-muted/90 via-muted/60 to-background/80 p-6 sm:p-8 mb-8 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-24 h-24 rounded-2xl border-2 border-primary/30 object-cover shrink-0 shadow-lg" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-muted border-2 border-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="w-12 h-12 text-primary/80" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground truncate">{companyName}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {questionnaire?.funding_stage && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {(QUESTIONNAIRE.funding_stage.options.find((o) => o.value === questionnaire.funding_stage)?.label) ?? questionnaire.funding_stage}
                </span>
              )}
              {locationDisplay && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/80 text-muted-foreground border border-border/50">
                  <MapPin className="w-3.5 h-3.5" />
                  {locationDisplay}
                </span>
              )}
              {primarySectorDisplay && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/80 text-muted-foreground border border-border/50">
                  <Briefcase className="w-3.5 h-3.5" />
                  {primarySectorDisplay}
                </span>
              )}
              {foundedYearDisplay && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/80 text-muted-foreground border border-border/50">
                  Founded {foundedYearDisplay}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50">
          {employeesDisplay && employeesDisplay !== '—' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
              <Users className="w-5 h-5 text-primary/80" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Employees</p>
                <p className="text-sm font-bold text-foreground">{employeesDisplay}</p>
              </div>
            </div>
          )}
          {totalFundingDisplay && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
              <DollarSign className="w-5 h-5 text-emerald-500/80" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Funding</p>
                <p className="text-sm font-bold text-foreground truncate">{totalFundingDisplay || '—'}</p>
              </div>
            </div>
          )}
          {readinessScore != null && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
              <Target className="w-5 h-5 text-amber-500/80" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Readiness</p>
                <p className="text-sm font-bold text-foreground">{Math.round(readinessScore)}%</p>
              </div>
            </div>
          )}
          {hasMeaningfulRevenue && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
              <TrendingUp className="w-5 h-5 text-emerald-500/80" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Revenue</p>
                <p className="text-sm font-bold text-foreground truncate">{organizationRevenueDisplay}</p>
              </div>
            </div>
          )}
          {(canonical?.traction ?? initDetails.traction ?? initDetails.milestones) && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
              <TrendingUp className="w-5 h-5 text-amber-500/80" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Momentum</p>
                <p className="text-sm font-bold text-foreground">Tracked</p>
              </div>
            </div>
          )}
        </div>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* What this company does: single narrative from canonical (deduped; no repeat of Business or AI) */}
          <SectionCard title="What this company does" icon={FileText}>
            <ExpandableText
              text={overviewText ?? undefined}
              clampLines={4}
            />
          </SectionCard>

          {/* Business & Product: AI fill when empty */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground">Business & Product</h3>
            {hasApolloOrExtractionForFill && (
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
                onClick={fillProfileWithAI}
                disabled={fillProfileLoading}
              >
                {fillProfileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span className="ml-2">{businessFieldsEmpty ? 'Fill with AI' : 'Refresh with AI'}</span>
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileCard title="Problem" icon={AlertTriangle} minHeightRem={12}>
              <ProfileCardExpandableBody text={canonical?.problem ?? initDetails.problem} clampLines={3} />
            </ProfileCard>
            <ProfileCard title="Solution" icon={Lightbulb} minHeightRem={12}>
              <ProfileCardExpandableBody text={canonical?.solution ?? initDetails.solution} clampLines={3} />
            </ProfileCard>
            <ProfileCard title="Unique value" icon={Target} minHeightRem={12}>
              <ProfileCardExpandableBody text={(canonical?.unique_value_proposition ?? initDetails.unique_value_proposition) ?? initDetails.uvp} clampLines={3} />
            </ProfileCard>
            <ProfileCard title="Why now" icon={TrendingUp} minHeightRem={12}>
              <ProfileCardExpandableBody text={canonical?.why_now ?? initDetails.why_now} clampLines={3} />
            </ProfileCard>
          </div>

          {/* Market (TAM/SAM/SOM) */}
          {(initDetails.tam || initDetails.sam || initDetails.som) && (
            <ProfileCard title="Market" icon={Globe} minHeightRem={10}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['tam', 'sam', 'som'] as const).map((k) => {
                  const v = initDetails[k];
                  if (!v) return null;
                  return (
                    <div key={k} className="p-3 rounded-xl bg-muted/30 border border-border">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{k}</p>
                      <p className="text-sm text-foreground break-words mt-1">{String(v)}</p>
                    </div>
                  );
                })}
              </div>
            </ProfileCard>
          )}

          {/* Momentum / Traction */}
          <ProfileCard title="Momentum & milestones" icon={TrendingUp} minHeightRem={10}>
            <ProfileCardExpandableBody text={(canonical?.traction ?? initDetails.traction) ?? initDetails.milestones} clampLines={4} />
          </ProfileCard>

          {/* More company details: single list, editable value or company data fallback; no duplicate fields */}
          {unifiedFields.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/50 bg-muted/40 overflow-hidden"
            >
              <CoreIdentityAccordion
                fields={unifiedFields}
                defaultOpen={true}
                editingField={editingField}
                editValue={editValue}
                setEditingField={setEditingField}
                setEditValue={setEditValue}
                saveExtractionField={saveExtractionField}
                saving={saving}
              />
            </motion.section>
          )}

          {/* Financial snapshot (editable); long text uses read more to keep cards even */}
          {Object.keys(financialData).length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/50 bg-muted/40 overflow-hidden"
            >
              <div className="flex items-center gap-2 p-5 pb-3 border-b border-border">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">Financial snapshot</h3>
              </div>
              <div className="p-5 pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.entries(financialData).map(([key, val]) => {
                    if (val === '' || val == null) return null;
                    const path = `startup_kv.financial_data.${key}`;
                    const isEditing = editingField === path;
                    const displayVal = typeof val === 'number' ? String(val) : String(val);
                    const isLongText = typeof val === 'string' && displayVal.length > 80;
                    const longTextKeys = ['financial_notes', 'notes', 'description', 'comment'];
                    const useReadMore = isLongText || longTextKeys.includes(key.toLowerCase());
                    return (
                      <div key={key} className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border min-w-0 min-h-[4.5rem]">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter block">{key.replace(/_/g, ' ')}</label>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="bg-muted h-8 text-xs px-2" autoFocus />
                            <Button size="sm" className="h-8 w-8 p-0" onClick={() => saveExtractionField(path, isNaN(Number(editValue)) ? editValue : Number(editValue))} disabled={saving}><Save className="w-3 h-3" /></Button>
                          </div>
                        ) : useReadMore ? (
                          <div>
                            <ProfileCardExpandableBody text={displayVal} clampLines={3} emptyPlaceholder="—" />
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
                              onClick={() => { setEditingField(path); setEditValue(displayVal); }}
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2 group cursor-pointer min-h-[2rem]" onClick={() => { setEditingField(path); setEditValue(displayVal); }}>
                            <span className="text-sm font-mono font-bold text-foreground break-words flex-1 min-w-0">{displayVal}</span>
                            <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* AI Insights: structured summary + max 3 unique bullets per section; distinct from strengths */}
          <InsightPanel
            structured={canonical?.ai_insights_structured ?? null}
            aiInsightsDeduped={canonical?.ai_insights_deduped ?? null}
            aiSummary={canonical?.ai_summary ?? aiSummary ?? null}
            headerAction={
              <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 -mr-1" onClick={() => extraction && questionnaire && generateAIInsights(extraction, questionnaire).then(() => fetchProfile())} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-1">Refresh</span>
              </Button>
            }
          />

          {/* LinkedIn re-scrape (pre-filled from Apollo when available) */}
          <motion.section
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-border/50 bg-muted/40 p-5"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Linkedin className="w-5 h-5 text-primary" />
              Refresh from LinkedIn
            </h3>
            {linkedinForDisplay && (
              <p className="text-xs text-muted-foreground mb-2">Company LinkedIn is used below. Edit if needed and re-scrape to refresh founder & leadership data.</p>
            )}
            {!linkedinForDisplay && (
              <p className="text-xs text-muted-foreground mb-2">Paste a company LinkedIn URL to re-scrape founder & leadership data.</p>
            )}
            <Input
              placeholder="https://linkedin.com/company/..."
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="bg-muted border-border mb-3"
            />
            {(scrapeError || scrapeStatus === 'failed') && (
              <p className="text-xs text-red-400 mb-2">{extraction?.meta?.linkedin_scrape_error || scrapeError}</p>
            )}
            {lastScrapedAt && scrapeStatus === 'success' && (
              <p className="text-xs text-emerald-500/90 mb-2">Last scraped: {new Date(lastScrapedAt).toLocaleString()}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={triggerLinkedInScrape} disabled={scrapeInProgress || !linkedinUrl.trim()}>
                {scrapeInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2">{scrapeInProgress ? 'Scraping…' : 'Re-scrape'}</span>
              </Button>
              {scrapeStatus === 'failed' && (
                <Button size="sm" variant="outline" onClick={triggerLinkedInScrape} disabled={scrapeInProgress}>Retry</Button>
              )}
            </div>
          </motion.section>

          {/* Team: always show when we have profile so user can add first person */}
          {(extraction || questionnaire) && (
            <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-border/50 bg-muted/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Founders & team
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => setAddPersonModalOpen(true)}
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="ml-2">Add person</span>
                </Button>
              </div>
              {teamMembers.length > 0 ? (
                <ul className="space-y-3 list-none p-0 m-0">
                  {teamMembers.slice(0, 8).map((f: any, i: number) => (
                    <TeamMemberCard
                      key={(f.linkedin_url || f.full_name || i).toString()}
                      full_name={f.full_name}
                      title={f.title}
                      location={f.location}
                      profile_image_url={f.profile_image_url}
                      linkedin_url={f.linkedin_url}
                      index={i}
                      founder={f}
                      extraction={extraction}
                      getToken={getToken}
                      onImageSynced={fetchProfile}
                      confidence_score={f.confidence_score}
                      evidence_links={f.evidence_links}
                    />
                  ))}
                </ul>
              ) : Object.keys(founderData).length > 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">From pitch deck</p>
                  {Object.entries(founderData).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground">{k.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-foreground break-words">{Array.isArray(v) ? (v as unknown[]).join(', ') || '—' : String(v || '—')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No team members yet. Click &quot;Add person&quot; to add from a LinkedIn profile.</p>
              )}
            </motion.section>
          )}

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

          {/* Readiness questionnaire */}
          {questionnaire && (
            <motion.section initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-border/50 bg-muted/40 p-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-indigo-400" />
                Readiness signals
              </h3>
              <div className="space-y-4">
                {QUESTION_ORDER.map((key) => {
                  const q = QUESTIONNAIRE[key];
                  const currentVal = (questionnaireEdits[key] ?? questionnaire[key]) as string | undefined;
                  const options = q?.options ?? [];
                  return (
                    <div key={key} className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">{q?.question}</label>
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setQuestionnaireEdits((p) => ({ ...p, [key]: o.value }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${currentVal === o.value ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground border border-border'}`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {Object.keys(questionnaireEdits).length > 0 && (
                  <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500" onClick={saveQuestionnaire} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Apply changes
                  </Button>
                )}
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}
