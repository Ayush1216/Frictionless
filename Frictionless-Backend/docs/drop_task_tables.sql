-- Drop all task-related tables. Run in Supabase SQL Editor.
-- Order: dependents first, then tasks, then task_groups.

DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_events CASCADE;
DROP TABLE IF EXISTS task_input_submissions CASCADE;
DROP TABLE IF EXISTS task_updates CASCADE;
DROP TABLE IF EXISTS task_required_inputs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_groups CASCADE;
