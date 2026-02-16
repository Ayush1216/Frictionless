-- Readiness Score History (for Score History graph on startup/readiness)
-- Run after supabase_startup_readiness_results / login signup setup

CREATE TABLE IF NOT EXISTS readiness_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  update_source text NOT NULL DEFAULT 'manual',  -- e.g. manual, onboarding, profile_update, asset_upload, task_update, scheduled
  note text
);

CREATE INDEX IF NOT EXISTS idx_rsh_startup_time
  ON readiness_score_history (startup_org_id, updated_at);

ALTER TABLE readiness_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can read readiness score history" ON readiness_score_history;
CREATE POLICY "Org members can read readiness score history"
  ON readiness_score_history FOR SELECT
  USING (
    startup_org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Service role full access readiness score history" ON readiness_score_history;
CREATE POLICY "Service role full access readiness score history"
  ON readiness_score_history FOR ALL
  USING (true)
  WITH CHECK (true);
