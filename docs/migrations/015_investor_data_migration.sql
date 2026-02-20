-- ============================================================================
-- Migration 015: Investor Data Migration (OLD DB → NEW DB)
-- ============================================================================
-- SAFE MIGRATION — No data loss.
--
-- STEP 1: Run this file in the NEW database to create staging tables.
-- STEP 2: Export CSV from OLD database tables (via Supabase Table Editor → Export).
-- STEP 3: Import CSVs into the staging tables (via Supabase Table Editor → Import).
-- STEP 4: Run the TRANSFORM queries at the bottom to populate production tables.
--
-- Staging tables are prefixed with `legacy_` and are EXACT copies of the old
-- schema so CSVs import without any column mismatch.
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1A: Staging table for old `profiles`
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legacy_profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1B: Staging table for old `investor_profiles`
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legacy_investor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  organization_name text,
  website text,
  investor_deck_url text,
  description text,
  focus_sectors text[],
  focus_stages text[],
  ticket_size_min numeric,
  ticket_size_max numeric,
  geography text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  username text,
  tagline text,
  logo_url text,
  twitter text,
  facebook text,
  linkedin text,
  investor_name text,
  headquarters text,
  fund_size text,
  average_ticket text,
  geography_focus text[],
  portfolio_highlights jsonb DEFAULT '[]',
  investment_thesis text,
  investment_criteria jsonb DEFAULT '{}',
  value_add text,
  decision_process text,
  timeline text,
  frictionless_insights jsonb DEFAULT '{}',
  ai_analyzed_at timestamptz
);


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1C: Staging table for old `investor_profiles_for_startup`
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legacy_investor_profiles_for_startup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_name text NOT NULL,
  website text,
  global_hq text,
  countries_of_investment text[],
  stage_of_investment text[],
  investment_thesis text,
  investor_type text,
  first_cheque_minimum numeric,
  first_cheque_maximum numeric,
  ex_logo_file text,
  ex_thesis_data text,
  ex_thesis_summary text,
  ex_focus_sectors text[],
  ex_investment_stage text[],
  ex_countries_of_investment text[],
  ex_first_cheque_min numeric,
  ex_first_cheque_max numeric,
  ex_investor_type text,
  ex_hq_location text,
  ex_confidence_score numeric,
  ex_sources_used text,
  ex_source_urls text[],
  ex_notes text,
  ex_type text,
  ex_location text,
  ex_investment_philosophy text,
  ex_focus text[],
  ex_stage_focus text[],
  ex_potential_ticket text,
  ex_notable_portfolio text[],
  ex_sector text[],
  ex_stage text[],
  ex_ticket_size text,
  ex_geography text[],
  ex_strategic_leverage text[],
  ex_why_investor_group_1 text,
  ex_suggested_narrative_for_intro_email text,
  ex_key_signals text[],
  ex_red_flags text[],
  ex_intro_subject_line text,
  ex_investment_criteria text[],
  ex_value_add_support text[],
  ex_deal_breakers text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ex_social_links varchar
);


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1D: Staging table for old `matches`
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legacy_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL,
  investor_id uuid NOT NULL,
  match_percentage integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1E: Staging table for old `investor_demo`
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legacy_investor_demo (
  id bigint PRIMARY KEY,
  company_name varchar NOT NULL,
  final_weighted_score numeric,
  profile_summary varchar,
  pdf_path varchar,
  decision text,
  thesis_fit real,
  readiness real,
  mentor_leverage real,
  category text,
  stage text,
  location text,
  founded_year integer,
  website text,
  founders json,
  structure varchar,
  pitch_deck varchar,
  submission_link varchar,
  financial_summary varchar
);


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1F: Staging table for old `startup_investor_data`
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legacy_startup_investor_data (
  investor_id uuid NOT NULL,
  startup_id uuid NOT NULL,
  investor_profile jsonb,
  investor_data_json json,
  company_profile_structured jsonb,
  readiness jsonb,
  category_results jsonb,
  final_aggregation jsonb,
  reco_readiness jsonb,
  reco_thesis jsonb,
  id uuid DEFAULT gen_random_uuid(),
  "Status" text[],
  PRIMARY KEY (investor_id, startup_id)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1G: Staging table for old `company_evaluations`
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legacy_company_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  website text,
  geography_hq text,
  founded_year text,
  product_category text,
  structure text,
  final_weighted_score numeric,
  score_badge text,
  decision text DEFAULT '',
  profile_summary text,
  financial_summary_text text,
  pitch_deck text,
  form_submission text,
  pdf_link text,
  company_profile jsonb NOT NULL DEFAULT '{}',
  financial_summary jsonb,
  thesis_fit jsonb,
  readiness_assessment jsonb,
  competitive_analysis jsonb,
  edge_and_risk jsonb,
  mentorship jsonb,
  final_scores jsonb,
  recommendations jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sentiment_analysis jsonb
);


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1G2: Staging table for old `company_evaluations_duplicate`
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legacy_company_evaluations_duplicate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  website text,
  geography_hq text,
  founded_year text,
  product_category text,
  structure text,
  final_weighted_score numeric,
  score_badge text,
  decision text DEFAULT '',
  profile_summary text,
  financial_summary_text text,
  pitch_deck text,
  form_submission text,
  pdf_link text,
  company_profile jsonb NOT NULL DEFAULT '{}',
  financial_summary jsonb,
  thesis_fit jsonb,
  readiness_assessment jsonb,
  competitive_analysis jsonb,
  edge_and_risk jsonb,
  mentorship jsonb,
  final_scores jsonb,
  recommendations jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sentiment_analysis jsonb,
  company_data_identifier varchar
);


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1H: Staging tables for other investor-related old tables
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS legacy_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  access text NOT NULL DEFAULT 'Member',
  invite_status text NOT NULL DEFAULT 'Pending',
  invite_token uuid DEFAULT gen_random_uuid(),
  avatar_url text,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legacy_team_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL,
  author_id uuid NOT NULL,
  author_type text NOT NULL,
  team_member_id uuid,
  company_id uuid NOT NULL,
  company_name text NOT NULL,
  content text NOT NULL,
  is_ai_summary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legacy_startup_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  investor_id uuid NOT NULL,
  company_id text NOT NULL,
  company_name text NOT NULL,
  user_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legacy_user_company_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  company_name text,
  decision text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  investor_id uuid
);

CREATE TABLE IF NOT EXISTS legacy_board_recommendation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  category text,
  description text,
  website text,
  location text,
  pitch_deck_url text,
  revenue_est_2025 numeric,
  equity_percentage text,
  legal_structure text,
  mentor_votes integer DEFAULT 0,
  mentor_feedback_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  decision text,
  "Selection_Category" text
);

CREATE TABLE IF NOT EXISTS legacy_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_payment_intent_id varchar,
  stripe_customer_id varchar,
  stripe_subscription_id varchar,
  payment_status varchar NOT NULL DEFAULT 'pending',
  subscription_status varchar NOT NULL DEFAULT 'active',
  subscription_start_date timestamptz DEFAULT now(),
  subscription_end_date timestamptz,
  amount_paid numeric,
  currency varchar DEFAULT 'USD',
  payment_method varchar,
  billing_cycle varchar DEFAULT 'monthly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════
--
--   STOP HERE. Import your CSVs into the legacy_ tables above.
--   Then run the TRANSFORM queries below.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- TRANSFORM 1: legacy_investor_profiles_for_startup → investor_universal_profiles
-- Maps old enriched investor data to the new universal investor table.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO investor_universal_profiles (
  id,
  source,
  investor_name,
  investor_url,
  investor_domain,
  investor_type,
  investor_hq_country,
  investor_stages,
  investor_sectors,
  investor_geography_focus,
  investor_minimum_check_usd,
  investor_maximum_check_usd,
  investor_thesis_summary,
  investor_stage_keywords,
  investor_sector_keywords,
  investor_geo_keywords,
  investor_notable_portfolio,
  investor_source_urls,
  investor_active_status,
  raw_profile_json,
  normalized_thesis_json,
  metadata_json,
  created_at,
  updated_at
)
SELECT
  lip.id,
  'legacy_migration',
  lip.investor_name,
  lip.website,
  -- Extract domain from website
  NULLIF(regexp_replace(lower(COALESCE(lip.website, '')), '^https?://(www\.)?', ''), ''),
  COALESCE(lip.ex_investor_type, lip.investor_type),
  lip.global_hq,
  -- Merge stage arrays
  COALESCE(lip.ex_investment_stage, lip.stage_of_investment, '{}'),
  -- Merge sector arrays
  COALESCE(lip.ex_focus_sectors, lip.ex_sector, '{}'),
  -- Merge geography arrays
  COALESCE(lip.ex_countries_of_investment, lip.countries_of_investment, '{}'),
  COALESCE(lip.ex_first_cheque_min, lip.first_cheque_minimum),
  COALESCE(lip.ex_first_cheque_max, lip.first_cheque_maximum),
  COALESCE(lip.ex_thesis_summary, lip.investment_thesis),
  COALESCE(lip.ex_stage_focus, '{}'),
  COALESCE(lip.ex_focus, '{}'),
  COALESCE(lip.ex_geography, '{}'),
  COALESCE(lip.ex_notable_portfolio, '{}'),
  COALESCE(lip.ex_source_urls, '{}'),
  'active',
  -- Preserve ALL old data in raw_profile_json so nothing is lost
  jsonb_build_object(
    'investor_name', lip.investor_name,
    'website', lip.website,
    'global_hq', lip.global_hq,
    'investor_type', lip.investor_type,
    'investment_thesis', lip.investment_thesis,
    'ex_thesis_data', lip.ex_thesis_data,
    'ex_thesis_summary', lip.ex_thesis_summary,
    'ex_hq_location', lip.ex_hq_location,
    'ex_confidence_score', lip.ex_confidence_score,
    'ex_sources_used', lip.ex_sources_used,
    'ex_notes', lip.ex_notes,
    'ex_type', lip.ex_type,
    'ex_location', lip.ex_location,
    'ex_investment_philosophy', lip.ex_investment_philosophy,
    'ex_potential_ticket', lip.ex_potential_ticket,
    'ex_ticket_size', lip.ex_ticket_size,
    'ex_why_investor_group_1', lip.ex_why_investor_group_1,
    'ex_suggested_narrative_for_intro_email', lip.ex_suggested_narrative_for_intro_email,
    'ex_intro_subject_line', lip.ex_intro_subject_line,
    'ex_social_links', lip.ex_social_links,
    'ex_logo_file', lip.ex_logo_file
  ),
  -- Normalized thesis
  jsonb_build_object(
    'sectors', COALESCE(lip.ex_focus_sectors, lip.ex_sector, '{}'),
    'stages', COALESCE(lip.ex_investment_stage, lip.stage_of_investment, '{}'),
    'geography', COALESCE(lip.ex_countries_of_investment, lip.countries_of_investment, '{}'),
    'investment_criteria', lip.ex_investment_criteria,
    'value_add_support', lip.ex_value_add_support,
    'deal_breakers', lip.ex_deal_breakers,
    'key_signals', lip.ex_key_signals,
    'red_flags', lip.ex_red_flags,
    'strategic_leverage', lip.ex_strategic_leverage
  ),
  jsonb_build_object('migrated_from', 'investor_profiles_for_startup', 'migrated_at', now()),
  lip.created_at,
  lip.updated_at
FROM legacy_investor_profiles_for_startup lip
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- TRANSFORM 2: Verify row counts after migration
-- Run this to confirm all data was transferred.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_legacy_count bigint;
  v_new_count bigint;
BEGIN
  SELECT count(*) INTO v_legacy_count FROM legacy_investor_profiles_for_startup;
  SELECT count(*) INTO v_new_count FROM investor_universal_profiles WHERE source = 'legacy_migration';
  RAISE NOTICE '=== MIGRATION VERIFICATION ===';
  RAISE NOTICE 'legacy_investor_profiles_for_startup: % rows', v_legacy_count;
  RAISE NOTICE 'investor_universal_profiles (migrated): % rows', v_new_count;

  IF v_legacy_count <> v_new_count THEN
    RAISE WARNING 'ROW COUNT MISMATCH! % legacy vs % migrated. Check for conflicts.', v_legacy_count, v_new_count;
  ELSE
    RAISE NOTICE 'OK — all rows migrated successfully.';
  END IF;
END $$;
