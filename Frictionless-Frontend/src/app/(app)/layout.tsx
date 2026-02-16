'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { AppShell } from '@/components/app/AppShell';
import { supabase } from '@/lib/supabase/client';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect to onboarding chat if user (startup/investor) has not completed onboarding
  useEffect(() => {
    if (!isAuthenticated || isLoading || !user) return;
    if (user.org_type !== 'startup' && user.org_type !== 'capital_provider') {
      setOnboardingChecked(true);
      return;
    }
    if (pathname === '/onboarding/chat') {
      setOnboardingChecked(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token ?? null;
        if (!token || cancelled) return;
        const res = await fetch('/api/onboarding/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (json.completed !== true) {
          router.replace('/onboarding/chat');
        }
      } catch {
        // allow through on error to avoid blocking
      } finally {
        if (!cancelled) setOnboardingChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, isLoading, user, pathname, router]);

  // Show nothing while checking auth or redirecting
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Avoid flash of dashboard before redirect to onboarding (optional: show loader until onboarding check for startup/investor)
  const needsOnboardingCheck = user?.org_type === 'startup' || user?.org_type === 'capital_provider';
  if (needsOnboardingCheck && !onboardingChecked && pathname !== '/onboarding/chat') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
