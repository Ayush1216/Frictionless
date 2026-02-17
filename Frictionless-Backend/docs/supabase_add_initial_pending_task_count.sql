-- ============================================================
-- Add initial_pending_task_count to startup_readiness_results.
-- Set once per org = number of pending tasks when first computed
-- (excludes prefilled/onboarding items from progress total).
-- ============================================================

ALTER TABLE startup_readiness_results
  ADD COLUMN IF NOT EXISTS initial_pending_task_count int;

COMMENT ON COLUMN startup_readiness_results.initial_pending_task_count IS
  'Number of pending tasks when first computed (allotted to user). Set once; used for progress denominator.';
