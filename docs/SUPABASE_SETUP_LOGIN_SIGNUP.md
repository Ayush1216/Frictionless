# Supabase Setup for Login & Signup (Fresh Project)

This guide covers **only** what you need in Supabase to support the three signup flows (Startup, Investor, Accelerator) and login. It assumes a **fresh** Supabase project.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick organization, name (e.g. `frictionless`), database password, region.
3. After creation, note:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon public** key (safe for frontend)
   - **service_role** key (server-only; never expose in frontend)

---

## 2. Auth settings (Dashboard)

1. **Authentication → Providers**
   - **Email**: Enable. This is what we use for signup/login.
   - **Confirm email**: Turn **off** for faster testing; turn **on** for production.
   - (Optional) Add **Google** / **GitHub** later if you use the existing social buttons.

2. **Authentication → URL configuration**
   - **Site URL**: Your app URL (e.g. `http://localhost:3000` for dev).
   - **Redirect URLs**: Add `http://localhost:3000/**` and your production URL.

3. **Authentication → Email templates** (optional)
   - Customize "Confirm signup" and "Reset password" if you enable email confirmation.

---

## 3. Database: run SQL (in order)

Run these in **SQL Editor** so that signup can create the right rows. We only create tables and enums needed for **login/signup** and the three profile types.

**Quick option:** You can paste the entire file **`docs/supabase_login_signup.sql`** into the Supabase SQL Editor and run it once (no markdown—pure SQL in the correct order). The sections below are the same SQL with explanations.

### 3.1 Enums (needed for org and membership)

```sql
-- Org type: matches your 3 signup flows
CREATE TYPE org_type AS ENUM ('startup', 'capital_provider', 'accelerator');

-- Membership role inside an org
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member');

-- For capital_provider_profiles (investor signup)
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

-- For locations (optional at signup; FK exists on organizations)
-- No enum needed for locations table.
```

### 3.2 Table: `locations` (minimal, for FK)

`organizations.location_id` references this. You can leave it null at signup.

```sql
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
```

### 3.3 Table: `profiles` (extends Supabase auth.users)

Use the same `id` as `auth.users.id` so one row per user.

```sql
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

-- Allow service role and authenticated user to manage their own row
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Insert is done by trigger (see below); service role can insert too
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL USING (auth.role() = 'service_role');
```

### 3.4 Table: `user_roles` (optional but useful)

Stores high-level role per user (e.g. `startup`, `capital_provider`, `accelerator`) so you can route them without joining orgs first.

```sql
CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
  ON user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user_roles"
  ON user_roles FOR ALL USING (auth.role() = 'service_role');
```

### 3.5 Table: `organizations`

One org per signup; `org_type` = startup | capital_provider | accelerator. Create the table and INSERT policy first; add SELECT/UPDATE policies after `org_memberships` exists (step 3.7).

```sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type org_type NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  website text,
  logo_url text,
  description text,
  location_id uuid REFERENCES locations(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert org (for signup)"
  ON organizations FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Service role full access org"
  ON organizations FOR ALL USING (auth.role() = 'service_role');
```

### 3.6 Table: `org_memberships`

Links user to org with a role (owner at signup).

```sql
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

CREATE POLICY "Users can read own memberships"
  ON org_memberships FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert membership for themselves (signup flow)"
  ON org_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON org_memberships FOR ALL USING (auth.role() = 'service_role');
```

### 3.7 Add SELECT/UPDATE policies on `organizations`

Run this **after** `org_memberships` exists so the policies can reference it.

```sql
CREATE POLICY "Users can read orgs they are member of"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update org they belong to (owner/admin)"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );
```

### 3.8 Table: `startup_profiles` (for Startup signup)

One row per startup org; create it when `org_type = 'startup'`.

```sql
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

-- Omit sector_id/subsector_id FK for now (sectors table not created yet); add later
ALTER TABLE startup_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read startup profile"
  ON startup_profiles FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org owner/admin can update startup profile"
  ON startup_profiles FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role full access"
  ON startup_profiles FOR ALL USING (auth.role() = 'service_role');
```

### 3.9 Table: `capital_provider_profiles` (for Investor signup)

One row per capital org; create when `org_type = 'capital_provider'`.

```sql
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

CREATE POLICY "Org members can read capital profile"
  ON capital_provider_profiles FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Org owner/admin can update capital profile"
  ON capital_provider_profiles FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role full access"
  ON capital_provider_profiles FOR ALL USING (auth.role() = 'service_role');
```

### 3.10 Accelerator

There is **no** separate `accelerator_profiles` table. An accelerator is just an **organization** with `org_type = 'accelerator'`. So for accelerator signup you only create:

- `organizations` (org_type = `accelerator`, name, slug, website, created_by)
- `org_memberships` (user as owner)

No extra profile table.

---

## 4. Trigger: create profile on signup

When a row is inserted into `auth.users`, create a matching `profiles` row so your app always has a profile for every user.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Your frontend will send `full_name` in signup metadata so it appears in `profiles`.

---

## 5. Function: complete signup (org + membership + profile type)

After the user signs up with Supabase Auth (email + password), the frontend will call a **single** function that:

1. Creates the **organization** (name, slug, org_type, website, created_by).
2. Creates **org_memberships** (user as **owner**).
3. Inserts **user_roles** (one role matching org_type).
4. If `org_type = 'startup'`: insert into **startup_profiles**.
5. If `org_type = 'capital_provider'`: insert into **capital_provider_profiles**.
6. If `org_type = 'accelerator'`: do nothing else.

Slug can be derived from name (e.g. lowercase, replace spaces with `-`, ensure uniqueness). Example implementation:

```sql
CREATE OR REPLACE FUNCTION public.complete_signup(
  p_org_type org_type,
  p_org_name text,
  p_website text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_slug text;
  v_slug_base text;
  v_counter int := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate slug from org name (simplified: lower, replace spaces and non-alnum)
  v_slug_base := lower(regexp_replace(trim(p_org_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug_base := trim(both '-' from v_slug_base);
  IF v_slug_base = '' THEN
    v_slug_base := 'org';
  END IF;
  v_slug := v_slug_base;
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_slug_base || '-' || v_counter;
  END LOOP;

  INSERT INTO organizations (org_type, name, slug, website, created_by)
  VALUES (p_org_type, p_org_name, v_slug, nullif(trim(p_website), ''), v_user_id)
  RETURNING id INTO v_org_id;

  INSERT INTO org_memberships (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, p_org_type::text)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF p_org_type = 'startup' THEN
    INSERT INTO startup_profiles (org_id) VALUES (v_org_id);
  ELSIF p_org_type = 'capital_provider' THEN
    INSERT INTO capital_provider_profiles (org_id) VALUES (v_org_id);
  END IF;

  RETURN v_org_id;
END;
$$;
```

Your app will call this **after** `supabase.auth.signUp()` (and optionally after email confirmation, depending on your flow). Pass `org_type`, `org_name`, and `website` from the signup form.

---

## 6. Summary: what you do in Supabase (login/signup only)

| Step | Where | Action |
|------|--------|--------|
| 1 | Dashboard | Create project; save URL + anon + service_role keys |
| 2 | Auth → Providers | Enable Email; set Confirm email on/off |
| 3 | Auth → URL config | Set Site URL and Redirect URLs |
| 4 | SQL Editor | Run enums: `org_type`, `membership_role`, `provider_category`, `provider_subtype` |
| 5 | SQL Editor | Create tables (in order): `locations`, `profiles`, `user_roles`, `organizations`, `org_memberships`, then add SELECT/UPDATE policies on `organizations`, then `startup_profiles`, `capital_provider_profiles` |
| 6 | SQL Editor | RLS policies as in the snippets above |
| 7 | SQL Editor | Trigger `on_auth_user_created` → `handle_new_user()` |
| 8 | SQL Editor | Function `complete_signup(org_type, org_name, website)` |

---

## 7. Frontend flow (for when you wire it up)

**Signup:**

1. User picks org type (Startup / Investor / Accelerator) → step 1: full name, email, password → step 2: org name, website, terms.
2. Call `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
3. On success, call RPC: `supabase.rpc('complete_signup', { p_org_type, p_org_name, p_website })`.
4. Redirect to dashboard (or to email confirmation screen if you enable confirm email).

**Login:**

1. Call `supabase.auth.signInWithPassword({ email, password })`.
2. On success, fetch profile + org(s) (e.g. from `profiles` and `org_memberships` + `organizations`) and set your auth state.

---

## 8. Optional: fix organizations SELECT policy dependency

If you create `organizations` before `org_memberships`, the SELECT policy that uses `org_memberships` will still work once `org_memberships` exists. If you hit any "relation does not exist" when running policies, create `org_memberships` first, then add the `organizations` policies. Order in section 3 is already chosen to avoid this.

---

Once this is in place, you can add the Supabase client to the frontend and replace the mock signup/login with the real Auth + `complete_signup` flow.
