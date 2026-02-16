-- Task AI chat conversation history
-- Run after: tasks, profiles exist

CREATE TABLE IF NOT EXISTS task_ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  author_user_id uuid REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_task_ai_chat_role
    CHECK (role IN ('user', 'assistant'))
);

-- author_user_id: set when role='user' (who sent the message), null when role='assistant'

CREATE INDEX IF NOT EXISTS idx_task_ai_chat_messages_task_created
  ON task_ai_chat_messages (task_id, created_at);

ALTER TABLE task_ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Org members can read messages for their org's tasks
CREATE POLICY "Org members can read task AI chat messages"
  ON task_ai_chat_messages FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN task_groups tg ON t.group_id = tg.id
      WHERE tg.startup_org_id IN (
        SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Org members can insert (for their own user messages; assistant messages via service role)
CREATE POLICY "Org members can insert task AI chat messages"
  ON task_ai_chat_messages FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN task_groups tg ON t.group_id = tg.id
      WHERE tg.startup_org_id IN (
        SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Service role full access (for backend)
CREATE POLICY "Service role full access task_ai_chat_messages"
  ON task_ai_chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);
