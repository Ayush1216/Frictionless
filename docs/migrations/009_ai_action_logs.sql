-- AI Action Logs (audit for AI-triggered actions)
-- Run after: organizations, profiles exist
-- Rollback: DROP TABLE ai_action_logs;

CREATE TABLE IF NOT EXISTS ai_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  input_summary text,
  output_summary text,
  model_used text,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_logs_org ON ai_action_logs (org_id, created_at DESC);

ALTER TABLE ai_action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access ai_action_logs" ON ai_action_logs FOR ALL USING (auth.role() = 'service_role');
