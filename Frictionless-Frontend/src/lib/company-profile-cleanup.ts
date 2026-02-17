/**
 * Client-side data cleanup for Company Profile (UI only).
 * - Normalize and dedupe keywords/industries for display.
 * - Cache cleaned payload in localStorage with TTL and hash invalidation.
 * - Never writes to database.
 */

const CACHE_KEY_PREFIX = 'companyProfileCleaned';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface CleanedPayload {
  keywords: string[];
  industries: string[];
  /** When cleanup was applied (for cache metadata) */
  cleanedAt: number;
  /** Hash of source data used for invalidation */
  dataHash: string;
}

/** Normalize a single string: trim, lowercase for comparison, collapse spaces, remove trailing punctuation */
export function normalizeText(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,;&]+\s*$/g, '')
    .toLowerCase();
}

/** Normalize for display: trim and collapse spaces, keep original casing for display */
export function normalizeForDisplay(s: string): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Deterministic exact + normalized dedupe (no AI). Preserves first occurrence for display. */
export function dedupeExact(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = normalizeText(item);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalizeForDisplay(item));
  }
  return result;
}

/** Plural/singular and common variants (e.g. "health" vs "healthcare") - simple heuristic merge */
function normalizeVariant(token: string): string {
  const t = token.toLowerCase().replace(/\s+/g, ' ');
  // Common singular/plural and variant mappings
  if (t.endsWith('s') && t.length > 2) return t.slice(0, -1);
  if (t === 'health & wellness' || t === 'health, wellness') return 'health wellness';
  if (t === 'health and wellness') return 'health wellness';
  if (t.includes(' & ')) return t.replace(/\s*&\s*/g, ' ');
  if (t.includes(',')) return t.replace(/,/g, ' ');
  return t;
}

/** Slightly stronger deterministic dedupe: same as dedupeExact + variant normalization */
export function dedupeDeterministic(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = normalizeText(item);
    if (!normalized) continue;
    const variant = normalizeVariant(normalized);
    if (seen.has(variant)) continue;
    seen.add(variant);
    result.push(normalizeForDisplay(item));
  }
  return result;
}

/** Stable hash for cache key (from source payload) */
export function dataHash(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function cacheKey(companyId: string, hash: string): string {
  return `${CACHE_KEY_PREFIX}::${companyId}::${hash}`;
}

/** Get cached cleaned payload if same company + same data hash and not expired */
export function getCachedCleanedPayload(
  companyId: string,
  dataHashVal: string
): CleanedPayload | null {
  if (!companyId || !dataHashVal) return null;
  try {
    const key = cacheKey(companyId, dataHashVal);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CleanedPayload & { expiresAt?: number };
    if (parsed.dataHash !== dataHashVal) return null;
    const expiresAt = parsed.expiresAt ?? parsed.cleanedAt + TTL_MS;
    if (Date.now() > expiresAt) return null;
    return {
      keywords: parsed.keywords ?? [],
      industries: parsed.industries ?? [],
      cleanedAt: parsed.cleanedAt,
      dataHash: parsed.dataHash,
    };
  } catch {
    return null;
  }
}

/** Store cleaned payload in cache with TTL */
export function setCachedCleanedPayload(
  companyId: string,
  dataHashVal: string,
  payload: Omit<CleanedPayload, 'cleanedAt' | 'dataHash'>
): void {
  if (!companyId || !dataHashVal) return;
  try {
    const key = cacheKey(companyId, dataHashVal);
    const entry: CleanedPayload & { expiresAt: number } = {
      ...payload,
      cleanedAt: Date.now(),
      dataHash: dataHashVal,
      expiresAt: Date.now() + TTL_MS,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore quota or parse errors
  }
}

/** Build cleaned payload from raw keywords/industries (deterministic path; no AI) */
export function buildCleanedPayloadDeterministic(
  rawKeywords: string[],
  rawIndustries: string[]
): Pick<CleanedPayload, 'keywords' | 'industries'> {
  return {
    keywords: dedupeDeterministic(rawKeywords),
    industries: dedupeDeterministic(rawIndustries),
  };
}
