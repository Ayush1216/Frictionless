/**
 * Mock data for development and testing.
 * Used by the API mock adapter when USE_LIVE_API is false.
 */

import type {
  StartupProfile,
  AssessmentRun,
  Match,
  TaskGroup,
  Document,
  StartupMetrics,
  ChatThread,
  ChatMessage,
  Notification,
  AcceleratorProgram,
  CapitalProvider,
  Fund,
} from '@/types/database';

export const MOCK_STARTUP_PROFILE: StartupProfile = {
  org_id: 's-001',
  org: {
    id: 's-001',
    name: 'NeuralPay',
    org_type: 'startup',
    logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=neuralpay',
    website: 'https://neuralpay.io',
    slug: 'neuralpay',
    description: 'AI-powered payments infrastructure',
    created_at: '2023-01-15T00:00:00Z',
  },
  sector: { code: 'fintech', name: 'Fintech' },
  subsector: { code: 'payments', name: 'Payments' },
  stage: 'seed',
  business_model: 'B2B SaaS',
  founded_year: 2022,
  employee_count: 12,
  hq_location: { city: 'San Francisco', state: 'CA', country: 'USA' },
  short_summary: 'AI-powered payment processing for enterprises.',
  pitch_summary:
    'NeuralPay uses ML to optimize payment routing and reduce fraud by 40%.',
  current_readiness_score: 78,
  score_delta: 5,
  latest_metrics: {
    mrr: 45000,
    arr: 540000,
    revenue_ttm: 520000,
    gross_margin_pct: 82,
    burn_monthly: 85000,
    runway_months: 18,
    headcount: 12,
    customer_count: 45,
    cac: 4200,
    ltv: 18000,
    churn_rate_pct: 2.1,
    nps_score: 72,
  },
  tags: ['AI', 'Payments', 'B2B'],
  founders: [
    {
      full_name: 'Sarah Chen',
      title: 'CEO',
      photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      linkedin_url: 'https://linkedin.com/in/sarahchen',
      bio: 'Former Stripe, 10 years in fintech',
      is_primary: true,
    },
    {
      full_name: 'Marcus Webb',
      title: 'CTO',
      photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus',
      linkedin_url: null,
      bio: null,
      is_primary: false,
    },
  ],
  assessment: {
    overall_score: 78,
    badge: 'strong',
    categories: [
      { name: 'Storytelling & Pitch', score: 82, delta: 3, weight: 15 },
      { name: 'Founder & Team', score: 88, delta: 0, weight: 20 },
      { name: 'Product & Technology', score: 85, delta: 5, weight: 20 },
      { name: 'Foundational Setup', score: 70, delta: 8, weight: 10 },
      { name: 'Metrics & Financials', score: 75, delta: 2, weight: 15 },
      { name: 'Go-To-Market Strategy', score: 68, delta: -2, weight: 10 },
      { name: 'Traction & Validation', score: 72, delta: 4, weight: 10 },
    ],
    missing_data: [
      { item: 'Detailed unit economics', severity: 'medium' },
      { item: 'Competitive landscape analysis', severity: 'low' },
    ],
  },
};

export const MOCK_ASSESSMENT_RUNS: AssessmentRun[] = [
  {
    id: 'a-003',
    startup_org_id: 's-001',
    run_number: 3,
    overall_score: 78,
    badge: 'strong',
    scored_at: '2024-02-10T14:30:00Z',
    categories: MOCK_STARTUP_PROFILE.assessment!.categories,
    delta_from_previous: 5,
  },
  {
    id: 'a-002',
    startup_org_id: 's-001',
    run_number: 2,
    overall_score: 73,
    badge: 'promising',
    scored_at: '2024-01-15T10:00:00Z',
    categories: MOCK_STARTUP_PROFILE.assessment!.categories,
    delta_from_previous: 3,
  },
  {
    id: 'a-001',
    startup_org_id: 's-001',
    run_number: 1,
    overall_score: 70,
    badge: 'promising',
    scored_at: '2023-12-01T09:00:00Z',
    categories: MOCK_STARTUP_PROFILE.assessment!.categories,
    delta_from_previous: 0,
  },
];

export const MOCK_MATCHES: Match[] = [
  {
    id: 'm-001',
    startup_org_id: 's-001',
    capital_provider_org_id: 'c-001',
    overall_score: 92,
    score_delta: 2,
    match_date: '2024-02-08T00:00:00Z',
    status: 'saved',
    breakdown: [
      { dimension: 'Sector fit', score: 95, weight: 25, detail: 'Strong fintech focus' },
      { dimension: 'Stage alignment', score: 90, weight: 20, detail: 'Seed specialist' },
      { dimension: 'Team quality', score: 96, weight: 25, detail: 'Exceptional founders' },
      { dimension: 'Traction', score: 85, weight: 15, detail: 'Strong MRR growth' },
      { dimension: 'Product', score: 88, weight: 15, detail: 'Technical moat' },
    ],
    investor: {
      org_id: 'c-001',
      org: {
        id: 'c-001',
        name: 'General Catalyst',
        org_type: 'capital_provider',
        logo_url: null,
        website: 'https://generalcatalyst.com',
        slug: 'general-catalyst',
        description: 'Venture capital firm',
        created_at: '2010-01-01T00:00:00Z',
      },
      provider_type: 'vc',
      aum_usd: 25_000_000_000,
      check_size_min: 1_000_000,
      check_size_max: 15_000_000,
      sweet_spot: 'Seed to Series A',
      preferred_stages: ['seed', 'series_a'],
      preferred_sectors: ['fintech', 'healthtech', 'saas'],
      thesis_summary: 'Backing bold founders in technology and healthcare.',
      team_members: [],
      funds: [],
      investment_count: 450,
      portfolio_exits: 120,
    },
    ai_explanation: 'Strong sector and stage alignment. General Catalyst has deep fintech expertise.',
  },
];

export const MOCK_TASK_GROUPS: TaskGroup[] = [
  {
    id: 'tg-001',
    category: 'profile',
    title: 'Company Profile',
    description: 'Complete your company profile',
    impact: 'high',
    tasks: [
      {
        id: 't-001',
        task_group_id: 'tg-001',
        title: 'Upload pitch deck',
        description: 'Upload your latest pitch deck for AI analysis',
        status: 'done',
        priority: 'high',
        requires_rescore: false,
        completion_source: 'ai_file_upload',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-05T00:00:00Z',
        comments: [],
        events: [],
      },
      {
        id: 't-002',
        task_group_id: 'tg-001',
        title: 'Add financial metrics',
        description: 'Input MRR, ARR, runway, and key metrics',
        status: 'in_progress',
        priority: 'high',
        requires_rescore: false,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-10T00:00:00Z',
        comments: [],
        events: [],
      },
      {
        id: 't-003',
        task_group_id: 'tg-001',
        title: 'Complete founder bios',
        description: 'Add linkedin and bios for all founders',
        status: 'todo',
        priority: 'medium',
        requires_rescore: false,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
        comments: [],
        events: [],
      },
    ],
  },
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'd-001',
    name: 'NeuralPay_Pitch_Deck.pdf',
    category: 'pitch_deck',
    file_type: 'application/pdf',
    file_size: 2_400_000,
    uploaded_at: '2024-02-05T14:22:00Z',
    uploaded_by: 'sarah@neuralpay.io',
    validation_status: 'valid',
  },
];

export const MOCK_METRICS_HISTORY: Array<{ month: string; metrics: StartupMetrics }> = [
  {
    month: '2024-02',
    metrics: MOCK_STARTUP_PROFILE.latest_metrics!,
  },
  {
    month: '2024-01',
    metrics: {
      ...MOCK_STARTUP_PROFILE.latest_metrics!,
      mrr: 38000,
      arr: 456000,
      revenue_ttm: 440000,
    },
  },
];

export const MOCK_CHAT_THREADS: ChatThread[] = [
  {
    id: 'th-001',
    title: 'Pitch deck feedback',
    created_at: '2024-02-08T10:00:00Z',
    updated_at: '2024-02-08T10:30:00Z',
    message_count: 4,
  },
];

export const MOCK_CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  'th-001': [
    {
      id: 'msg-001',
      thread_id: 'th-001',
      role: 'user',
      content: 'Can you review my pitch deck and suggest improvements?',
      created_at: '2024-02-08T10:00:00Z',
    },
    {
      id: 'msg-002',
      thread_id: 'th-001',
      role: 'assistant',
      content:
        "I've reviewed your deck. Your traction slide is strong. Consider adding a clear competitive moat section.",
      created_at: '2024-02-08T10:05:00Z',
    },
  ],
};

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-001',
    type: 'score_change',
    title: 'Readiness score updated',
    description: 'Your score increased by 5 points to 78',
    read: false,
    created_at: '2024-02-10T14:35:00Z',
    link: '/dashboard',
  },
  {
    id: 'n-002',
    type: 'new_match',
    title: 'New match: General Catalyst',
    description: '92% fit score - High sector and stage alignment',
    read: false,
    created_at: '2024-02-08T09:00:00Z',
    link: '/matches',
  },
];

export const MOCK_PROGRAMS: AcceleratorProgram[] = [
  {
    id: 'p-001',
    org_id: 'a-001',
    name: 'SKU Spring 2024',
    description: '12-week accelerator for B2B startups',
    start_date: '2024-03-01',
    end_date: '2024-05-24',
    status: 'upcoming',
    startup_count: 24,
    mentor_count: 12,
    stages: [
      { id: 'st-1', name: 'Onboarding', order: 1, description: 'Welcome week' },
      { id: 'st-2', name: 'Mentorship', order: 2, description: '1:1 mentor matching' },
      { id: 'st-3', name: 'Demo Day', order: 3, description: 'Investor showcase' },
    ],
  },
];

export const MOCK_DEAL_FLOW: Array<StartupProfile & { match_score: number }> = [
  { ...MOCK_STARTUP_PROFILE, match_score: 92 },
];

export const MOCK_CAPITAL_PROFILE: CapitalProvider = {
  org_id: 'c-001',
  org: {
    id: 'c-001',
    name: 'General Catalyst',
    org_type: 'capital_provider',
    logo_url: null,
    website: 'https://generalcatalyst.com',
    slug: 'general-catalyst',
    description: 'Venture capital firm',
    created_at: '2010-01-01T00:00:00Z',
  },
  provider_type: 'vc',
  aum_usd: 25_000_000_000,
  check_size_min: 1_000_000,
  check_size_max: 15_000_000,
  sweet_spot: 'Seed to Series A',
  preferred_stages: ['seed', 'series_a'],
  preferred_sectors: ['fintech', 'healthtech', 'saas'],
  thesis_summary: 'Backing bold founders in technology and healthcare.',
  team_members: [
    {
      id: 'tm-001',
      full_name: 'Hemant Taneja',
      title: 'Managing Director',
      photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hemant',
      email: 'hemant@generalcatalyst.com',
      bio: 'Focus on tech and healthcare',
      role: 'partner',
    },
  ],
  funds: [
    {
      id: 'f-001',
      name: 'GC IX',
      vintage_year: 2023,
      target_size: 5_000_000_000,
      capital_deployed: 1_200_000_000,
      capital_remaining_pct: 76,
      status: 'deploying',
      investments: [],
    },
  ] as Fund[],
  investment_count: 450,
  portfolio_exits: 120,
};

export const MOCK_SETTINGS = {
  theme: 'system',
  notifications_enabled: true,
  email_digest: 'weekly',
};
