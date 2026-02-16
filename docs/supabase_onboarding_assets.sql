-- ============================================================
-- Onboarding: org_assets + storage (run after supabase_login_signup.sql)
-- Enables storing pitch deck and website for startups.
-- ============================================================

-- Enums for org_assets
DO $$ BEGIN
  CREATE TYPE validation_status AS ENUM ('pending', 'under_review', 'verified', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_category AS ENUM (
    'pitch_deck', 'thesis_document', 'financial_model', 'cap_table', 'one_pager', 'data_room_doc', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- If you already ran this script before thesis_document was added, run once:
-- ALTER TYPE asset_category ADD VALUE 'thesis_document';

-- Table: org_assets (minimal for onboarding pitch deck)
CREATE TABLE IF NOT EXISTS org_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category asset_category NOT NULL,
  custom_category text,
  title text NOT NULL,
  description text,
  storage_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  validation_status validation_status NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_assets_org_category ON org_assets (org_id, category);

ALTER TABLE org_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read org_assets"
  ON org_assets FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org members can insert org_assets"
  ON org_assets FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org owner/admin can update org_assets"
  ON org_assets FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Org owner/admin can delete org_assets"
  ON org_assets FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

-- Storage bucket: create in Supabase Dashboard → Storage → New bucket
-- Name: org-assets (or pitch-decks)
-- Public: off. Add policy so authenticated users can upload to their org folder:
--
-- Policy name: Org members can upload to their org folder
-- Allowed operation: INSERT
-- Target: (bucket_id = 'org-assets' AND (storage.foldername(name))[1] = auth.jwt() ->> 'app_metadata.org_id' OR ...)
-- Simpler: use RLS with bucket policy "authenticated users can upload" and enforce path = org_id/... in app.
--
-- In Dashboard: Storage → org-assets → Policies → New policy:
-- - For INSERT: (bucket_id = 'org-assets') AND (storage.foldername(name))[1] IN (
--     SELECT org_id::text FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
--   )
-- - For SELECT: same org_id check on folder name
