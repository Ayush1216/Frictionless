/** Validate LinkedIn person profile URL (linkedin.com/in/...). Reject company pages. */
export function isValidPersonLinkedInUrl(url: string): { valid: boolean; message?: string } {
  const u = url.trim().replace(/^\s+|\s+$/g, '');
  if (!u) return { valid: false, message: 'URL is required' };
  let href = u;
  if (!/^https?:\/\//i.test(href)) href = 'https://' + href;
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('linkedin.com')) return { valid: false, message: 'Must be a LinkedIn URL' };
    const path = parsed.pathname.toLowerCase();
    if (path.includes('/company/'))
      return { valid: false, message: 'Use a person profile (linkedin.com/in/...). Company pages are not supported here.' };
    if (path.includes('/in/')) return { valid: true };
    return { valid: false, message: 'Use a LinkedIn person profile URL (e.g. linkedin.com/in/username)' };
  } catch {
    return { valid: false, message: 'Invalid URL format' };
  }
}
