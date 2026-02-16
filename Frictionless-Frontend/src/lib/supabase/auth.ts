import { getSupabase } from './client';
import type { User } from '@/types/database';

/** Build app User from profile + primary org (first active membership). */
export async function fetchUserFromSession(): Promise<User | null> {
  const supabase = getSupabase();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.id) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .eq('id', authUser.id)
    .single();

  if (profileError || !profile) return null;

  const { data: memberships } = await supabase
    .from('org_memberships')
    .select('org_id, role')
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  const membership = memberships?.[0];
  if (!membership) {
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name ?? '',
      avatar_url: profile.avatar_url ?? null,
      org_id: '',
      org_type: 'startup',
      org_name: '',
      role: 'member',
    };
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, org_type')
    .eq('id', membership.org_id)
    .single();

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name ?? '',
    avatar_url: profile.avatar_url ?? null,
    org_id: org?.id ?? membership.org_id,
    org_type: (org?.org_type as User['org_type']) ?? 'startup',
    org_name: org?.name ?? '',
    role: membership.role as User['role'],
  };
}

export type SignUpParams = {
  email: string;
  password: string;
  fullName: string;
  orgType: 'startup' | 'capital_provider' | 'accelerator';
  orgName: string;
  website?: string;
};

export async function signUpWithSupabase(params: SignUpParams): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  const { email, password, fullName, orgType, orgName, website } = params;

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  if (!authData.user) {
    return { error: 'Sign up failed. Please try again.' };
  }

  // Ensure the client has the session before calling RPC (fixes "Not authenticated" when session isn't set yet)
  if (authData.session) {
    await supabase.auth.setSession(authData.session);
  }

  // If email confirmation is required, there's no session yet — user must confirm then we run complete_signup on first login
  if (!authData.session) {
    return {
      error: 'Please check your email and click the confirmation link, then sign in to finish setting up your account.',
    };
  }

  const { error: rpcError } = await supabase.rpc('complete_signup', {
    p_org_type: orgType,
    p_org_name: orgName,
    p_website: website || null,
  });

  if (rpcError) {
    return { error: rpcError.message };
  }

  return { error: null };
}

export type SignInParams = {
  email: string;
  password: string;
};

export async function signInWithSupabase(
  params: SignInParams
): Promise<{ user: User | null; error: string | null }> {
  const supabase = getSupabase();
  const { email, password } = params;

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { user: null, error: signInError.message };
  }

  const user = await fetchUserFromSession();
  return { user, error: null };
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}

/** Redirects to Google OAuth. After sign-in, user is sent to /auth/callback then to dashboard. */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) return { error: error.message };
  if (data?.url) {
    window.location.href = data.url;
    return { error: null };
  }
  return { error: 'Could not start Google sign-in.' };
}

/** Call from /auth/callback page: exchange code for session. */
export async function exchangeCodeForSession(code: string): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return { error: error?.message ?? null };
}
