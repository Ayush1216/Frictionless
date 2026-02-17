-- Add submitted_value to tasks (run if you already created tasks without this column)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submitted_value text;
