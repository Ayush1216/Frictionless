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

// Cache subscription status to avoid redundant checks on navigation
let _subscriptionCache: { orgId: string; active: boolean; expiresAt: number } | null = null;
const SUBSCRIPTION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Expose cache clearing on window for the success page to call
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__clearSubscriptionCache = () => {
    _subscriptionCache = null;
  };
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
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

  // Subscription check — runs AFTER onboarding is confirmed complete
  useEffect(() => {
    if (!isAuthenticated || isLoading || !user || !onboardingChecked) return;

    // Subscribe pages are exempt (avoid redirect loop)
    const isSubscribePage = pathname === '/subscribe' || pathname?.startsWith('/subscribe/');
    if (isSubscribePage) {
      setSubscriptionChecked(true);
      return;
    }

    // Onboarding page is exempt
    if (pathname === '/onboarding/chat') {
      setSubscriptionChecked(true);
      return;
    }

    // Only startup and capital_provider need subscriptions
    const needsSub = user.org_type === 'startup' || user.org_type === 'capital_provider';
    if (!needsSub) {
      setSubscriptionChecked(true);
      return;
    }

    // Check subscription cache first
    const now = Date.now();
    if (_subscriptionCache && _subscriptionCache.orgId === user.org_id && _subscriptionCache.expiresAt > now) {
      if (!_subscriptionCache.active) {
        router.replace('/subscribe');
        return;
      }
      setSubscriptionChecked(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (!supabase) {
          // Demo mode — allow through
          if (!cancelled) setSubscriptionChecked(true);
          return;
        }
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token ?? null;
        if (!token || cancelled) {
          // No token but authenticated — block until we can verify
          if (!cancelled) router.replace('/subscribe');
          return;
        }

        const res = await fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        const active = json.active === true;
        _subscriptionCache = {
          orgId: user.org_id,
          active,
          expiresAt: Date.now() + SUBSCRIPTION_CACHE_TTL,
        };

        if (!active) {
          router.replace('/subscribe');
          return; // Don't set subscriptionChecked — keep spinner until navigation
        }

        // Subscription is active — let them through
        setSubscriptionChecked(true);
      } catch {
        // On error, redirect to subscribe — never grant free access
        if (!cancelled) router.replace('/subscribe');
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, isLoading, user, onboardingChecked, pathname, router]);

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

  // Avoid flash of dashboard before redirect to subscribe
  const isSubscribePage = pathname === '/subscribe' || pathname?.startsWith('/subscribe/');
  if (needsOnboardingCheck && onboardingChecked && !subscriptionChecked && !isSubscribePage) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
