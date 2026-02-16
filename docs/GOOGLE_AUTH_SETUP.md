# Google sign-in setup (Supabase)

Use this to enable **Sign in with Google** on the login page.

---

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.

2. **Enable the right APIs**
   - APIs & Services → **Library** → search for **Google+ API** or ensure **Google Identity** is available (often enabled by default for OAuth).

3. **OAuth consent screen**
   - APIs & Services → **OAuth consent screen**
   - Choose **External** (or Internal for workspace-only)
   - Fill **App name**, **User support email**, **Developer contact**
   - **Scopes**: Add (or ensure) `openid`, `email`, `profile` (or `.../auth/userinfo.email`, `.../auth/userinfo.profile`)

4. **Create OAuth client**
   - APIs & Services → **Credentials** → **Create credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: e.g. `Frictionless Web`
   - **Authorized JavaScript origins**
     - `http://localhost:3000` (for local dev)
     - Your production URL, e.g. `https://yourdomain.com`
   - **Authorized redirect URIs**
     - Get this from Supabase: **Authentication** → **Providers** → **Google** (expand). Copy the **Callback URL** (looks like `https://<project-ref>.supabase.co/auth/v1/callback`).
     - Add exactly that URL (e.g. `https://vuycdpkyfeqofqieovhr.supabase.co/auth/v1/callback`).
   - Click **Create** and copy the **Client ID** and **Client secret**.

---

## 2. Supabase Dashboard

1. **Authentication** → **Providers** → **Google**
   - Turn **Google** ON
   - Paste **Client ID** and **Client secret** from step 1
   - Save

2. **Authentication** → **URL configuration**
   - **Redirect URLs**: ensure these are in the list:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/**`
     - For production: `https://yourdomain.com/auth/callback` and `https://yourdomain.com/**`

---

## 3. App flow

- User clicks **Google** on the login page → redirects to Google → after sign-in, Google redirects to Supabase → Supabase redirects to **`/auth/callback`** with a `code`.
- The `/auth/callback` page exchanges the code for a session, loads profile (and org if any), then redirects to `/dashboard`.

**Note:** New Google users get a `profiles` row (from the `handle_new_user` trigger) but **no org or org_membership** yet. They land on the dashboard with minimal user data. You can later add an “Complete your profile” or onboarding step that calls `complete_signup` to create their org (e.g. after they pick Startup/Investor/Accelerator and org name).

---

## 4. Troubleshooting

- **Redirect URI mismatch**: The redirect URI in Google must match Supabase’s callback URL exactly (no trailing slash difference).
- **"redirect_uri not allowed"**: Add the Supabase callback URL under **Authorized redirect URIs** in the OAuth client.
- **"email rate limit exceeded"**: Unrelated to Google; that’s the email signup rate limit. Wait or use Google sign-in to avoid sending emails.
