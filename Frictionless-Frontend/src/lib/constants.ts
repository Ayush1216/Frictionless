export const APP_NAME = 'Frictionless Intelligence';
export const APP_DESCRIPTION = 'AI-powered investment intelligence platform';

export const STAGES = [
  'pre_seed',
  'seed',
  'series_a',
  'series_b',
  'series_c',
  'growth',
] as const;
export const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  growth: 'Growth',
};

export const SECTORS = [
  { code: 'fintech', name: 'Fintech' },
  { code: 'healthtech', name: 'HealthTech' },
  { code: 'cleantech', name: 'CleanTech' },
  { code: 'saas', name: 'SaaS' },
  { code: 'ecommerce', name: 'E-Commerce' },
  { code: 'edtech', name: 'EdTech' },
  { code: 'cybersecurity', name: 'Cybersecurity' },
  { code: 'biotech', name: 'Biotech' },
  { code: 'agtech', name: 'AgTech' },
  { code: 'mobility', name: 'Mobility' },
  { code: 'real_estate', name: 'Real Estate' },
  { code: 'foodtech', name: 'FoodTech' },
  { code: 'deeptech', name: 'DeepTech' },
  { code: 'ai_ml', name: 'AI / ML' },
] as const;

export const BADGE_LABELS: Record<string, { label: string; color: string }> = {
  exceptional: { label: 'Exceptional', color: '#10B981' },
  strong: { label: 'Strong', color: '#3B82F6' },
  promising: { label: 'Promising', color: '#06B6D4' },
  developing: { label: 'Developing', color: '#F59E0B' },
  early: { label: 'Early Stage', color: '#EF4444' },
};

export const ASSESSMENT_CATEGORIES = [
  'Storytelling & Pitch',
  'Founder & Team',
  'Product & Technology',
  'Foundational Setup',
  'Metrics & Financials',
  'Go-To-Market Strategy',
  'Traction & Validation',
] as const;

export const SCORE_COLORS = {
  excellent: { min: 86, color: '#10B981', label: 'Excellent' },
  good: { min: 80, color: '#EAB308', label: 'Good' },
  poor: { min: 0, color: '#EF4444', label: 'Need Improvement' },
  fair: { min: 0, color: '#F59E0B', label: 'Fair' },
};

export function getScoreColor(score: number): string {
  if (score >= 86) return SCORE_COLORS.excellent.color;
  if (score >= 80) return SCORE_COLORS.good.color;
  return SCORE_COLORS.poor.color;
}

export function getScoreLabel(score: number): string {
  if (score >= 86) return SCORE_COLORS.excellent.label;
  if (score >= 80) return SCORE_COLORS.good.label;
  return SCORE_COLORS.poor.label;
}

export function getBadge(score: number): string {
  if (score >= 86) return 'excellent';
  if (score >= 80) return 'good';
  return 'needs_improvement';
}
