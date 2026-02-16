-- ============================================================
-- Add "other" text columns for questionnaire (run after supabase_startup_readiness_questionnaire.sql)
-- When user selects "Other", they type a custom value stored here.
-- ============================================================

ALTER TABLE startup_readiness_questionnaire
  ADD COLUMN IF NOT EXISTS primary_sector_other text,
  ADD COLUMN IF NOT EXISTS round_target_other text,
  ADD COLUMN IF NOT EXISTS entity_type_other text;
