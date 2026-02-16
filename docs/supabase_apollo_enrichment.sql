-- ============================================================
-- Apollo Organization Enrichment (run after supabase_login_signup.sql)
-- Stores Apollo API enrichment data per startup org for Gemini retrieval.
-- ============================================================

CREATE TABLE IF NOT EXISTS apollo_organization_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  domain text NOT NULL,
  apollo_organization_id text,
  raw_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apollo_enrichment_org_id ON apollo_organization_enrichment (org_id);
CREATE INDEX IF NOT EXISTS idx_apollo_enrichment_domain ON apollo_organization_enrichment (domain);

ALTER TABLE apollo_organization_enrichment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can read apollo enrichment" ON apollo_organization_enrichment;
CREATE POLICY "Org members can read apollo enrichment"
  ON apollo_organization_enrichment FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Service role full access apollo enrichment" ON apollo_organization_enrichment;
CREATE POLICY "Service role full access apollo enrichment"
  ON apollo_organization_enrichment FOR ALL
  USING (auth.role() = 'service_role');
