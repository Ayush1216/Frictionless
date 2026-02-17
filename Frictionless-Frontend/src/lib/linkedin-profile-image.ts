/**
 * LinkedIn profile image extraction from HTML (in-memory only, no storage).
 * Used by API route to fetch profile page, parse, then discard HTML.
 */

const TRUSTED_IMAGE_HOST = 'media.licdn.com';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;

/** Reject placeholder/ghost image URLs */
const PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /default-avatar/i,
  /ghost/i,
  /blank\.(png|gif|jpg)/i,
  /^data:image\/svg/i,
  /1x1\.(png|gif)/i,
];

/**
 * Extract profile image URL from LinkedIn profile HTML.
 * Prefer: #profile-picture-container img → img alt "Profile picture of" → first media.licdn.com profile-displayphoto.
 */
export function extractLinkedInProfileImage(html: string): string | null {
  if (!html || typeof html !== 'string') return null;

  // 1) #profile-picture-container img
  const containerMatch = html.match(
    /id=["']profile-picture-container["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i
  );
  if (containerMatch?.[1]) {
    const url = normalizeImageUrl(containerMatch[1]);
    if (isTrustedProfileImageUrl(url)) return url;
  }

  // 2) figure#profile-picture-container (alternate structure)
  const figureMatch = html.match(
    /<figure[^>]*id=["']profile-picture-container["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i
  );
  if (figureMatch?.[1]) {
    const url = normalizeImageUrl(figureMatch[1]);
    if (isTrustedProfileImageUrl(url)) return url;
  }

  // 3) img with alt containing "Profile picture of"
  const altMatch = html.match(
    /<img[^>]+alt=["'][^"']*Profile picture of[^"']*["'][^>]+src=["']([^"']+)["']/i
  );
  if (altMatch?.[1]) {
    const url = normalizeImageUrl(altMatch[1]);
    if (isTrustedProfileImageUrl(url)) return url;
  }
  const altMatchReverse = html.match(
    /<img[^>]+src=["']([^"']+)["'][^>]+alt=["'][^"']*Profile picture of[^"']*["']/i
  );
  if (altMatchReverse?.[1]) {
    const url = normalizeImageUrl(altMatchReverse[1]);
    if (isTrustedProfileImageUrl(url)) return url;
  }

  // 4) First media.licdn.com/dms/image ... profile-displayphoto URL
  const licdnMatch = html.match(
    /https?:\/\/media\.licdn\.com\/dms\/image[^"'\s<>]+profile-displayphoto[^"'\s<>]*/i
  );
  if (licdnMatch?.[0]) {
    const url = normalizeImageUrl(licdnMatch[0]);
    if (isTrustedProfileImageUrl(url)) return url;
  }

  return null;
}

function normalizeImageUrl(raw: string): string {
  let url = raw.trim().replace(/&amp;/g, '&');
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return raw;
    return stripTrackingParams(u.href);
  } catch {
    return raw;
  }
}

/**
 * Strip common tracking params only; keep URL usable.
 */
export function stripTrackingParams(url: string): string {
  try {
    const u = new URL(url);
    const drop = new Set([
      'trk', 'tracking', 'ref', 'refId', 'utm_source', 'utm_medium', 'utm_campaign',
      'trkInfo', 'trackingId', 'oauth_token',
    ]);
    drop.forEach((q) => u.searchParams.delete(q));
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Accept only URLs from trusted image hosts (e.g. media.licdn.com).
 */
export function isTrustedProfileImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.includes(TRUSTED_IMAGE_HOST)) return false;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  } catch {
    return false;
  }
  const lower = url.toLowerCase();
  if (PLACEHOLDER_PATTERNS.some((p) => p.test(lower))) return false;
  return true;
}

export type SyncResultSuccess = {
  profile_image_url: string;
  profile_image_source: 'linkedin';
  profile_image_synced_at: string;
};

export type SyncResultFailure = {
  error: string;
  /** When scrape ran but no trusted image was found, first URL we extracted (for debugging). */
  debug_scraped_url?: string;
};

export type SyncResult = SyncResultSuccess | SyncResultFailure;

/**
 * Fetch LinkedIn profile HTML (in-memory), parse for image URL, then discard HTML.
 * Timeout + retry (max 2 retries). Handles rate-limit/blocked gracefully.
 * On failure, returns debug_scraped_url when we extracted a URL that wasn't trusted (so you can inspect it).
 */
export async function fetchAndExtractProfileImageUrl(linkedinUrl: string): Promise<SyncResult> {
  const url = linkedinUrl.trim();
  if (!url || !url.toLowerCase().includes('linkedin.com/in/')) {
    return { error: 'Invalid LinkedIn person URL' };
  }
  const href = url.startsWith('http') ? url : `https://${url}`;

  let lastError: string | null = null;
  let lastScrapedUrl: string | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(href, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });
      clearTimeout(timeoutId);

      if (res.status === 429 || res.status === 403 || res.status === 999) {
        lastError = res.status === 999
          ? 'LinkedIn blocks automated access (HTTP 999). Using backend fallback.'
          : 'Rate limited or blocked by LinkedIn';
        break;
      }
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        if (attempt < MAX_RETRIES) continue;
        return { error: lastError };
      }

      const html = await res.text();
      const imageUrl = extractLinkedInProfileImage(html);
      if (imageUrl) lastScrapedUrl = imageUrl;
      if (imageUrl && isTrustedProfileImageUrl(imageUrl)) {
        return {
          profile_image_url: imageUrl,
          profile_image_source: 'linkedin',
          profile_image_synced_at: new Date().toISOString(),
        };
      }
      lastError = 'No valid profile image found in page';
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('abort')) lastError = 'Request timed out';
      else lastError = msg;
    }
  }
  const result: SyncResultFailure = { error: lastError || 'Could not fetch profile image' };
  if (lastScrapedUrl) result.debug_scraped_url = lastScrapedUrl;
  return result;
}
