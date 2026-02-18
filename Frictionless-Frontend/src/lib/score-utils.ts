/**
 * Centralized score color coding for readiness scores.
 * Single source of truth for score ranges, labels, and colors.
 */

export type ScoreLevel = 'excellent' | 'impressive' | 'good' | 'needs_improvement';

export interface ScoreInfo {
  level: ScoreLevel;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}

/**
 * Returns score metadata based on the readiness score value.
 *
 * 91-100 → "Excellent" (green)
 * 86-90  → "Impressive" (green)
 * 80-85  → "Good" (yellow)
 * <80    → "Need Improvement" (red)
 */
export function getScoreInfo(score: number): ScoreInfo {
  if (score >= 91) {
    return {
      level: 'excellent',
      label: 'Excellent',
      color: '#10B981',
      bgClass: 'bg-score-excellent/10',
      textClass: 'text-score-excellent',
      dotClass: 'bg-score-excellent',
    };
  }
  if (score >= 86) {
    return {
      level: 'impressive',
      label: 'Impressive',
      color: '#10B981',
      bgClass: 'bg-score-excellent/10',
      textClass: 'text-score-excellent',
      dotClass: 'bg-score-excellent',
    };
  }
  if (score >= 80) {
    return {
      level: 'good',
      label: 'Good',
      color: '#F59E0B',
      bgClass: 'bg-score-fair/10',
      textClass: 'text-score-fair',
      dotClass: 'bg-score-fair',
    };
  }
  return {
    level: 'needs_improvement',
    label: 'Need Improvement',
    color: '#EF4444',
    bgClass: 'bg-score-poor/10',
    textClass: 'text-score-poor',
    dotClass: 'bg-score-poor',
  };
}
