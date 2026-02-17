'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { exchangeCodeForSession, fetchUserFromSession } from '@/lib/supabase/auth';
import { toast } from 'sonner';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorDesc = searchParams.get('error_description');

    if (errorDesc) {
      toast.error(errorDesc);
      router.replace('/login');
      setStatus('error');
      return;
    }

    if (!code) {
      router.replace('/login');
      setStatus('error');
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { error } = await exchangeCodeForSession(code);
        if (!mounted) return;
        if (error) {
          toast.error(error);
          router.replace('/login');
          setStatus('error');
          return;
        }
        const user = await fetchUserFromSession();
        if (!mounted) return;
        if (user) {
          login(user);
          router.replace('/dashboard');
        } else {
          router.replace('/dashboard');
        }
        setStatus('done');
      } catch (err) {
        if (!mounted) return;
        toast.error(err instanceof Error ? err.message : 'Sign-in failed.');
        router.replace('/login');
        setStatus('error');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [searchParams, login, router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-electric-blue" />
        <p className="text-sm">
          {status === 'loading' ? 'Completing sign-in…' : status === 'done' ? 'Redirecting…' : 'Redirecting to login…'}
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-electric-blue" />
            <p className="text-sm">Loading…</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
