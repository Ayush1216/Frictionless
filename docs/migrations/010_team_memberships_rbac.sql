-- Team Memberships RBAC (Owner/Admin/Editor/Viewer)
-- Run after: organization_members or equivalent exists
-- Rollback: ALTER TABLE ... DROP COLUMN role; (if column added to existing table)
-- Note: If org members live in a different table, adjust references.

-- Add role column to org memberships if table exists; otherwise create team_memberships
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_members' AND column_name = 'role') THEN
      ALTER TABLE organization_members ADD COLUMN role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_memberships') THEN
    CREATE TABLE team_memberships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(org_id, user_id)
    );
    CREATE INDEX idx_team_memberships_org ON team_memberships (org_id);
    ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Service role full access team_memberships" ON team_memberships FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
