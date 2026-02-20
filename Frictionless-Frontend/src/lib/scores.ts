// Score color based on Frictionless ranges
// 80-100 = green, 60-79 = yellow, 0-59 = red
export function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--fi-score-excellent)';
  if (score >= 60) return 'var(--fi-score-moderate)';
  return 'var(--fi-score-need-improvement)';
}

// Score status label
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  return 'Need Improvement';
}

// Score CSS class (for Tailwind users)
export function getScoreClass(score: number): string {
  if (score >= 80) return 'score-excellent';
  if (score >= 60) return 'score-moderate';
  return 'score-need-improvement';
}

// Score background color (subtle)
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'var(--fi-score-excellent-bg)';
  if (score >= 60) return 'var(--fi-score-moderate-bg)';
  return 'var(--fi-score-need-improvement-bg)';
}

// Format score delta with arrow
export function formatDelta(delta: number): { text: string; positive: boolean } {
  const positive = delta >= 0;
  const arrow = positive ? '\u2197' : '\u2198';
  return { text: `${arrow} ${positive ? '+' : ''}${delta.toFixed(1)}`, positive };
}

// Calculate Frictionless Score (used on investor pages)
export function calculateReadinessScore(readinessScore: number, thesisFitScore: number): number {
  return Math.round((readinessScore + thesisFitScore) / 2);
}
