// ---------------------------------------------------------------------------
// Shared investor utilities — single source of truth
// ---------------------------------------------------------------------------

export interface ScoreStyle {
  label: string;
  variantColor: string;
  ringColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Score → style mapping (used everywhere scores appear)
 *  80-100 = Green  "Excellent"
 *  60-79  = Yellow "Good"
 *  <60    = Red    "Need Improvement"
 */
export function getScoreStyle(score: number): ScoreStyle {
  if (score >= 80)
    return {
      label: 'Excellent',
      variantColor: '#10B981',
      ringColor: '#10B981',
      textColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    };
  if (score >= 60)
    return {
      label: 'Good',
      variantColor: '#EAB308',
      ringColor: '#EAB308',
      textColor: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    };
  return {
    label: 'Need Improvement',
    variantColor: '#EF4444',
    ringColor: '#EF4444',
    textColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  };
}

/** Format USD amounts compactly */
export function formatUsd(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || isNaN(v)) return '—';
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

/** Generate initials from a name (1–2 chars) */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0]?.toUpperCase() || '?';
}

/** Data confidence label based on how many fields are filled */
export function getDataConfidence(fieldsFilled: number, totalFields: number): { label: string; color: string } {
  const ratio = totalFields > 0 ? fieldsFilled / totalFields : 0;
  if (ratio >= 0.7) return { label: 'High', color: '#10B981' };
  if (ratio >= 0.4) return { label: 'Medium', color: '#EAB308' };
  return { label: 'Low', color: '#EF4444' };
}
