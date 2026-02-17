/**
 * Cross-source canonical merge pipeline for Company Profile (UI only).
 * Merges extraction, apollo, questionnaire (and any other profile JSONs) into one canonical UI model.
 * Never writes back to DB. Includes provenance (selected_source, confidence, alternatives).
 * Structured AI insights: max 3 unique bullets per section, similarity filter across sections.
 */

export const PIPELINE_VERSION = 3;

/** Source priority: higher index = lower priority when resolving conflicts */
export const SOURCE_PRIORITY_ORDER = [
  'manual',
  'questionnaire',
  'apollo',
  'linkedin',
  'extraction_meta',
  'ai',
] as const;

export type SourceLabel = (typeof SOURCE_PRIORITY_ORDER)[number];

export interface FieldProvenance {
  selected_value: string | number | null;
  selected_source: SourceLabel;
  alternative_values: Array<{ value: string | number; source: SourceLabel }>;
  confidence: 'high' | 'medium' | 'low';
}

/** Structured AI insights: one summary, max 3 unique bullets per category; no overlap between strengths and next actions */
export interface AIInsightsStructured {
  summary: string | null;
  key_strengths: string[];
  top_risks: string[];
  suggested_next_actions: string[];
}

/** Keys in initial_details that are already shown in Overview / Business & Product — hide from Core Identity to avoid repeats */
export const CORE_IDENTITY_KEYS_ALREADY_SHOWN = new Set([
  'name',
  'summary',
  'company_overview',
  'problem',
  'solution',
  'unique_value_proposition',
  'uvp',
  'why_now',
  'traction',
  'milestones',
  'location',
  'tam',
  'sam',
  'som',
]);

export interface CanonicalCompanyProfile {
  company_name: string;
  logo_url: string | null;
  short_description: string | null;
  location_display: string | null;
  industry: string | null;
  primary_sector: string | null;
  founded_year: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  phone: string | null;
  raw_address: string | null;
  estimated_num_employees: string | null;
  total_funding: string | null;
  organization_revenue: string | null;
  keywords: string[];
  industries: string[];
  problem: string | null;
  solution: string | null;
  unique_value_proposition: string | null;
  why_now: string | null;
  traction: string | null;
  overview_deduped: string | null;
  ai_insights_deduped: string | null;
  ai_insights_structured: AIInsightsStructured;
  ai_summary: string | null;
  provenance: Record<string, FieldProvenance>;
  mode: 'canonical' | 'fallback';
}

// ─── Normalization (cross-source semantic equivalence) ────────────────────

/** Normalize text for comparison: trim, collapse whitespace, lowercase, strip trailing punctuation */
export function normalizeText(value: string): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,;&]+\s*$/g, '')
    .toLowerCase();
}

/** Normalize geography/location aliases (US, USA, United States, etc.) */
export function normalizeLocation(value: string): string {
  const v = normalizeText(value);
  const aliases: Record<string, string> = {
    'us': 'United States',
    'usa': 'United States',
    'u.s.': 'United States',
    'u.s.a.': 'United States',
    'united states of america': 'United States',
    'uk': 'United Kingdom',
    'u.k.': 'United Kingdom',
    'united kingdom': 'United Kingdom',
  };
  return aliases[v] ?? v;
}

/** Normalize taxonomy (sector/industry/keyword): & vs and, plural/singular, synonyms */
export function normalizeTaxonomy(value: string): string {
  let v = normalizeText(value);
  v = v.replace(/\s*&\s*/g, ' and ');
  if (v.endsWith('s') && v.length > 3) v = v.slice(0, -1);
  const synonyms: Record<string, string> = {
    'health and wellness': 'health wellness',
    'health & wellness': 'health wellness',
    'healthcare': 'health',
    'fintech': 'financial technology',
    'saas': 'software as a service',
  };
  return synonyms[v] ?? v;
}

/** Display formatting for chips: Title Case, normalize &/and, trim punctuation */
export function formatChipLabel(s: string): string {
  let v = String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*[,;]+\s*$/g, '');
  v = v.replace(/\s*&\s*/g, ' & ');
  const titleCase = (t: string) =>
    t.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return titleCase(v);
}

/** Semantic equivalence for short strings (normalized + taxonomy/location aware) */
export function areSemanticallyEquivalent(a: string, b: string, kind: 'text' | 'location' | 'taxonomy'): boolean {
  if (!a || !b) return false;
  const normA = kind === 'location' ? normalizeLocation(a) : kind === 'taxonomy' ? normalizeTaxonomy(a) : normalizeText(a);
  const normB = kind === 'location' ? normalizeLocation(b) : kind === 'taxonomy' ? normalizeTaxonomy(b) : normalizeText(b);
  if (normA === normB) return true;
  if (normA.length < 4 || normB.length < 4) return false;
  const wordsA = new Set(normA.split(/\s+/));
  const wordsB = new Set(normB.split(/\s+/));
  const overlap = Array.from(wordsA).filter((w) => wordsB.has(w)).length;
  const minLen = Math.min(wordsA.size, wordsB.size);
  return minLen > 0 && overlap / minLen >= 0.8;
}

// ─── Collect candidates from all sources ────────────────────────────────────

type RawSources = {
  extraction?: Record<string, unknown> | null;
  apollo?: Record<string, unknown> | null;
  questionnaire?: Record<string, unknown> | null;
};


// ─── Resolve by priority + confidence ───────────────────────────────────────

export interface Candidate {
  value: string | number;
  source: SourceLabel;
}

export function resolveByPriorityAndConfidence(
  candidates: Candidate[],
  sourcePriority: readonly SourceLabel[]
): { value: string | number; source: SourceLabel; alternatives: Candidate[] } {
  const order = sourcePriority as unknown as string[];
  const bySource = candidates.filter((c) => c.value !== '' && c.value != null);
  bySource.sort((a, b) => order.indexOf(a.source) - order.indexOf(b.source));
  const chosen = bySource[0];
  const alternatives = bySource.slice(1);
  return {
    value: chosen?.value ?? '',
    source: (chosen?.source ?? 'ai') as SourceLabel,
    alternatives: alternatives.map((a) => ({ value: a.value, source: a.source })),
  };
}

// ─── Cross-source dedupe (keywords, industries, tags) ────────────────────────

export function dedupeAcrossSources(
  allItems: string[],
  kind: 'text' | 'taxonomy' = 'taxonomy'
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of allItems) {
    const normalized = kind === 'taxonomy' ? normalizeTaxonomy(item) : normalizeText(item);
    if (!normalized) continue;
    let isDup = false;
    for (const n of Array.from(seen)) {
      if (areSemanticallyEquivalent(n, item, kind) || normalized === (kind === 'taxonomy' ? normalizeTaxonomy(n) : normalizeText(n))) {
        isDup = true;
        break;
      }
    }
    if (isDup) continue;
    seen.add(normalized);
    result.push(String(item).trim().replace(/\s+/g, ' '));
  }
  return result;
}

// ─── Dedupe overlapping sentences between overview and AI insights ───────────

function sentenceTokenize(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

export function removeOverlappingFragments(overview: string, aiText: string): { overviewClean: string; aiClean: string } {
  const overviewSents = sentenceTokenize(overview);
  const aiSents = sentenceTokenize(aiText);
  const overviewSet = new Set(overviewSents.map(normalizeText));
  const aiSet = new Set(aiSents.map(normalizeText));
  const aiFiltered = aiSents.filter((s) => {
    const n = normalizeText(s);
    if (overviewSet.has(n)) return false;
    for (const o of Array.from(overviewSet)) {
      if (areSemanticallyEquivalent(o, s, 'text')) return false;
    }
    return true;
  });
  const overviewFiltered = overviewSents.filter((s) => {
    const n = normalizeText(s);
    for (const a of Array.from(aiSet)) {
      if (n === a || areSemanticallyEquivalent(a, s, 'text')) return false;
    }
    return true;
  });
  return {
    overviewClean: overviewFiltered.join('. ').trim() || overview,
    aiClean: aiFiltered.join('. ').trim() || aiText,
  };
}

/** True if two bullets are near-identical (same meaning, minor wording change) */
function bulletsSimilarity(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na.length < 20 || nb.length < 20) return na === nb;
  if (na === nb) return true;
  const wordsA = new Set(na.split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(/\s+/).filter((w) => w.length > 2));
  const overlap = Array.from(wordsA).filter((w) => wordsB.has(w)).length;
  const minSize = Math.min(wordsA.size, wordsB.size);
  return minSize > 0 && overlap / minSize >= 0.7;
}

/** Parse AI insights text into bullets; heuristic split into strengths / risks / actions */
function parseAIInsightsBullets(text: string): { strengths: string[]; risks: string[]; actions: string[] } {
  const lines = text
    .split(/\n/)
    .map((l) => l.replace(/^\s*[-*•]\s*|\d+\.\s*/g, '').trim())
    .filter((l) => l.length > 12);
  const riskWords = /risk|concern|challenge|weak|gap|lack|uncertain|caution|threat/i;
  const actionWords = /next|recommend|suggest|consider|should|action|step|focus|priority|improve|strengthen/i;
  const strengths: string[] = [];
  const risks: string[] = [];
  const actions: string[] = [];
  for (const line of lines) {
    if (riskWords.test(line)) risks.push(line);
    else if (actionWords.test(line)) actions.push(line);
    else strengths.push(line);
  }
  if (strengths.length === 0 && lines.length > 0) strengths.push(...lines.slice(0, 2));
  return { strengths, risks, actions };
}

const MAX_INSIGHT_BULLETS = 3;

/** Dedupe list and limit to max; optionally exclude bullets similar to another list */
function dedupeAndLimit(
  items: string[],
  max: number,
  excludeSimilarTo?: string[]
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (result.length >= max) break;
    const n = normalizeText(item);
    if (!n || seen.has(n)) continue;
    if (excludeSimilarTo?.some((e) => bulletsSimilarity(item, e))) continue;
    let dup = false;
    for (const r of result) {
      if (bulletsSimilarity(item, r)) {
        dup = true;
        break;
      }
    }
    if (dup) continue;
    seen.add(n);
    result.push(item);
  }
  return result;
}

/** Build structured AI insights: summary (1 para), max 3 unique each; strengths vs next actions distinct */
export function buildStructuredAIInsights(
  aiSummary: string | null,
  aiInsightsRaw: string | null
): AIInsightsStructured {
  const summary =
    (aiSummary && aiSummary.trim().length > 0
      ? aiSummary.trim().replace(/^["']|["']$/g, '').slice(0, 500)
      : null) || null;
  const raw = [aiInsightsRaw, aiSummary].filter(Boolean).join('\n');
  const { strengths, risks, actions } = parseAIInsightsBullets(raw);
  const key_strengths = dedupeAndLimit(strengths, MAX_INSIGHT_BULLETS);
  const top_risks = dedupeAndLimit(risks, MAX_INSIGHT_BULLETS);
  const suggested_next_actions = dedupeAndLimit(actions, MAX_INSIGHT_BULLETS, key_strengths);
  return {
    summary,
    key_strengths,
    top_risks,
    suggested_next_actions,
  };
}

/** Remove from overview any sentence that repeats problem/solution/why_now/uvp/traction */
function removeOverviewSentencesRepeatingBusinessFields(
  overviewSentences: string[],
  init: Record<string, string>
): string[] {
  const businessValues = [
    init.problem,
    init.solution,
    init.unique_value_proposition,
    init.uvp,
    init.why_now,
    init.traction,
    init.milestones,
    init.summary,
    init.company_overview,
  ]
    .filter(Boolean)
    .map((s) => (s ?? '').trim())
    .filter((s) => s.length > 15);
  return overviewSentences.filter((s) => {
    const n = normalizeText(s);
    for (const b of businessValues) {
      if (!b) continue;
      if (n === normalizeText(b)) return false;
      if (areSemanticallyEquivalent(n, b, 'text')) return false;
    }
    return true;
  });
}

// ─── Build canonical profile from all sources ────────────────────────────────

function priority(): SourceLabel[] {
  return [...SOURCE_PRIORITY_ORDER];
}

function getInitDetails(extraction: Record<string, unknown> | null): Record<string, string> {
  const kv = extraction?.startup_kv as Record<string, unknown> | undefined;
  return (kv?.initial_details as Record<string, string>) ?? {};
}

function getMeta(extraction: Record<string, unknown> | null): Record<string, unknown> {
  return (extraction?.meta as Record<string, unknown>) ?? {};
}

export function buildCanonicalCompanyProfile(rawSources: RawSources): CanonicalCompanyProfile {
  const { extraction, apollo, questionnaire } = rawSources;
  const init = getInitDetails(extraction ?? null);
  const meta = getMeta(extraction ?? null);
  const provenance: Record<string, FieldProvenance> = {};

  const company_name: string = String(
    (init.name && String(init.name)) ||
    (meta.company_name && String(meta.company_name)) ||
    (extraction?.charts && (extraction.charts as Record<string, unknown>)?.startup_name && String((extraction.charts as Record<string, unknown>).startup_name)) ||
    (apollo?.name && String(apollo.name)) ||
    'Your startup'
  );

  const apolloLoc = [apollo?.city, apollo?.state, apollo?.country].filter(Boolean).map(String).join(', ');
  const location_display = init.location || apolloLoc || null;

  const short_description =
    (apollo?.short_description && String(apollo.short_description)) ||
    init.summary ||
    init.company_overview ||
    (extraction?.ai_summary && String(extraction.ai_summary)) ||
    null;

  const industry = (apollo?.industry && String(apollo.industry)) || (questionnaire?.primary_sector ?? null) || null;
  const primary_sector = questionnaire?.primary_sector ?? industry;

  const keywordsRaw: string[] = [];
  if (Array.isArray(apollo?.keywords)) keywordsRaw.push(...(apollo.keywords as string[]).map(String));
  if (Array.isArray(apollo?.industries)) keywordsRaw.push(...(apollo.industries as string[]).map(String));
  const industriesRaw: string[] = [];
  if (Array.isArray(apollo?.industries)) industriesRaw.push(...(apollo.industries as string[]).map(String));
  const extractionAny = extraction as Record<string, unknown> | undefined;
  const consolidatedKeywords = (extractionAny?.keywords as string[]) ?? [];
  const consolidatedIndustries = (extractionAny?.industries as string[]) ?? [];
  keywordsRaw.push(...consolidatedKeywords);
  industriesRaw.push(...consolidatedIndustries);

  const keywordsDeduped = dedupeAcrossSources(keywordsRaw, 'taxonomy');
  const industriesDeduped = dedupeAcrossSources(industriesRaw, 'taxonomy');
  const keywords = keywordsDeduped.map(formatChipLabel);
  const industries = industriesDeduped.map(formatChipLabel);

  const overviewRaw = short_description || '';
  const aiSummaryRaw = (extraction?.ai_summary && String(extraction.ai_summary)) || '';
  const aiInsightsRaw = (extraction?.ai_insights && String(extraction.ai_insights)) || '';
  const aiTextForDedupe = String(aiInsightsRaw || aiSummaryRaw || '');
  const { overviewClean, aiClean } = removeOverlappingFragments(String(overviewRaw), aiTextForDedupe);
  const overviewSentences = sentenceTokenize(overviewClean || overviewRaw);
  const overviewNoBusinessRepeat = removeOverviewSentencesRepeatingBusinessFields(overviewSentences, init);
  const overviewFinal = overviewNoBusinessRepeat.length > 0 ? overviewNoBusinessRepeat.join('. ').trim() : (overviewClean || overviewRaw || null);
  const ai_insights_structured = buildStructuredAIInsights(
    extraction?.ai_summary ? String(extraction.ai_summary) : null,
    aiClean || aiInsightsRaw || null
  );

  return {
    company_name: String(company_name),
    logo_url: apollo?.logo_url != null ? String(apollo.logo_url) : null,
    short_description: (overviewFinal || short_description) != null ? String(overviewFinal || short_description) : null,
    location_display: (location_display || apolloLoc) != null ? String(location_display || apolloLoc) : null,
    industry: industry != null ? String(industry) : null,
    primary_sector: primary_sector != null ? String(primary_sector) : null,
    founded_year: apollo?.founded_year != null ? String(apollo.founded_year) : null,
    linkedin_url: (apollo?.linkedin_url != null ? String(apollo.linkedin_url) : null) ?? (meta.company_linkedin ? String(meta.company_linkedin) : null),
    website_url: apollo?.website_url != null ? String(apollo.website_url) : null,
    phone: (() => {
      const fromObj = apollo?.primary_phone && typeof apollo.primary_phone === 'object' && (apollo.primary_phone as { number?: string }).number;
      const fromSanitized = apollo?.sanitized_phone != null ? String(apollo.sanitized_phone) : null;
      const raw = fromObj || fromSanitized;
      return raw != null ? String(raw) : null;
    })(),
    raw_address: apollo?.raw_address != null ? String(apollo.raw_address) : null,
    estimated_num_employees: apollo?.estimated_num_employees != null ? String(apollo.estimated_num_employees) : null,
    total_funding: (apollo?.total_funding_printed != null ? String(apollo.total_funding_printed) : null) ?? (apollo?.total_funding != null ? String(apollo.total_funding) : null),
    organization_revenue: (apollo?.organization_revenue_printed != null ? String(apollo.organization_revenue_printed) : null) ?? (apollo?.organization_revenue != null ? String(apollo.organization_revenue) : null),
    keywords,
    industries,
    problem: init.problem || null,
    solution: init.solution || null,
    unique_value_proposition: init.unique_value_proposition || init.uvp || null,
    why_now: init.why_now || null,
    traction: init.traction || init.milestones || null,
    overview_deduped: overviewFinal || null,
    ai_insights_deduped: aiClean || null,
    ai_insights_structured,
    ai_summary: extraction?.ai_summary ? String(extraction.ai_summary) : null,
    provenance,
    mode: 'canonical',
  };
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const CACHE_PREFIX = 'companyProfileCanonical';
const TTL_MS = 24 * 60 * 60 * 1000;

function combinedSourcesHash(raw: RawSources): string {
  const str = JSON.stringify({ e: raw.extraction, a: raw.apollo, q: raw.questionnaire });
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function cacheKey(companyId: string, sourcesHash: string): string {
  return `${CACHE_PREFIX}::${companyId}::${sourcesHash}::${PIPELINE_VERSION}`;
}

export function getCachedCanonicalProfile(
  companyId: string,
  rawSources: RawSources
): CanonicalCompanyProfile | null {
  if (!companyId) return null;
  try {
    const hash = combinedSourcesHash(rawSources);
    const key = cacheKey(companyId, hash);
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CanonicalCompanyProfile & { expiresAt?: number };
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) return null;
    const { expiresAt: _, ...profile } = parsed;
    return profile as CanonicalCompanyProfile;
  } catch {
    return null;
  }
}

export function setCachedCanonicalProfile(
  companyId: string,
  rawSources: RawSources,
  profile: CanonicalCompanyProfile
): void {
  if (!companyId) return;
  try {
    const hash = combinedSourcesHash(rawSources);
    const key = cacheKey(companyId, hash);
    const entry = { ...profile, expiresAt: Date.now() + TTL_MS };
    if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore
  }
}
