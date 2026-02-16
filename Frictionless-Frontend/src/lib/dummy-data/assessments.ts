export interface DummyAssessmentCategory {
  name: string;
  score: number;
  delta: number;
  weight: number;
}

export interface DummyAssessmentRun {
  id: string;
  startup_org_id: string;
  run_number: number;
  overall_score: number;
  badge: string;
  scored_at: string;
  categories: DummyAssessmentCategory[];
  delta_from_previous: number;
}

const CATEGORY_NAMES = [
  'Storytelling & Pitch',
  'Founder & Team',
  'Product & Technology',
  'Foundational Setup',
  'Metrics & Financials',
  'Go-To-Market Strategy',
  'Traction & Validation',
];

function buildCategories(baseScore: number, deltas: number[]): DummyAssessmentCategory[] {
  return CATEGORY_NAMES.map((name, i) => ({
    name,
    score: Math.min(100, Math.max(0, baseScore + (deltas[i] ?? 0))),
    delta: deltas[i] ?? 0,
    weight: 1 / 7,
  }));
}

export const dummyAssessmentRuns: DummyAssessmentRun[] = [
  {
    id: 'ar-1',
    startup_org_id: 'startup-neuralpay',
    run_number: 1,
    overall_score: 68,
    badge: 'developing',
    scored_at: '2025-01-15T10:00:00Z',
    categories: buildCategories(68, [2, -1, 3, -2, 1, 0, -1]),
    delta_from_previous: 0,
  },
  {
    id: 'ar-2',
    startup_org_id: 'startup-neuralpay',
    run_number: 2,
    overall_score: 72,
    badge: 'developing',
    scored_at: '2025-01-22T14:30:00Z',
    categories: buildCategories(72, [3, 1, 2, 1, 2, 1, 0]),
    delta_from_previous: 4,
  },
  {
    id: 'ar-3',
    startup_org_id: 'startup-neuralpay',
    run_number: 3,
    overall_score: 75,
    badge: 'promising',
    scored_at: '2025-01-29T09:15:00Z',
    categories: buildCategories(75, [1, 2, 1, 2, 1, 0, 2]),
    delta_from_previous: 3,
  },
  {
    id: 'ar-4',
    startup_org_id: 'startup-neuralpay',
    run_number: 4,
    overall_score: 79,
    badge: 'strong',
    scored_at: '2025-02-05T11:45:00Z',
    categories: buildCategories(79, [2, 0, 2, 0, 2, 1, 1]),
    delta_from_previous: 4,
  },
  {
    id: 'ar-5',
    startup_org_id: 'startup-neuralpay',
    run_number: 5,
    overall_score: 82,
    badge: 'strong',
    scored_at: '2025-02-10T16:00:00Z',
    categories: buildCategories(82, [1, 0, 1, 0, 1, 1, 1]),
    delta_from_previous: 3,
  },
];
