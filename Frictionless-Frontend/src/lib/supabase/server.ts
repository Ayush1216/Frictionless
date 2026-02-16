import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
 * Get the first active org_id for the current user (from org_memberships).
 */
export async function getCurrentUserOrgId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;
  const { data: rows } = await supabase
    .from('org_memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1);
  return rows?.[0]?.org_id ?? null;
}
