-- Add potential_points to tasks (points user can gain by completing the task)
-- Required for startup/tasks to show "+X pts if completed" on tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS potential_points int DEFAULT 0;
