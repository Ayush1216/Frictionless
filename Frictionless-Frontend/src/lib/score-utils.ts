/**
 * Centralized score color coding for Frictionless scores.
 * Single source of truth for score ranges, labels, and colors.
 *
 * 80-100 → "Excellent" (green)
 * 60-79  → "Good" (yellow)
 * <60    → "Need Improvement" (red)
 */

export type ScoreLevel = 'excellent' | 'good' | 'needs_improvement';

export interface ScoreInfo {
  level: ScoreLevel;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}

export function getScoreInfo(score: number): ScoreInfo {
  if (score >= 80) {
    return {
      level: 'excellent',
      label: 'Excellent',
      color: '#10B981',
      bgClass: 'bg-score-excellent/10',
      textClass: 'text-score-excellent',
      dotClass: 'bg-score-excellent',
    };
  }
  if (score >= 60) {
    return {
      level: 'good',
      label: 'Good',
      color: '#EAB308',
      bgClass: 'bg-score-good/10',
      textClass: 'text-score-good',
      dotClass: 'bg-score-good',
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
