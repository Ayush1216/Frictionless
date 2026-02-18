'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';
import { AppShell } from '@/components/app/AppShell';
import { supabase } from '@/lib/supabase/client';
import { fetchBootstrap } from '@/lib/api/bootstrap';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const bootstrapRan = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Combined: onboarding check + bootstrap prefetch in a single getSession() call
  useEffect(() => {
    if (!isAuthenticated || isLoading || !user) return;

    const isStartupOrCP = user.org_type === 'startup' || user.org_type === 'capital_provider';

    if (!isStartupOrCP) {
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
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token ?? null;
        if (!token || cancelled) return;

        // 1. Check onboarding status
        const res = await fetch('/api/onboarding/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (json.completed !== true) {
          router.replace('/onboarding/chat');
          return;
        }

        // 2. Prefetch bootstrap (readiness + tasks) — deduplicated, won't re-fetch if already done
        if (user.org_type === 'startup' && !bootstrapRan.current) {
          bootstrapRan.current = true;
          try {
            await fetchBootstrap(token);
          } catch {
            if (!cancelled) {
              useReadinessStore.getState().setBootstrap(null, []);
              useTaskStore.getState().setTasksLoaded(true);
            }
          }
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

  // Avoid flash of dashboard before redirect to onboarding
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
