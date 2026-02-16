-- ============================================================
-- Startup Readiness Results (run after supabase_startup_readiness_questionnaire.sql)
-- Stores readiness scoring output: scored_rubric + score_summary JSON.
-- ============================================================

CREATE TABLE IF NOT EXISTS startup_readiness_results (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  scored_rubric jsonb NOT NULL,
  score_summary jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_readiness_results_org ON startup_readiness_results (org_id);

ALTER TABLE startup_readiness_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can read readiness results" ON startup_readiness_results;
CREATE POLICY "Org members can read readiness results"
  ON startup_readiness_results FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Service role full access readiness results" ON startup_readiness_results;
CREATE POLICY "Service role full access readiness results"
  ON startup_readiness_results FOR ALL
  USING (auth.role() = 'service_role');
