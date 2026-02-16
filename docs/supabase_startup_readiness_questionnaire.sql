-- ============================================================
-- Startup Readiness Questionnaire (run after supabase_startup_extraction_results.sql)
-- Stores 6 required onboarding answers used for rubrics readiness score.
-- ============================================================

CREATE TABLE IF NOT EXISTS startup_readiness_questionnaire (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  primary_sector text NOT NULL,
  product_status text NOT NULL,
  funding_stage text NOT NULL,
  round_target text NOT NULL,
  entity_type text NOT NULL,
  revenue_model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_readiness_questionnaire_org ON startup_readiness_questionnaire (org_id);

ALTER TABLE startup_readiness_questionnaire ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can read questionnaire" ON startup_readiness_questionnaire;
CREATE POLICY "Org members can read questionnaire"
  ON startup_readiness_questionnaire FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Org owner/admin can insert questionnaire" ON startup_readiness_questionnaire;
CREATE POLICY "Org owner/admin can insert questionnaire"
  ON startup_readiness_questionnaire FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Org owner/admin can update questionnaire" ON startup_readiness_questionnaire;
CREATE POLICY "Org owner/admin can update questionnaire"
  ON startup_readiness_questionnaire FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Service role full access questionnaire" ON startup_readiness_questionnaire;
CREATE POLICY "Service role full access questionnaire"
  ON startup_readiness_questionnaire FOR ALL
  USING (auth.role() = 'service_role');
