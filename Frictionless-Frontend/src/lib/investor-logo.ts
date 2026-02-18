/**
 * Investor logo source priority:
 * 1. raw_profile_json.logo_url
 * 2. metadata_json.logo_public_url
 * 3. Fallback avatar (first letter or dicebear)
 */
export function getInvestorLogoUrl(investor: {
  raw_profile_json?: Record<string, unknown> | null;
  metadata_json?: Record<string, unknown> | null;
  org?: { logo_url?: string | null; name?: string } | null;
}): string | null {
  const rawLogo = investor?.raw_profile_json?.logo_url;
  if (typeof rawLogo === 'string' && rawLogo.trim()) return rawLogo.trim();

  const metaLogo = investor?.metadata_json?.logo_public_url;
  if (typeof metaLogo === 'string' && metaLogo.trim()) return metaLogo.trim();

  const orgLogo = investor?.org?.logo_url;
  if (typeof orgLogo === 'string' && orgLogo.trim()) return orgLogo.trim();

  return null;
}

/** Fallback avatar URL when no logo (dicebear) */
export function getInvestorFallbackAvatar(name: string): string {
  const seed = (name || 'investor').replace(/\s+/g, '').slice(0, 24) || 'default';
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}
