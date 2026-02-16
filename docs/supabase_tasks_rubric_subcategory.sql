-- Add rubric_subcategory to tasks (links task to specific rubric item for targeted point updates)
-- When completing a task with this set, only that rubric item gets points instead of full rescore
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rubric_subcategory text;
