-- Activity Events (audit trail, timeline)
-- Run after: organizations, profiles exist

CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resource_type text,
  resource_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_org ON activity_events (org_id, created_at DESC);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access activity_events" ON activity_events FOR ALL USING (auth.role() = 'service_role');
