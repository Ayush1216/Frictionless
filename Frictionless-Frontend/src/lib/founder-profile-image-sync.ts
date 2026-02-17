/**
 * Founder profile image sync: call API to extract image from LinkedIn, then persist to extraction_data.
 * Cache extracted URL locally (by founder key) with 24h TTL.
 */

import type { FounderProfile } from './founder-utils';
import { isTrustedProfileImageUrl } from './linkedin-profile-image';

const CACHE_PREFIX = 'founder_profile_image::';
const TTL_MS = 24 * 60 * 60 * 1000;

function cacheKey(linkedinUrl: string): string {
  let h = 0;
  const s = (linkedinUrl || '').trim().toLowerCase();
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return `${CACHE_PREFIX}${h.toString(36)}`;
}

export type CachedImage = {
  profile_image_url: string;
  profile_image_synced_at: string;
  cached_at: number;
};

export function getCached(linkedinUrl: string): CachedImage | null {
  try {
    const key = cacheKey(linkedinUrl);
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedImage;
    if (!data?.profile_image_url || !data.cached_at) return null;
    if (Date.now() - data.cached_at > TTL_MS) return null;
    if (!isTrustedProfileImageUrl(data.profile_image_url)) return null;
    return data;
  } catch {
    return null;
  }
}

function setCached(linkedinUrl: string, payload: { profile_image_url: string; profile_image_synced_at: string }) {
  try {
    const key = cacheKey(linkedinUrl);
    const data: CachedImage = {
      ...payload,
      cached_at: Date.now(),
    };
    if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export type ExtractionData = {
  founder_linkedin?: { data?: { founders?: unknown[]; leadership_team?: unknown[] } };
};

export type SyncOptions = {
  getToken: () => Promise<string | null>;
  forceRefresh?: boolean;
  /** If true, persist to extraction_data; requires extraction to be passed */
  persist?: boolean;
  extraction?: ExtractionData | null;
};

export type SyncResultSuccess = {
  ok: true;
  profile_image_url: string;
  profile_image_source: 'linkedin';
  profile_image_synced_at: string;
};

export type SyncResultFailure = {
  ok: false;
  error: string;
};

export type SyncResult = SyncResultSuccess | SyncResultFailure;

/**
 * Sync founder profile image from LinkedIn: use cache if valid and not forceRefresh, else fetch + parse.
 * If persist is true, also PATCH extraction_data with the new URL (via updateFounderImageInExtraction).
 */
export async function syncFounderProfileImage(
  founder: FounderProfile,
  options: SyncOptions
): Promise<SyncResult> {
  const { getToken, forceRefresh = false, persist = true, extraction } = options;
  const linkedinUrl = (founder.linkedin_url || '').trim();
  if (!linkedinUrl) return { ok: false, error: 'No LinkedIn URL' };
  if (persist && !extraction) return { ok: false, error: 'extraction required when persist is true' };

  const existingUrl = (founder.profile_image_url || '').trim();
  const existingValid = existingUrl && isTrustedProfileImageUrl(existingUrl);
  if (existingValid && !forceRefresh) {
    const cached = getCached(linkedinUrl);
    if (cached) {
      return {
        ok: true,
        profile_image_url: cached.profile_image_url,
        profile_image_source: 'linkedin',
        profile_image_synced_at: cached.profile_image_synced_at,
      };
    }
    return {
      ok: true,
      profile_image_url: existingUrl,
      profile_image_source: ((founder as { profile_image_source?: string }).profile_image_source || 'linkedin') as 'linkedin',
      profile_image_synced_at: (founder as { profile_image_synced_at?: string }).profile_image_synced_at || '',
    };
  }

  const token = await getToken();
  if (!token) return { ok: false, error: 'Not authenticated' };

  const res = await fetch('/api/founder-profile-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ linkedin_url: linkedinUrl }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { ok: false, error: data.error || `Request failed (${res.status})` };
  }
  if (data.error) {
    return { ok: false, error: data.error };
  }
  if (!data.profile_image_url) {
    return { ok: false, error: 'No image URL returned' };
  }

  setCached(linkedinUrl, {
    profile_image_url: data.profile_image_url,
    profile_image_synced_at: data.profile_image_synced_at || new Date().toISOString(),
  });

  if (persist && extraction) {
    await updateFounderImageInExtraction(founder, data, getToken, extraction);
  }

  return {
    ok: true,
    profile_image_url: data.profile_image_url,
    profile_image_source: 'linkedin',
    profile_image_synced_at: data.profile_image_synced_at || new Date().toISOString(),
  };
}

type ImagePayload = {
  profile_image_url: string;
  profile_image_source?: string;
  profile_image_synced_at?: string;
};

/**
 * Update one founder's profile_image_url (and source/synced_at) in extraction_data.
 * Builds extraction_patch with full founders + leadership_team arrays (one founder updated by linkedin_url).
 */
export async function updateFounderImageInExtraction(
  founder: FounderProfile,
  payload: ImagePayload,
  getToken: () => Promise<string | null>,
  extraction: ExtractionData | null
): Promise<boolean> {
  const token = await getToken();
  if (!token || !extraction?.founder_linkedin?.data) return false;

  const linkedinUrl = (founder.linkedin_url || '').trim().toLowerCase();
  if (!linkedinUrl) return false;

  const founders = [...(extraction.founder_linkedin.data.founders || [])];
  const leadership = [...(extraction.founder_linkedin.data.leadership_team || [])];

  const updateOne = (p: unknown) => {
    const rec = p as Record<string, unknown>;
    const url = String(rec?.linkedin_url || '').trim().toLowerCase();
    if (url !== linkedinUrl) return rec;
    return {
      ...rec,
      profile_image_url: payload.profile_image_url,
      profile_image_source: payload.profile_image_source ?? 'linkedin',
      profile_image_synced_at: payload.profile_image_synced_at ?? new Date().toISOString(),
    };
  };

  const patch = {
    founder_linkedin: {
      data: {
        founders: founders.map(updateOne),
        leadership_team: leadership.map(updateOne),
      },
    },
  };

  const res = await fetch('/api/company-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ extraction_patch: patch, regenerate_readiness: false }),
  });
  return res.ok;
}
