-- Task Validation & Verdicts
-- Run after: tasks exist

CREATE TABLE IF NOT EXISTS task_validation_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_storage_path text NOT NULL,
  validation_status text NOT NULL DEFAULT 'pending',
  ai_extraction_jsonb jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_validation_task ON task_validation_artifacts (task_id);

CREATE TABLE IF NOT EXISTS task_verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  verdict text NOT NULL,
  verdict_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verdict_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_verdicts_task ON task_verdicts (task_id);

ALTER TABLE task_validation_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_verdicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access task_validation" ON task_validation_artifacts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access task_verdicts" ON task_verdicts FOR ALL USING (auth.role() = 'service_role');
