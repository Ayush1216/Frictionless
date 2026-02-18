-- Share Links (tokenized public access)
-- Run after: organizations, profiles exist

CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  share_type text NOT NULL,
  expires_at timestamptz,
  permissions jsonb DEFAULT '{"view": true}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links (token);
CREATE INDEX IF NOT EXISTS idx_share_links_org ON share_links (org_id);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access share_links" ON share_links FOR ALL USING (auth.role() = 'service_role');
