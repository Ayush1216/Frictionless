// Score color based on Frictionless ranges
// 70-100 = green, 30-69 = orange, 0-29 = red
export function getScoreColor(score: number): string {
  if (score >= 70) return 'var(--fi-score-excellent)';
  if (score >= 30) return 'var(--fi-score-moderate)';
  return 'var(--fi-score-need-improvement)';
}

// Score status label
export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Early';
  return 'Critical';
}

// Score CSS class (for Tailwind users)
export function getScoreClass(score: number): string {
  if (score >= 70) return 'score-excellent';
  if (score >= 30) return 'score-moderate';
  return 'score-need-improvement';
}

// Score background color (subtle)
export function getScoreBgColor(score: number): string {
  if (score >= 70) return 'var(--fi-score-excellent-bg)';
  if (score >= 30) return 'var(--fi-score-moderate-bg)';
  return 'var(--fi-score-need-improvement-bg)';
}

// Format score delta with arrow
export function formatDelta(delta: number): { text: string; positive: boolean } {
  const positive = delta >= 0;
  const arrow = positive ? '\u2197' : '\u2198';
  return { text: `${arrow} ${positive ? '+' : ''}${delta.toFixed(1)}`, positive };
}

// Calculate Frictionless Score (used on investor pages)
export function calculateFrictionlessScore(readinessScore: number, thesisFitScore: number): number {
  return Math.round((readinessScore + thesisFitScore) / 2);
}
