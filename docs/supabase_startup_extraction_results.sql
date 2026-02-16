-- ============================================================
-- Startup Extraction Results (run after supabase_apollo_enrichment.sql)
-- Stores pipeline output: OCR, founder, charts, KV extraction.
-- ============================================================

CREATE TABLE IF NOT EXISTS startup_extraction_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  extraction_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startup_extraction_org_id ON startup_extraction_results (org_id);

ALTER TABLE startup_extraction_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can read extraction results" ON startup_extraction_results;
CREATE POLICY "Org members can read extraction results"
  ON startup_extraction_results FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Service role full access extraction" ON startup_extraction_results;
CREATE POLICY "Service role full access extraction"
  ON startup_extraction_results FOR ALL
  USING (auth.role() = 'service_role');
