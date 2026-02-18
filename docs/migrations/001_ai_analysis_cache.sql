-- AI Analysis Cache (readiness insights, etc.)
-- Run after: organizations exist

CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_type text NOT NULL,
  input_hash text NOT NULL,
  model_version text NOT NULL,
  result_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, analysis_type, input_hash, model_version)
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_lookup
  ON ai_analysis_cache (org_id, analysis_type, input_hash, model_version);

ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access ai_analysis_cache" ON ai_analysis_cache FOR ALL USING (auth.role() = 'service_role');
