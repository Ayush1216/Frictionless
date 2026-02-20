'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function SubscribeSuccessPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const attempts = useRef(0);
  const polling = useRef(false);

  useEffect(() => {
    if (polling.current) return;
    polling.current = true;

    const poll = async () => {
      if (!supabase) {
        // No supabase = demo mode, just redirect
        setConfirmed(true);
        // Clear subscription cache before redirect
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__clearSubscriptionCache?.();
        setTimeout(() => router.replace('/dashboard'), 1500);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) return;

      try {
        const res = await fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));

        if (json.active) {
          setConfirmed(true);
          // Clear subscription cache so layout re-checks and finds active
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__clearSubscriptionCache?.();
          setTimeout(() => router.replace('/dashboard'), 2000);
          return;
        }
      } catch {
        // Network error, keep polling
      }

      attempts.current += 1;
      if (attempts.current < 30) {
        setTimeout(poll, 2000);
      }
    };

    poll();
  }, [router]);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'var(--fi-bg-primary)' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: confirmed
            ? 'radial-gradient(ellipse, rgba(16,185,129,0.15) 0%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(59,130,246,0.1) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="relative z-10 text-center max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {confirmed ? (
          <>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <CheckCircle2
                className="w-16 h-16 mx-auto mb-5"
                style={{ color: 'var(--fi-score-excellent)' }}
              />
            </motion.div>
            <h1
              className="text-2xl font-display font-bold mb-2"
              style={{ color: 'var(--fi-text-primary)' }}
            >
              Payment Confirmed!
            </h1>
            <p
              className="font-body text-sm"
              style={{ color: 'var(--fi-text-secondary)' }}
            >
              Redirecting to your dashboard...
            </p>
          </>
        ) : (
          <>
            <Loader2
              className="w-14 h-14 mx-auto mb-5 animate-spin"
              style={{ color: 'var(--fi-primary)' }}
            />
            <h1
              className="text-2xl font-display font-bold mb-2"
              style={{ color: 'var(--fi-text-primary)' }}
            >
              Confirming your payment...
            </h1>
            <p
              className="font-body text-sm"
              style={{ color: 'var(--fi-text-secondary)' }}
            >
              This usually takes a few seconds. Please don&apos;t close this page.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
