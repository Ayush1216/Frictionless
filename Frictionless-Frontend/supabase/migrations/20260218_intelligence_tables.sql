-- Intelligence chat persistence tables
-- Run via Supabase dashboard SQL editor or migration tool

CREATE TABLE IF NOT EXISTS intelligence_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL DEFAULT 'New Thread',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intelligence_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES intelligence_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system-card')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_intel_threads_org ON intelligence_threads(org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_messages_thread ON intelligence_messages(thread_id, created_at);

-- RLS
ALTER TABLE intelligence_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org threads" ON intelligence_threads
  FOR ALL USING (org_id = (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users see own thread messages" ON intelligence_messages
  FOR ALL USING (thread_id IN (SELECT id FROM intelligence_threads WHERE org_id = (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() LIMIT 1)));
