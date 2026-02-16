-- ============================================================
-- Fix: Allow deleting users from Supabase Auth without DB error
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================
-- Reason: organizations.created_by and org_assets.created_by reference
-- profiles(id) with no ON DELETE, so deleting a user (→ profile) is blocked.
-- Fix: set ON DELETE SET NULL so the user can be removed and we keep the org/asset.

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_created_by_fkey,
  ADD CONSTRAINT organizations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE org_assets
  DROP CONSTRAINT IF EXISTS org_assets_created_by_fkey,
  ADD CONSTRAINT org_assets_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
