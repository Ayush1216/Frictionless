/**
 * Startup Frictionless questionnaire options.
 * Matches API validation and rubric schema (company.*, overview.*, funds.*, biz.*).
 * Questions are single-choice unless multiSelect is true.
 */
export const QUESTIONNAIRE = {
  primary_sector: {
    question: 'What category describes you the best?',
    multiSelect: true,
    options: [
    { value: 'saas_b2b', label: 'B2B Software (SaaS)' },
    { value: 'marketplace', label: 'Marketplace / Platform' },
    { value: 'consumer_app', label: 'Consumer App (Digital)' },
    { value: 'saas_enterprise', label: 'Enterprise Software' },
    { value: 'fintech', label: 'Fintech / Financial Services' },
    { value: 'healthtech', label: 'Healthcare / Life Sciences' },
    { value: 'hardware_iot', label: 'Hardware / IoT / Robotics' },
    { value: 'deeptech_ip', label: 'Deep Tech / Research-heavy' },
    { value: 'cpg_d2c', label: 'Consumer Products / CPG / D2C' },
    { value: 'other', label: 'Other / Not Sure' },
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
    { value: 'c_corp', label: 'C-Corp (Delaware or other state)' },
    { value: 'non_us_equiv', label: 'Non-US equivalent (Ltd, GmbH, etc.)' },
    { value: 'pbc_bcorp', label: 'Public Benefit Corp / B-Corp' },
    { value: 'llc_converting', label: 'LLC – converting to C-Corp' },
    { value: 'scorp_converting', label: 'S-Corp – conversion planned' },
    { value: 'partnership_converting', label: 'Partnership / LP – conversion planned' },
    { value: 'llc_no_convert', label: 'LLC – no conversion plan' },
    { value: 'scorp_no_convert', label: 'S-Corp – no conversion plan' },
    { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
    { value: 'no_entity', label: 'No entity formed yet' },
    { value: 'nonprofit', label: 'Nonprofit / Fiscal Sponsorship' },
    { value: 'other_unknown', label: 'Other / Unknown' },
  ] as const,
  },
  revenue_model: {
    question: 'How does your company generate (or plan to generate) revenue?',
    multiSelect: true,
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
