import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-side Supabase client for public operations (no user auth).
 * Uses service role if available (bypasses RLS), else anon.
 * Use for: share link validation, public data room views.
 */
let _serverClient: SupabaseClient | null = null;
export function getSupabaseServer(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  // Reuse singleton for service-role client (stateless, no per-request auth)
  if (!_serverClient) {
    const key = supabaseServiceKey || supabaseAnonKey;
    _serverClient = createClient(supabaseUrl, key);
  }
  return _serverClient;
}

/**
 * Create a Supabase client that acts as the authenticated user (for API routes).
 * Pass the access token from the request; RLS will apply.
 */
export function createSupabaseClientForRequest(accessToken: string | null): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Short-lived in-memory cache for org_id lookups.
 * Avoids repeated getUser() + org_memberships queries within the same minute.
 * Key: JWT sub (user id extracted from token), Value: { orgId, expiresAt }
 */
const orgIdCache = new Map<string, { orgId: string | null; expiresAt: number }>();
const ORG_ID_CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Get the first active org_id for the current user (from org_memberships).
 * Uses a short in-memory cache to avoid redundant Supabase calls within the same request burst.
 */
export async function getCurrentUserOrgId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const now = Date.now();
  const cached = orgIdCache.get(user.id);
  if (cached && cached.expiresAt > now) {
    return cached.orgId;
  }

  const { data: rows } = await supabase
    .from('org_memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1);

  const orgId = rows?.[0]?.org_id ?? null;
  orgIdCache.set(user.id, { orgId, expiresAt: now + ORG_ID_CACHE_TTL_MS });

  // Prune old entries periodically (prevent memory leak in long-running server)
  if (orgIdCache.size > 100) {
    orgIdCache.forEach((val, key) => {
      if (val.expiresAt <= now) orgIdCache.delete(key);
    });
  }

  return orgId;
}
