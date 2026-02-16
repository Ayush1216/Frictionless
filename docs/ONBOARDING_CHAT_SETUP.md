# Onboarding chat (website + pitch deck) – Supabase setup

Run this **after** you’ve run `supabase_login_signup.sql`.

## 1. Database: org_assets

Run **`docs/supabase_onboarding_assets.sql`** in the Supabase SQL Editor. It creates:

- `validation_status` and `asset_category` enums (if missing)
- `org_assets` table and RLS so org members can read/insert assets

## 2. Storage bucket for pitch decks

1. In Supabase: **Storage** → **New bucket**.
2. Name: **`org-assets`** (must match the name used in the app).
3. **Public bucket**: Off.
4. **Policies** → **New policy** (or use RLS):

**Allow uploads (INSERT)** for the current user’s org folder:

- Policy name: `Org members can upload`
- Operation: **INSERT**
- Target: **All**
- Policy definition (raw SQL):

```sql
(bucket_id = 'org-assets')
AND
((storage.foldername(name))[1] IN (
  SELECT org_id::text FROM public.org_memberships
  WHERE user_id = auth.uid() AND is_active = true
))
```

**Allow reads (SELECT)** for the same folders:

- Operation: **SELECT**
- Same expression as above.

(If your dashboard uses a policy builder, equivalent: bucket = `org-assets`, and first folder segment `name` is in the list of the user’s `org_id` from `org_memberships`.)

## 3. Investors: thesis document

Investors are prompted to upload a **thesis fit** document (PDF). It is stored in the same **`org-assets`** bucket under `{org_id}/thesis_document/` and in **`org_assets`** with `category = 'thesis_document'`.

If you already ran `supabase_onboarding_assets.sql` before the `thesis_document` enum value was added, run this once in the SQL Editor:

```sql
ALTER TYPE asset_category ADD VALUE 'thesis_document';
```

## 4. Website field

The startup’s website is stored in **`organizations.website`**. No extra table or migration is needed; the API updates that column.

## 5. Apollo organization enrichment (startups)

When a startup submits their website URL, the backend enriches the organization via the Apollo API and stores the result in Supabase.

1. Run **`docs/supabase_apollo_enrichment.sql`** in the Supabase SQL Editor.
2. Start the FastAPI backend (`Frictionless-Backend/`) with `APOLLO_API_KEY` and Supabase credentials.
3. Set `FRICTIONLESS_BACKEND_URL=http://localhost:8000` in `Frictionless-Frontend/.env.local`.

The Apollo data is stored in `apollo_organization_enrichment` (one row per org) and can be retrieved for Gemini or other use cases.

---

After this, the onboarding chat can save the website (startups), pitch deck (startups), and thesis document (investors) to Storage and `org_assets`.
