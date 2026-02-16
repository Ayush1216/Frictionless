/**
 * Website sanitization and validation for onboarding.
 * Ensures the URL is a real-looking website, not a random or placeholder string.
 */

/** Placeholder / fake values we reject (lowercase). */
const BLOCKLIST = new Set([
  'test', 'example', 'examples', 'demo', 'sample', 'placeholder', 'website', 'url', 'link',
  'none', 'n/a', 'na', 'no', 'yes', 'asdf', 'qwerty', 'abc', 'hello', 'world', 'foo', 'bar',
  'company', 'startup', 'company.com', 'example.com', 'test.com', 'website.com', 'demo.com',
  'localhost', 'staging', 'dev', 'development', 'temp', 'temporary', 'fake', 'dummy',
]);

/** Minimum length for the hostname (e.g. "ab.co" = 5). */
const MIN_HOSTNAME_LENGTH = 4;

/** Must have at least one dot in hostname (TLD). */
const TLD_PATTERN = /\./;

export type ValidationResult =
  | { valid: true; sanitized: string }
  | { valid: false; error: string };

/**
 * Sanitize user input into a normalized URL string.
 * - Trims and collapses whitespace
 * - Adds https:// if no protocol
 * - Lowercases the hostname (not path)
 * - Removes trailing slash from origin
 */
export function sanitizeWebsite(input: string): string {
  let s = input.trim().replace(/\s+/g, '');
  if (!s) return '';

  try {
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(s)) {
      s = 'https://' + s;
    }
    const url = new URL(s);
    const origin = url.origin.toLowerCase();
    const path = url.pathname.replace(/\/+$/, '') || '';
    const pathQuery = path + url.search;
    return origin + pathQuery;
  } catch {
    return input.trim();
  }
}

/**
 * Validate that the URL looks like a real website, not a random name.
 * Returns { valid: true, sanitized } or { valid: false, error }.
 */
export function validateWebsite(input: string): ValidationResult {
  const raw = input.trim();
  if (!raw) {
    return { valid: false, error: 'Please enter a website URL.' };
  }

  const sanitized = sanitizeWebsite(raw);
  if (!sanitized) {
    return { valid: false, error: 'Please enter a valid website URL.' };
  }

  let url: URL;
  try {
    url = new URL(sanitized);
  } catch {
    return { valid: false, error: 'Please enter a valid URL (e.g. https://yourcompany.com).' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { valid: false, error: 'URL must start with https:// or http://.' };
  }

  const hostname = url.hostname.toLowerCase();

  // Reject localhost and private/invalid IPs
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { valid: false, error: 'Please enter your public website URL, not localhost.' };
  }
  if (/^127\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./i.test(hostname)) {
    return { valid: false, error: 'Please enter your public website URL.' };
  }

  // Must have a TLD (at least one dot)
  if (!TLD_PATTERN.test(hostname)) {
    return { valid: false, error: 'Please enter a full website address with a domain (e.g. .com, .io).' };
  }

  if (hostname.length < MIN_HOSTNAME_LENGTH) {
    return { valid: false, error: 'Website address is too short.' };
  }

  // Extract the main “name” part (first label) to block placeholder words
  const firstLabel = hostname.split('.')[0] ?? '';
  if (BLOCKLIST.has(firstLabel)) {
    return { valid: false, error: 'Please enter your actual website URL, not a placeholder or example.' };
  }

  // Reject if the whole hostname looks like a single placeholder word (no dot would be caught above; here we catch things like "test.com")
  const baseWithoutTld = hostname.slice(0, hostname.lastIndexOf('.'));
  if (BLOCKLIST.has(baseWithoutTld)) {
    return { valid: false, error: 'Please enter your actual website URL, not a placeholder or example.' };
  }

  // Optional: reject very short domain labels (e.g. "a.co" is 1 char)
  const labels = hostname.split('.');
  if (labels.some((l) => l.length < 2)) {
    return { valid: false, error: 'Please enter a valid domain name.' };
  }

  return { valid: true, sanitized };
}
