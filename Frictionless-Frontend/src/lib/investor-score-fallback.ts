/**
 * I3: Deterministic fallback score 60–90 when real match score is missing.
 * Same input always produces same output.
 */
export function getFallbackScore(investorId: string | null, domain?: string | null): number {
  const seed = (investorId || domain || 'default').toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Map to 60–90 range
  const normalized = Math.abs(hash) % 31;
  return 60 + normalized;
}
