-- AI Chat Threads & Messages (unified chat across app)
-- Run after: organizations, profiles exist

CREATE TABLE IF NOT EXISTS ai_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  context_type text NOT NULL DEFAULT 'general',
  context_id uuid,
  title text DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_org ON ai_chat_threads (org_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  author_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_thread ON ai_chat_messages (thread_id, created_at);

ALTER TABLE ai_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access ai_chat_threads" ON ai_chat_threads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access ai_chat_messages" ON ai_chat_messages FOR ALL USING (auth.role() = 'service_role');
