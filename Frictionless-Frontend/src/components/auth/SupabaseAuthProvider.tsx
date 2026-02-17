'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { fetchUserFromSession } from '@/lib/supabase/auth';
import { useAuthStore } from '@/stores/auth-store';

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const login = useAuthStore((s) => s.login);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);

    const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

    const init = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user) {
        setLoading(false);
        return;
      }
      // Log out if session expired (JWT) or last sign-in was more than 2 hours ago
      const expiresAtMs = (session.expires_at ?? 0) * 1000;
      const lastSignInMs = new Date(session.user?.last_sign_in_at ?? 0).getTime();
      const sessionTooOld = lastSignInMs > 0 && Date.now() - lastSignInMs > SESSION_MAX_AGE_MS;
      const expired = expiresAtMs > 0 && Date.now() >= expiresAtMs;
      if (expired || sessionTooOld) {
        await supabase.auth.signOut();
        clearAuth();
        setLoading(false);
        return;
      }
      const user = await fetchUserFromSession();
      if (mounted && user) {
        login(user);
      }
      setLoading(false);
    };

    init();

    const checkSessionAge = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;
      const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;
      const lastSignInMs = new Date(session.user?.last_sign_in_at ?? 0).getTime();
      if (lastSignInMs > 0 && Date.now() - lastSignInMs > SESSION_MAX_AGE_MS) {
        await supabase.auth.signOut();
        if (mounted) clearAuth();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && mounted) {
        clearAuth();
      }
      if (event === 'TOKEN_REFRESHED' && mounted) {
        checkSessionAge();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [login, clearAuth, setLoading]);

  return <>{children}</>;
}
