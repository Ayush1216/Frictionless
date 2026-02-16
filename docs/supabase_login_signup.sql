-- ============================================================
-- Frictionless: Supabase login/signup setup (run in SQL Editor)
-- Paste this entire file into Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Enums
CREATE TYPE org_type AS ENUM ('startup', 'capital_provider', 'accelerator');
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE provider_category AS ENUM (
  'investor', 'lender', 'grantor', 'accelerator', 'other'
);
CREATE TYPE provider_subtype AS ENUM (
  'vc', 'micro_vc', 'angel_individual', 'angel_group', 'angel_syndicate',
  'cvc', 'family_office', 'pe', 'sovereign_wealth', 'bank',
  'venture_debt_lender', 'sba_lender', 'revenue_based_financing',
  'line_of_credit', 'equipment_finance', 'government_grant',
  'university_grant', 'competition_grant', 'foundation_grant',
  'accelerator_program', 'incubator', 'other'
);

-- 2. locations
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text,
  city text,
  state_province text,
  country text NOT NULL DEFAULT 'Unknown',
  country_code text,
  region text,
  latitude numeric,
  longitude numeric,
  geo_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_region ON locations (region);
CREATE INDEX idx_locations_country_city ON locations (country_code, state_province, city);

-- 3. profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  timezone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_email_key ON profiles (email);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role can manage profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');

-- 4. user_roles
CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage user_roles" ON user_roles FOR ALL USING (auth.role() = 'service_role');

-- 5. organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type org_type NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  website text,
  logo_url text,
  description text,
  location_id uuid REFERENCES locations(id),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can insert org (for signup)" ON organizations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Service role full access org" ON organizations FOR ALL USING (auth.role() = 'service_role');

-- 6. org_memberships
CREATE TABLE org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'member',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
CREATE INDEX idx_org_memberships_user_active ON org_memberships (user_id, is_active);
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own memberships" ON org_memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert membership for themselves (signup flow)" ON org_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON org_memberships FOR ALL USING (auth.role() = 'service_role');

-- 7. organizations SELECT/UPDATE policies (after org_memberships exists)
CREATE POLICY "Users can read orgs they are member of" ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Users can update org they belong to (owner/admin)" ON organizations FOR UPDATE
  USING (id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')));

-- 8. startup_profiles
CREATE TABLE startup_profiles (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  sector_id uuid,
  subsector_id uuid,
  hq_location_id uuid REFERENCES locations(id),
  hq_location_text text,
  founded_year int,
  stage text,
  business_model text,
  tags text[],
  short_summary text,
  legal_structure text,
  pitch_summary text,
  traction_summary text,
  incorporation_country text,
  incorporation_state text,
  employee_count int,
  current_readiness_sheet_id uuid,
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE startup_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read startup profile" ON startup_profiles FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Org owner/admin can update startup profile" ON startup_profiles FOR ALL
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')));
CREATE POLICY "Service role full access" ON startup_profiles FOR ALL USING (auth.role() = 'service_role');

-- 9. capital_provider_profiles
CREATE TABLE capital_provider_profiles (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  provider_category provider_category NOT NULL DEFAULT 'investor',
  provider_subtype provider_subtype NOT NULL DEFAULT 'vc',
  headquarters_location_id uuid REFERENCES locations(id),
  headquarters_text text,
  website text,
  founded_year int,
  aum_total numeric,
  total_investments_count int,
  active_portfolio_count int,
  team_size int,
  description text,
  decision_process text,
  timeline text,
  data_source text NOT NULL DEFAULT 'manual',
  data_source_id text,
  last_enriched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE capital_provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read capital profile" ON capital_provider_profiles FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Org owner/admin can update capital profile" ON capital_provider_profiles FOR ALL
  USING (org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')));
CREATE POLICY "Service role full access" ON capital_provider_profiles FOR ALL USING (auth.role() = 'service_role');

-- 10. Trigger: create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Function: complete signup (org + membership + profile type)
CREATE OR REPLACE FUNCTION public.complete_signup(
  p_org_type org_type,
  p_org_name text,
  p_website text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_slug text;
  v_slug_base text;
  v_counter int := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_slug_base := lower(regexp_replace(trim(p_org_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug_base := trim(both '-' from v_slug_base);
  IF v_slug_base = '' THEN v_slug_base := 'org'; END IF;
  v_slug := v_slug_base;
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_slug_base || '-' || v_counter;
  END LOOP;

  INSERT INTO organizations (org_type, name, slug, website, created_by)
  VALUES (p_org_type, p_org_name, v_slug, nullif(trim(p_website), ''), v_user_id)
  RETURNING id INTO v_org_id;

  INSERT INTO org_memberships (org_id, user_id, role) VALUES (v_org_id, v_user_id, 'owner');
  INSERT INTO user_roles (user_id, role) VALUES (v_user_id, p_org_type::text) ON CONFLICT (user_id, role) DO NOTHING;

  IF p_org_type = 'startup' THEN
    INSERT INTO startup_profiles (org_id) VALUES (v_org_id);
  ELSIF p_org_type = 'capital_provider' THEN
    INSERT INTO capital_provider_profiles (org_id) VALUES (v_org_id);
  END IF;

  RETURN v_org_id;
END;
$$;
