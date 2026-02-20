export interface DummyProgramStage {
  id: string;
  name: string;
  order: number;
  description: string;
}

export interface DummyProgram {
  id: string;
  org_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  startup_count: number;
  mentor_count: number;
  stages: DummyProgramStage[];
}

export const dummyPrograms: DummyProgram[] = [
  {
    id: 'prog-1',
    org_id: 'accel-frictionless',
    name: 'Frictionless Seed Accelerator 2025',
    description: 'A 12-week program for pre-seed and seed-stage startups. Includes $150K investment, mentorship, and Demo Day with 100+ investors. Focus on B2B SaaS, fintech, and healthtech.',
    start_date: '2025-03-15',
    end_date: '2025-06-07',
    status: 'upcoming',
    startup_count: 12,
    mentor_count: 24,
    stages: [
      { id: 'prog-1-s1', name: 'Application Review', order: 1, description: 'Applications evaluated by investment team' },
      { id: 'prog-1-s2', name: 'Interviews', order: 2, description: 'Top 30 companies invited for founder interviews' },
      { id: 'prog-1-s3', name: 'Cohort Selection', order: 3, description: '12 startups selected for the program' },
      { id: 'prog-1-s4', name: 'Program Kickoff', order: 4, description: 'Orientation and first workshops' },
      { id: 'prog-1-s5', name: 'Mentorship & Workshops', order: 5, description: 'Weekly sessions on GTM, product, fundraising' },
      { id: 'prog-1-s6', name: 'Demo Day Prep', order: 6, description: 'Pitch practice and deck refinement' },
      { id: 'prog-1-s7', name: 'Demo Day', order: 7, description: 'Present to 100+ investors' },
    ],
  },
  {
    id: 'prog-3',
    org_id: 'accel-frictionless',
    name: 'Frictionless Growth Program',
    description: 'Ongoing support for portfolio companies. Monthly workshops, 1:1 mentoring, and access to investor network. Currently in week 4.',
    start_date: '2025-01-20',
    end_date: '2025-06-20',
    status: 'active',
    startup_count: 6,
    mentor_count: 10,
    stages: [
      { id: 'prog-3-s1', name: 'Onboarding', order: 1, description: 'Goal setting and mentor matching' },
      { id: 'prog-3-s2', name: 'Workshops', order: 2, description: 'Monthly GTM, product, and ops workshops' },
      { id: 'prog-3-s3', name: '1:1 Mentoring', order: 3, description: 'Bi-weekly mentor sessions' },
      { id: 'prog-3-s4', name: 'Investor Prep', order: 4, description: 'Data room and pitch Frictionless' },
      { id: 'prog-3-s5', name: 'Graduation', order: 5, description: 'Demo day and investor intros' },
    ],
  },
  {
    id: 'prog-2',
    org_id: 'accel-frictionless',
    name: 'Frictionless Series A Bootcamp',
    description: 'An intensive 6-week program for Seed+ companies preparing for Series A. Focus on metrics, storytelling, and investor relationship building. No equity taken.',
    start_date: '2025-01-06',
    end_date: '2025-02-14',
    status: 'completed',
    startup_count: 8,
    mentor_count: 12,
    stages: [
      { id: 'prog-2-s1', name: 'Assessment', order: 1, description: 'Frictionless score and gap analysis' },
      { id: 'prog-2-s2', name: 'Data Room Setup', order: 2, description: 'Complete data room and financials' },
      { id: 'prog-2-s3', name: 'Pitch Refinement', order: 3, description: 'Deck and narrative workshops' },
      { id: 'prog-2-s4', name: 'Investor Matching', order: 4, description: 'AI-powered investor fit and outreach strategy' },
      { id: 'prog-2-s5', name: 'Mock Partner Meetings', order: 5, description: 'Practice with real VCs' },
      { id: 'prog-2-s6', name: 'Graduation', order: 6, description: 'Certificate and investor introductions' },
    ],
  },
];
