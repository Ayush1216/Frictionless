-- ============================================================
-- Startup tasks: rubric-based improvement tasks per org.
-- Run after startup_readiness_results exists.
-- ============================================================

-- Task groups: one per rubric subtopic (e.g. "Corporate Cap Table IP Hygiene")
CREATE TABLE IF NOT EXISTS task_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_key text NOT NULL,
  category_name text NOT NULL,
  title text NOT NULL,
  impact text NOT NULL DEFAULT 'medium' CHECK (impact IN ('high', 'medium', 'low')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_groups_org ON task_groups (org_id);

-- Tasks: one per rubric item that is pending (current points < max)
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES task_groups(id) ON DELETE CASCADE,
  subcategory_name text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  potential_points int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  completed_by uuid,
  submitted_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_group ON tasks (group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subcategory ON tasks (subcategory_name);

-- Task AI chat messages (OpenAI helper conversation per task)
CREATE TABLE IF NOT EXISTS task_ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_ai_chat_messages_task ON task_ai_chat_messages (task_id);

-- RLS: service role only (backend uses service role). Optionally add org member read later.
ALTER TABLE task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access task_groups" ON task_groups;
CREATE POLICY "Service role full access task_groups" ON task_groups FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access tasks" ON tasks;
CREATE POLICY "Service role full access tasks" ON tasks FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access task_ai_chat" ON task_ai_chat_messages;
CREATE POLICY "Service role full access task_ai_chat" ON task_ai_chat_messages FOR ALL USING (auth.role() = 'service_role');
