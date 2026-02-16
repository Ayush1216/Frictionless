-- ============================================================
-- Delete a user's profile and all related data (run in Supabase SQL Editor)
-- Uses service_role or a role that bypasses RLS.
-- ============================================================
-- USAGE: Replace YOUR_USER_EMAIL with the user's email (e.g. 'test@example.com')
--        or replace YOUR_USER_ID with the auth.users.id UUID.
--
-- NOTE: This does NOT delete Storage files. Delete those manually in
--       Supabase Dashboard → Storage → org-assets → browse to {org_id}/ and delete.
--       Or use the Python script: python -m app.scripts.delete_user --email test@example.com
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  -- Option A: Look up by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'YOUR_USER_EMAIL';
  -- Option B: Or use known user_id
  -- v_user_id := 'YOUR_USER_ID'::uuid;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Set YOUR_USER_EMAIL or YOUR_USER_ID.';
  END IF;

  -- Get their org (assumes one org per user; for multiple, loop over org_memberships)
  SELECT org_id INTO v_org_id
  FROM org_memberships
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    -- Delete org (CASCADE removes: apollo_organization_enrichment, startup_extraction_results,
    --             org_assets, org_memberships, startup_profiles, capital_provider_profiles)
    DELETE FROM organizations WHERE id = v_org_id;
    RAISE NOTICE 'Deleted organization % and all related metadata (apollo, extraction, org_assets).', v_org_id;
  END IF;

  -- Delete user roles
  DELETE FROM user_roles WHERE user_id = v_user_id;

  -- Delete profile (references auth.users)
  DELETE FROM profiles WHERE id = v_user_id;

  -- Delete auth user (requires service_role or admin)
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'Deleted user % (profile, roles, auth).', v_user_id;
END $$;
