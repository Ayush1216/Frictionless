/**
 * Startup readiness questionnaire options.
 * Matches API validation and rubric schema (company.*, overview.*, funds.*, biz.*).
 * Each question is single-choice with multiple options.
 */
export const QUESTIONNAIRE = {
  primary_sector: {
    question: 'What best describes your company\'s primary business model or sector?',
    options: [
    { value: 'b2b_saas', label: 'B2B SaaS' },
    { value: 'b2c_consumer', label: 'B2C Consumer' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'd2c_ecommerce', label: 'D2C / E-commerce' },
    { value: 'platform', label: 'Platform' },
    { value: 'hardware_deeptech', label: 'Hardware / Deep Tech' },
    { value: 'services', label: 'Services' },
    { value: 'fintech', label: 'Fintech' },
    { value: 'healthtech', label: 'Healthtech' },
    { value: 'other', label: 'Other' },
  ] as const,
  },
  product_status: {
    question: 'What is your product\'s current status?',
    options: [
    { value: 'idea', label: 'Idea' },
    { value: 'mvp', label: 'MVP' },
    { value: 'beta', label: 'Beta' },
    { value: 'launched', label: 'Launched' },
    { value: 'scaling', label: 'Scaling' },
  ] as const,
  },
  funding_stage: {
    question: 'What is your current funding stage?',
    options: [
    { value: 'preseed', label: 'Pre-seed' },
    { value: 'seed', label: 'Seed' },
    { value: 'series_a', label: 'Series A' },
    { value: 'series_b', label: 'Series B' },
    { value: 'series_c_plus', label: 'Series C+' },
  ] as const,
  },
  round_target: {
    question: 'What is your target raise amount for this round?',
    options: [
    { value: 'under_100k', label: 'Under $100K' },
    { value: '100k_250k', label: '$100K – $250K' },
    { value: '250k_500k', label: '$250K – $500K' },
    { value: '500k_1m', label: '$500K – $1M' },
    { value: '1m_2m', label: '$1M – $2M' },
    { value: '2m_5m', label: '$2M – $5M' },
    { value: '5m_plus', label: '$5M+' },
    { value: 'other', label: 'Other' },
  ] as const,
  },
  entity_type: {
    question: 'What type of legal entity is your company?',
    options: [
    { value: 'c_corp', label: 'C-Corp' },
    { value: 'llc', label: 'LLC' },
    { value: 'other', label: 'Other' },
    { value: 'unknown', label: 'Unknown' },
  ] as const,
  },
  revenue_model: {
    question: 'How does your company generate (or plan to generate) revenue?',
    options: [
    { value: 'subscription', label: 'Subscription' },
    { value: 'usage', label: 'Usage-based' },
    { value: 'transaction', label: 'Transaction / Take rate' },
    { value: 'licensing', label: 'Licensing' },
    { value: 'ad', label: 'Ad-supported' },
    { value: 'not_monetizing', label: 'Not yet monetizing' },
  ] as const,
  },
} as const;

export type QuestionnaireAnswers = {
  primary_sector: string;
  product_status: string;
  funding_stage: string;
  round_target: string;
  entity_type: string;
  revenue_model: string;
};
