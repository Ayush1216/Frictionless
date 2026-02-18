/**
 * localStorage cache for AI-generated analyses.
 * 24-hour TTL, keyed by analysis type + score hash.
 */

const PREFIX = 'frictionless-analysis-';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  scoreHash: string;
  timestamp: number;
}

/**
 * Build a hash from overall score + category scores.
 * Invalidates whenever any score changes.
 */
export function buildScoreHash(
  overallScore: number,
  categories: { name: string; score: number }[]
): string {
  const parts = [Math.round(overallScore)];
  for (const cat of categories) {
    parts.push(Math.round(cat.score));
  }
  return parts.join('-');
}

export function getCachedAnalysis<T>(key: string, scoreHash: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (entry.scoreHash !== scoreHash) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    if (Date.now() - entry.timestamp > TTL_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function clearCachedAnalysis(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // localStorage unavailable
  }
}

export function setCachedAnalysis<T>(key: string, scoreHash: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, scoreHash, timestamp: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable
  }
}
