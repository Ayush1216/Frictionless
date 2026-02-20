/**
 * Database entity types for the Frictionless Intelligence platform.
 * These types match the schema and relations used across the application.
 */

// ---------------------------------------------------------------------------
// Core Organization & Location
// ---------------------------------------------------------------------------

export type OrgType = 'startup' | 'capital_provider' | 'accelerator';

export interface Org {
  id: string;
  name: string;
  org_type: OrgType;
  logo_url: string | null;
  website: string | null;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface HQLocation {
  city: string;
  state: string;
  country: string;
}

// ---------------------------------------------------------------------------
// Sector & Subsector
// ---------------------------------------------------------------------------

export interface Sector {
  code: string;
  name: string;
}

export interface SubSector {
  code: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Founder
// ---------------------------------------------------------------------------

export interface Founder {
  full_name: string;
  title: string;
  photo_url: string | null;
  linkedin_url: string | null;
  bio: string | null;
  is_primary: boolean;
}

// ---------------------------------------------------------------------------
// Startup Metrics
// ---------------------------------------------------------------------------

export interface StartupMetrics {
  mrr: number | null;
  arr: number | null;
  revenue_ttm: number | null;
  gross_margin_pct: number | null;
  burn_monthly: number | null;
  runway_months: number | null;
  headcount: number | null;
  customer_count: number | null;
  cac: number | null;
  ltv: number | null;
  churn_rate_pct: number | null;
  nps_score: number | null;
}

export interface MonthlyMetric {
  month: string;
  metrics: StartupMetrics;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

export type AssessmentBadge = 'exceptional' | 'strong' | 'promising' | 'developing' | 'early';

export type MissingDataSeverity = 'high' | 'medium' | 'low';

export interface MissingDataItem {
  item: string;
  severity: MissingDataSeverity;
}

export interface AssessmentCategory {
  name: string;
  score: number;
  delta: number;
  weight: number;
}

export interface Assessment {
  overall_score: number;
  badge: AssessmentBadge;
  categories: AssessmentCategory[];
  missing_data: MissingDataItem[];
}

export interface AssessmentRun {
  id: string;
  startup_org_id: string;
  run_number: number;
  overall_score: number;
  badge: AssessmentBadge;
  scored_at: string;
  categories: AssessmentCategory[];
  delta_from_previous: number;
}

// ---------------------------------------------------------------------------
// Startup Profile
// ---------------------------------------------------------------------------

export interface StartupProfile {
  org_id: string;
  org: Org;
  sector: Sector | null;
  subsector: SubSector | null;
  stage: string | null;
  business_model: string | null;
  founded_year: number | null;
  employee_count: number | null;
  hq_location: HQLocation | null;
  short_summary: string | null;
  pitch_summary: string | null;
  current_Readiness_score: number | null;
  score_delta: number | null;
  latest_metrics: StartupMetrics | null;
  tags: string[];
  founders: Founder[];
  assessment: Assessment | null;
}

// ---------------------------------------------------------------------------
// Capital Provider
// ---------------------------------------------------------------------------

export type CapitalProviderType = 'vc' | 'angel' | 'bank' | 'grant' | 'family_office' | 'cvc';

export type TeamMemberRole = 'partner' | 'principal' | 'associate' | 'analyst' | 'venture_partner';

export interface TeamMember {
  id: string;
  full_name: string;
  title: string;
  photo_url: string | null;
  email: string | null;
  bio: string | null;
  role: TeamMemberRole;
}

export type InvestmentStatus = 'active' | 'exited' | 'written_off';

export interface Investment {
  id: string;
  startup_name: string;
  sector: string;
  stage: string;
  amount: number;
  date: string;
  status: InvestmentStatus;
}

export type FundStatus = 'active' | 'deploying' | 'closed';

export interface Fund {
  id: string;
  name: string;
  vintage_year: number;
  target_size: number;
  capital_deployed: number;
  capital_remaining_pct: number;
  status: FundStatus;
  investments: Investment[];
}

export interface CapitalProvider {
  org_id: string;
  org: Org;
  provider_type: CapitalProviderType;
  aum_usd: number | null;
  check_size_min: number | null;
  check_size_max: number | null;
  sweet_spot: string | null;
  preferred_stages: string[];
  preferred_sectors: string[];
  thesis_summary: string | null;
  team_members: TeamMember[];
  funds: Fund[];
  investment_count: number;
  portfolio_exits: number;
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

export type MatchStatus = 'new' | 'viewed' | 'saved' | 'contacted' | 'passed';

export interface MatchBreakdown {
  dimension: string;
  score: number;
  weight: number;
  detail: string;
}

export interface Match {
  id: string;
  startup_org_id: string;
  capital_provider_org_id: string;
  overall_score: number;
  score_delta: number;
  match_date: string;
  status: MatchStatus;
  breakdown: MatchBreakdown[];
  investor: CapitalProvider;
  ai_explanation?: string;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'trash';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type CompletionSource = 'manual' | 'ai_file_upload' | 'ai_chat';

export interface AIExtraction {
  field: string;
  value: string | number | boolean | null;
  confidence: number;
}

export interface TaskComment {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

export type TaskEventType = 'created' | 'status_changed' | 'completed' | 'commented' | 'file_uploaded';

export interface TaskEvent {
  id: string;
  type: TaskEventType;
  description: string;
  created_at: string;
}

export interface Task {
  id: string;
  task_group_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  requires_rescore: boolean;
  potential_points?: number;
  /** Set by AI when it suggests completion; used to show "Mark task complete" and send on complete. */
  submitted_value?: string | null;
  completion_source?: CompletionSource;
  ai_extractions?: AIExtraction[];
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  comments: TaskComment[];
  events: TaskEvent[];
}

export type TaskImpact = 'high' | 'medium' | 'low';

export interface TaskGroup {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: TaskImpact;
  tasks: Task[];
  /** Total rubric items in this category (for progress). From backend. */
  total_in_category?: number;
  /** Rubric items at max in this category (for progress). From backend. */
  done_count?: number;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export type DocumentCategory = 'pitch_deck' | 'financial_model' | 'cap_table' | 'legal' | 'data_room' | 'other';

export type ValidationStatus = 'pending' | 'valid' | 'invalid' | 'expired';

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
  validation_status: ValidationStatus;
  url?: string;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'system-card';

export interface ChatAttachment {
  name: string;
  storage_path: string;
  mime_type: string;
  file_size?: number;
  status?: 'uploading' | 'processing' | 'ready' | 'error';
}

export interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: ChatMessageRole;
  content: string;
  attachments?: ChatAttachment[];
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Accelerator
// ---------------------------------------------------------------------------

export type AcceleratorProgramStatus = 'upcoming' | 'active' | 'completed';

export interface ProgramStage {
  id: string;
  name: string;
  order: number;
  description: string;
}

export interface AcceleratorProgram {
  id: string;
  org_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: AcceleratorProgramStatus;
  startup_count: number;
  mentor_count: number;
  stages: ProgramStage[];
}

export interface ProgramStartup {
  id: string;
  program_id: string;
  startup: StartupProfile;
  stage_id: string;
  mentor?: TeamMember;
  score: number | null;
  notes: string | null;
}

export interface Mentor {
  id: string;
  full_name: string;
  title: string;
  company: string;
  photo_url: string | null;
  bio: string | null;
  expertise: string[];
  assigned_startups: number;
}

// ---------------------------------------------------------------------------
// Notification & Activity
// ---------------------------------------------------------------------------

export type NotificationType = 'score_change' | 'new_match' | 'task_due' | 'message' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export type UserRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  org_id: string;
  org_type: OrgType;
  org_name: string;
  role: UserRole;
}

// ---------------------------------------------------------------------------
// Investor Matching (thesis-fit pipeline)
// ---------------------------------------------------------------------------

export interface SubcategoryScore {
  raw_points: number;
  max_point: number;
  option_chosen: string;
}

export interface CategoryBreakdown {
  raw_points: number;
  max_point: number;
  weight: number;
  weighted_contribution: number;
  subcategories: Record<string, SubcategoryScore>;
}

export interface InvestorUniversalProfile {
  id: string;
  name: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  investor_type: string | null;
  check_min_usd: number | null;
  check_max_usd: number | null;
  check_typical_usd: number | null;
  stages: string[] | string | null;
  sectors: string[] | string | null;
}

export interface InvestorMatchResult {
  id?: string;
  org_id: string;
  investor_id: string;
  fit_score_0_to_100: number;
  fit_score_if_eligible_0_to_100: number;
  eligible: boolean;
  gate_fail_reasons: string[];
  category_breakdown: Record<string, CategoryBreakdown>;
  investor_profile: InvestorUniversalProfile;
  matching_version: string;
  matched_at: string;
}
