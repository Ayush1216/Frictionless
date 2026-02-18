-- Share Links: scope, view_count, watermark tracking
-- Run after: share_links exists
-- Rollback: ALTER TABLE share_links DROP COLUMN view_count, DROP COLUMN last_viewed_at, DROP COLUMN scope;

ALTER TABLE share_links ADD COLUMN IF NOT EXISTS scope text DEFAULT 'full';
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS watermark boolean DEFAULT false;
