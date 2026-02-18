-- Person Provenance (canonical person + evidence for Add Person)
-- Run after: organizations exist

CREATE TABLE IF NOT EXISTS person_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  identity_key text NOT NULL,
  person_jsonb jsonb NOT NULL,
  confidence_score float,
  evidence_links jsonb DEFAULT '[]',
  evidence_snippets jsonb DEFAULT '[]',
  source text NOT NULL DEFAULT 'linkedin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, identity_key)
);

CREATE INDEX IF NOT EXISTS idx_person_provenance_org ON person_provenance (org_id);

ALTER TABLE person_provenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access person_provenance" ON person_provenance FOR ALL USING (auth.role() = 'service_role');
