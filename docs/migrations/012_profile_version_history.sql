-- Profile Version History (field-level change log for company profile)
-- Run after: organizations exist
-- Rollback: DROP TABLE profile_version_history;

CREATE TABLE IF NOT EXISTS profile_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  field_path text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  change_type text NOT NULL DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'delete')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_version_history_org ON profile_version_history (org_id, created_at DESC);

ALTER TABLE profile_version_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access profile_version_history" ON profile_version_history FOR ALL USING (auth.role() = 'service_role');
