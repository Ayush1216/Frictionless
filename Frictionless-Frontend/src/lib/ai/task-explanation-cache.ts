/**
 * localStorage cache for AI-generated task explanations.
 * 7-day TTL. Key prefix: frictionless-task-explain-
 */

const PREFIX = 'frictionless-task-explain-';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  content: string;
  timestamp: number;
}

function buildKey(taskId: string, stepIndex?: number): string {
  return stepIndex !== undefined
    ? `${PREFIX}${taskId}-step-${stepIndex}`
    : `${PREFIX}${taskId}`;
}

export function getCachedExplanation(taskId: string, stepIndex?: number): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(buildKey(taskId, stepIndex));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > TTL_MS) {
      localStorage.removeItem(buildKey(taskId, stepIndex));
      return null;
    }
    return entry.content;
  } catch {
    return null;
  }
}

export function setCachedExplanation(taskId: string, content: string, stepIndex?: number): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry = { content, timestamp: Date.now() };
    localStorage.setItem(buildKey(taskId, stepIndex), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}
