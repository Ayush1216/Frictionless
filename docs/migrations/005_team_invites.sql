-- Team Invites
-- Run after: organizations, profiles exist

CREATE TABLE IF NOT EXISTS team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invite_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites (invite_token);
CREATE INDEX IF NOT EXISTS idx_team_invites_org ON team_invites (org_id);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access team_invites" ON team_invites FOR ALL USING (auth.role() = 'service_role');
