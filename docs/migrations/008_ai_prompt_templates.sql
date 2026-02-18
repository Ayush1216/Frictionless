-- AI Prompt Templates (saved prompts for AI Chat)
-- Run after: organizations, profiles exist
-- Rollback: DROP TABLE ai_prompt_templates;

CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  prompt_text text NOT NULL,
  category text DEFAULT 'general',
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_org ON ai_prompt_templates (org_id);

ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access ai_prompt_templates" ON ai_prompt_templates FOR ALL USING (auth.role() = 'service_role');
