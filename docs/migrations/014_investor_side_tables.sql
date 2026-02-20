-- ============================================================================
-- Migration 014: Investor-side tables
-- Migrates investor tables from old DB schema to new DB schema.
-- Run AFTER all previous migrations (001-013).
-- ============================================================================
--
-- OLD TABLES → NEW MAPPING:
-- ─────────────────────────────────────────────────────────────────────────────
-- investor_profiles          → capital_provider_profiles (ALTER + organizations)
-- investor_profiles_for_startup → investor_universal_profiles (already exists)
-- matches                    → startup_investor_matches   (already exists)
-- team_members               → CREATE team_members        (adapted for org_id)
-- team_comments              → CREATE team_comments       (adapted for org_id)
-- startup_likes              → CREATE investor_bookmarks  (adapted for org_id)
-- user_company_decisions     → CREATE investor_company_decisions (adapted)
-- company_evaluations        → CREATE company_evaluations (AI eval per company)
-- board_recommendation       → CREATE board_recommendations (adapted)
-- subscriptions              → CREATE subscriptions       (adapted for org_id)
-- startup_investor_data      → startup_investor_matches covers this
--
-- SKIPPED (not needed):
-- Lam_Demo_Table             → demo data
-- company_evaluations_dup    → duplicate
-- investor_demo              → demo data
-- companies                  → replaced by organizations + startup_profiles
-- company_readiness_runs     → replaced by startup_readiness_results
-- readiness_assessments      → replaced by startup_readiness_results
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ALTER capital_provider_profiles — add fields from old investor_profiles
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE capital_provider_profiles
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS twitter text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS focus_sectors text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS focus_stages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS geography_focus text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ticket_size_min numeric,
  ADD COLUMN IF NOT EXISTS ticket_size_max numeric,
  ADD COLUMN IF NOT EXISTS average_ticket text,
  ADD COLUMN IF NOT EXISTS fund_size text,
  ADD COLUMN IF NOT EXISTS investment_thesis text,
  ADD COLUMN IF NOT EXISTS investment_criteria jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS value_add text,
  ADD COLUMN IF NOT EXISTS portfolio_highlights jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS frictionless_insights jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CREATE team_members — investor team (adapted from old schema)
--    Old FK: investor_id → profiles(id)
--    New FK: org_id → organizations(id), user_id → profiles(id)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'Member' CHECK (role IN ('Admin', 'Member')),
  invite_status text NOT NULL DEFAULT 'Pending' CHECK (invite_status IN ('Pending', 'Accepted')),
  invite_token uuid DEFAULT gen_random_uuid(),
  avatar_url text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members (org_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_org_email ON team_members (org_id, email);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access team_members"
  ON team_members FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CREATE team_comments — team discussion on startups
--    Old FK: investor_id → profiles(id), company_id → uuid
--    New FK: org_id → organizations(id), author_id → profiles(id)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS team_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('investor', 'team_member')),
  team_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  company_id uuid NOT NULL,
  company_name text NOT NULL,
  content text NOT NULL,
  is_ai_summary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_comments_org ON team_comments (org_id);
CREATE INDEX IF NOT EXISTS idx_team_comments_company ON team_comments (org_id, company_id);

ALTER TABLE team_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access team_comments"
  ON team_comments FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. CREATE investor_bookmarks — replaces old startup_likes
--    Old FK: user_id → auth.users, investor_id → uuid
--    New FK: org_id → organizations(id), user_id → profiles(id)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS investor_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id, company_org_id)
);

CREATE INDEX IF NOT EXISTS idx_investor_bookmarks_org ON investor_bookmarks (org_id);

ALTER TABLE investor_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access investor_bookmarks"
  ON investor_bookmarks FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. CREATE investor_company_decisions — replaces old user_company_decisions
--    Investor pass / watchlist / approve on startups
--    Old FK: user_id → auth.users, investor_id → profiles(id)
--    New FK: org_id → organizations(id), decided_by → profiles(id)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS investor_company_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  decided_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name text,
  decision text NOT NULL CHECK (decision IN (
    'Decline', 'Watchlist', 'Approved', 'Interviews', 'Offer', 'Alumni'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, company_org_id)
);

CREATE INDEX IF NOT EXISTS idx_investor_decisions_org ON investor_company_decisions (org_id);
CREATE INDEX IF NOT EXISTS idx_investor_decisions_company ON investor_company_decisions (company_org_id);

ALTER TABLE investor_company_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access investor_company_decisions"
  ON investor_company_decisions FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. CREATE company_evaluations — AI-generated evaluation of startups
--    from investor's perspective (the main investor "deal card" data)
--    Old table had all jsonb sections; new keeps same pattern.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  sentiment_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_evaluations_org ON company_evaluations (org_id);

ALTER TABLE company_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access company_evaluations"
  ON company_evaluations FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. CREATE board_recommendations — board-level deal recommendations
--    Old FK: user_id → auth.users
--    New FK: org_id → organizations(id), created_by → profiles(id)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS board_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  category text,
  description text,
  website text,
  location text,
  pitch_deck_url text,
  revenue_est numeric,
  equity_percentage text,
  legal_structure text,
  mentor_votes integer DEFAULT 0,
  mentor_feedback_summary text,
  decision text,
  selection_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_recommendations_org ON board_recommendations (org_id);

ALTER TABLE board_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access board_recommendations"
  ON board_recommendations FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. CREATE subscriptions — payment/billing data
--    Old FK: user_id → profiles(id)
--    New FK: org_id → organizations(id)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions (org_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access subscriptions"
  ON subscriptions FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════
-- 9. RLS policies for org members to read their own data
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: check if user belongs to org
CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_memberships
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

-- team_members: org members can read
CREATE POLICY "Org members can read team_members"
  ON team_members FOR SELECT
  USING (is_org_member(org_id));

-- team_comments: org members can read and insert
CREATE POLICY "Org members can read team_comments"
  ON team_comments FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "Org members can insert team_comments"
  ON team_comments FOR INSERT
  WITH CHECK (is_org_member(org_id) AND author_id = auth.uid());

-- investor_bookmarks: org members can read, insert, delete own
CREATE POLICY "Org members can read investor_bookmarks"
  ON investor_bookmarks FOR SELECT
  USING (is_org_member(org_id));

CREATE POLICY "Org members can manage own bookmarks"
  ON investor_bookmarks FOR ALL
  USING (is_org_member(org_id) AND user_id = auth.uid());

-- investor_company_decisions: org members can read
CREATE POLICY "Org members can read investor_company_decisions"
  ON investor_company_decisions FOR SELECT
  USING (is_org_member(org_id));

-- company_evaluations: org members can read
CREATE POLICY "Org members can read company_evaluations"
  ON company_evaluations FOR SELECT
  USING (is_org_member(org_id));

-- board_recommendations: org members can read
CREATE POLICY "Org members can read board_recommendations"
  ON board_recommendations FOR SELECT
  USING (is_org_member(org_id));

-- subscriptions: org members can read
CREATE POLICY "Org members can read subscriptions"
  ON subscriptions FOR SELECT
  USING (is_org_member(org_id));

-- capital_provider_profiles: org members can read (may already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'capital_provider_profiles'
      AND policyname = 'Org members can read capital_provider_profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Org members can read capital_provider_profiles"
      ON capital_provider_profiles FOR SELECT
      USING (is_org_member(org_id))';
  END IF;
END $$;
