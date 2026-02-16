export interface DummyTask {
  id: string;
  task_group_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done' | 'trash';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string | null;
  assigned_to?: string | null;
  requires_rescore: boolean;
  completion_source?: 'manual' | 'ai_file_upload' | 'ai_chat';
  created_at: string;
  updated_at: string;
}

export interface DummyTaskGroup {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  tasks: DummyTask[];
}

const now = new Date().toISOString();
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

export const dummyTaskGroups: DummyTaskGroup[] = [
  {
    id: 'tg-storytelling',
    category: 'Storytelling & Pitch',
    title: 'Storytelling & Pitch',
    description: 'Refine your narrative and pitch materials',
    impact: 'high',
    tasks: [
      { id: 't-1', task_group_id: 'tg-storytelling', title: 'Upload pitch deck', description: 'Upload your latest pitch deck PDF', status: 'done', priority: 'critical', due_date: lastWeek, assigned_to: null, requires_rescore: true, completion_source: 'ai_file_upload', created_at: lastWeek, updated_at: now },
      { id: 't-2', task_group_id: 'tg-storytelling', title: 'Add competitive analysis slide', description: 'Include slide comparing your solution to 3-5 competitors', status: 'in_progress', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: true, created_at: lastWeek, updated_at: now },
      { id: 't-3', task_group_id: 'tg-storytelling', title: 'Refine problem statement', description: 'Sharpen the problem statement to be specific and quantified', status: 'todo', priority: 'high', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-4', task_group_id: 'tg-storytelling', title: 'Update market sizing', description: 'Add TAM/SAM/SOM analysis with credible sources', status: 'todo', priority: 'medium', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-5', task_group_id: 'tg-storytelling', title: 'Record 60-second pitch video', description: 'Optional: Record a short video pitch for async sharing', status: 'todo', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-6', task_group_id: 'tg-storytelling', title: 'Add traction slide to deck', description: 'Include key metrics and milestones achieved', status: 'done', priority: 'medium', due_date: lastWeek, assigned_to: null, requires_rescore: true, completion_source: 'manual', created_at: lastWeek, updated_at: now },
      { id: 't-7', task_group_id: 'tg-storytelling', title: 'Draft one-pager', description: 'Create a one-page company overview for quick sharing', status: 'trash', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-8', task_group_id: 'tg-storytelling', title: 'Align deck with data room', description: 'Ensure pitch deck numbers match financial model', status: 'todo', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
    ],
  },
  {
    id: 'tg-founder',
    category: 'Founder & Team',
    title: 'Founder & Team',
    description: 'Showcase your team and key hires',
    impact: 'high',
    tasks: [
      { id: 't-9', task_group_id: 'tg-founder', title: 'Complete team bios', description: 'Add bios for all founders and key executives', status: 'done', priority: 'critical', due_date: lastWeek, assigned_to: null, requires_rescore: true, completion_source: 'manual', created_at: lastWeek, updated_at: now },
      { id: 't-10', task_group_id: 'tg-founder', title: 'Add founder photos', description: 'Upload professional headshots for founders', status: 'done', priority: 'medium', due_date: lastWeek, assigned_to: null, requires_rescore: false, completion_source: 'manual', created_at: lastWeek, updated_at: now },
      { id: 't-11', task_group_id: 'tg-founder', title: 'Link LinkedIn profiles', description: 'Add LinkedIn URLs for all team members', status: 'in_progress', priority: 'medium', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: now },
      { id: 't-12', task_group_id: 'tg-founder', title: 'Add advisor section', description: 'List key advisors and their affiliations', status: 'todo', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-13', task_group_id: 'tg-founder', title: 'Document key hire plan', description: 'Outline next 3-5 key hires and timeline', status: 'todo', priority: 'medium', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-14', task_group_id: 'tg-founder', title: 'Add diversity & inclusion statement', description: 'Optional: Share your D&I approach', status: 'trash', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-15', task_group_id: 'tg-founder', title: 'Include board composition', description: 'List current board members if applicable', status: 'todo', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
    ],
  },
  {
    id: 'tg-product',
    category: 'Product & Technology',
    title: 'Product & Technology',
    description: 'Demonstrate product maturity and roadmap',
    impact: 'high',
    tasks: [
      { id: 't-16', task_group_id: 'tg-product', title: 'Upload product demo video', description: 'Record a 3-5 minute product walkthrough', status: 'done', priority: 'high', due_date: lastWeek, assigned_to: null, requires_rescore: true, completion_source: 'manual', created_at: lastWeek, updated_at: now },
      { id: 't-17', task_group_id: 'tg-product', title: 'Document tech stack', description: 'List core technologies and infrastructure', status: 'in_progress', priority: 'medium', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: now },
      { id: 't-18', task_group_id: 'tg-product', title: 'Add product roadmap', description: 'Share 6-12 month product roadmap', status: 'todo', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-19', task_group_id: 'tg-product', title: 'Document security posture', description: 'SOC 2, ISO, or other certifications', status: 'todo', priority: 'high', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-20', task_group_id: 'tg-product', title: 'Add architecture diagram', description: 'High-level system architecture overview', status: 'todo', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-21', task_group_id: 'tg-product', title: 'Include IP strategy', description: 'Patents filed or in progress', status: 'todo', priority: 'medium', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-22', task_group_id: 'tg-product', title: 'Add scalability notes', description: 'How the product scales with growth', status: 'trash', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
    ],
  },
  {
    id: 'tg-foundational',
    category: 'Foundational Setup',
    title: 'Foundational Setup',
    description: 'Ensure legal and operational foundations are in place',
    impact: 'medium',
    tasks: [
      { id: 't-23', task_group_id: 'tg-foundational', title: 'Upload certificate of incorporation', description: 'Current certificate of incorporation', status: 'done', priority: 'critical', due_date: lastWeek, assigned_to: null, requires_rescore: false, completion_source: 'ai_file_upload', created_at: lastWeek, updated_at: now },
      { id: 't-24', task_group_id: 'tg-foundational', title: 'Upload bylaws', description: 'Company bylaws document', status: 'done', priority: 'high', due_date: lastWeek, assigned_to: null, requires_rescore: false, completion_source: 'manual', created_at: lastWeek, updated_at: now },
      { id: 't-25', task_group_id: 'tg-foundational', title: 'Upload cap table', description: 'Most recent cap table with ownership breakdown', status: 'in_progress', priority: 'critical', due_date: nextWeek, assigned_to: null, requires_rescore: true, created_at: lastWeek, updated_at: now },
      { id: 't-26', task_group_id: 'tg-foundational', title: 'Add 83(b) election confirmations', description: 'Confirm all founders filed 83(b) elections', status: 'todo', priority: 'high', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-27', task_group_id: 'tg-foundational', title: 'Upload SAFE/Note agreements', description: 'Current convertible instruments', status: 'todo', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-28', task_group_id: 'tg-foundational', title: 'Add insurance documentation', description: 'D&O, E&O, cyber insurance', status: 'todo', priority: 'medium', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-29', task_group_id: 'tg-foundational', title: 'Verify registered agent', description: 'Confirm registered agent is current', status: 'trash', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
    ],
  },
  {
    id: 'tg-metrics',
    category: 'Metrics & Financials',
    title: 'Metrics & Financials',
    description: 'Provide financial models and key metrics',
    impact: 'high',
    tasks: [
      { id: 't-30', task_group_id: 'tg-metrics', title: 'Upload financial model', description: '3-5 year financial projections', status: 'done', priority: 'critical', due_date: lastWeek, assigned_to: null, requires_rescore: true, completion_source: 'ai_file_upload', created_at: lastWeek, updated_at: now },
      { id: 't-31', task_group_id: 'tg-metrics', title: 'Add unit economics breakdown', description: 'CAC, LTV, payback period, gross margin', status: 'in_progress', priority: 'critical', due_date: nextWeek, assigned_to: null, requires_rescore: true, created_at: lastWeek, updated_at: now },
      { id: 't-32', task_group_id: 'tg-metrics', title: 'Include burn and runway', description: 'Monthly burn rate and months of runway', status: 'done', priority: 'high', due_date: lastWeek, assigned_to: null, requires_rescore: true, completion_source: 'manual', created_at: lastWeek, updated_at: now },
      { id: 't-33', task_group_id: 'tg-metrics', title: 'Add revenue breakdown', description: 'Revenue by product, segment, or geography', status: 'todo', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-34', task_group_id: 'tg-metrics', title: 'Upload historical P&L', description: 'Last 12-24 months if applicable', status: 'todo', priority: 'medium', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-35', task_group_id: 'tg-metrics', title: 'Document key assumptions', description: 'Assumptions behind projections', status: 'todo', priority: 'medium', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-36', task_group_id: 'tg-metrics', title: 'Add cohort analysis', description: 'Retention and expansion by cohort', status: 'todo', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-37', task_group_id: 'tg-metrics', title: 'Include scenario analysis', description: 'Best/base/worst case projections', status: 'trash', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
    ],
  },
  {
    id: 'tg-gtm',
    category: 'Go-To-Market Strategy',
    title: 'Go-To-Market Strategy',
    description: 'Articulate sales and marketing strategy',
    impact: 'high',
    tasks: [
      { id: 't-38', task_group_id: 'tg-gtm', title: 'Document sales motion', description: 'How you acquire and close customers', status: 'in_progress', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: now },
      { id: 't-39', task_group_id: 'tg-gtm', title: 'Add customer segments', description: 'Define ICP and target segments', status: 'done', priority: 'high', due_date: lastWeek, assigned_to: null, requires_rescore: true, completion_source: 'manual', created_at: lastWeek, updated_at: now },
      { id: 't-40', task_group_id: 'tg-gtm', title: 'Include pricing strategy', description: 'Pricing model and packaging', status: 'todo', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-41', task_group_id: 'tg-gtm', title: 'Add channel strategy', description: 'Direct, partner, self-serve channels', status: 'todo', priority: 'medium', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-42', task_group_id: 'tg-gtm', title: 'Document marketing plan', description: 'Planned marketing spend and tactics', status: 'todo', priority: 'medium', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-43', task_group_id: 'tg-gtm', title: 'Include partnership roadmap', description: 'Key partnerships and integrations', status: 'todo', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-44', task_group_id: 'tg-gtm', title: 'Add competitive positioning', description: 'How you win vs alternatives', status: 'todo', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
    ],
  },
  {
    id: 'tg-traction',
    category: 'Traction & Validation',
    title: 'Traction & Validation',
    description: 'Demonstrate market validation and traction',
    impact: 'high',
    tasks: [
      { id: 't-45', task_group_id: 'tg-traction', title: 'Add key customer logos', description: 'List notable customers with permission', status: 'done', priority: 'critical', due_date: lastWeek, assigned_to: null, requires_rescore: true, completion_source: 'manual', created_at: lastWeek, updated_at: now },
      { id: 't-46', task_group_id: 'tg-traction', title: 'Include case studies', description: '1-2 detailed customer success stories', status: 'in_progress', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: now },
      { id: 't-47', task_group_id: 'tg-traction', title: 'Add NPS or satisfaction metrics', description: 'Customer satisfaction scores', status: 'todo', priority: 'medium', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-48', task_group_id: 'tg-traction', title: 'Document pilot/LOI pipeline', description: 'Active pilots and LOIs in progress', status: 'todo', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-49', task_group_id: 'tg-traction', title: 'Include testimonials', description: 'Quotes from customers or advisors', status: 'todo', priority: 'medium', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-50', task_group_id: 'tg-traction', title: 'Add awards and press', description: 'Notable press, awards, recognition', status: 'todo', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-51', task_group_id: 'tg-traction', title: 'Document churn analysis', description: 'Churn reasons and prevention strategies', status: 'todo', priority: 'high', due_date: nextWeek, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
      { id: 't-52', task_group_id: 'tg-traction', title: 'Add monthly growth metrics', description: 'MRR/ARR growth chart', status: 'trash', priority: 'low', due_date: null, assigned_to: null, requires_rescore: false, created_at: lastWeek, updated_at: lastWeek },
    ],
  },
];
