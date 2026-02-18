'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';
import { AppShell } from '@/components/app/AppShell';
import { supabase } from '@/lib/supabase/client';
import { fetchBootstrap } from '@/lib/api/bootstrap';

// Cache onboarding status to avoid redundant checks on navigation
let _onboardingCache: { userId: string; completed: boolean; expiresAt: number } | null = null;
const ONBOARDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  // Combined: onboarding check + bootstrap prefetch
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

    // Check onboarding cache first (avoids re-checking on every navigation)
    const now = Date.now();
    if (_onboardingCache && _onboardingCache.userId === user.id && _onboardingCache.expiresAt > now) {
      if (!_onboardingCache.completed) {
        router.replace('/onboarding/chat');
        return;
      }
      setOnboardingChecked(true);

      // Still run bootstrap if needed (non-blocking)
      if (user.org_type === 'startup' && !bootstrapRan.current) {
        bootstrapRan.current = true;
        if (supabase) {
          supabase.auth.getSession().then(({ data }) => {
            const token = data?.session?.access_token;
            if (token) {
              fetchBootstrap(token).catch(() => {
                useReadinessStore.getState().setBootstrap(null, []);
                useTaskStore.getState().setTasksLoaded(true);
              });
            }
          });
        }
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token ?? null;
        if (!token || cancelled) return;

        const headers = { Authorization: `Bearer ${token}` };

        // Run onboarding check + bootstrap in PARALLEL
        const shouldBootstrap = user.org_type === 'startup' && !bootstrapRan.current;
        if (shouldBootstrap) bootstrapRan.current = true;

        const [onboardingRes] = await Promise.all([
          fetch('/api/onboarding/status', { headers }).then(r => r.json().catch(() => ({}))),
          shouldBootstrap
            ? fetchBootstrap(token).catch(() => {
                if (!cancelled) {
                  useReadinessStore.getState().setBootstrap(null, []);
                  useTaskStore.getState().setTasksLoaded(true);
                }
              })
            : Promise.resolve(),
        ]);

        if (cancelled) return;

        // Cache the onboarding result
        const completed = onboardingRes?.completed === true;
        _onboardingCache = {
          userId: user.id,
          completed,
          expiresAt: Date.now() + ONBOARDING_CACHE_TTL,
        };

        if (!completed) {
          router.replace('/onboarding/chat');
          return;
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
