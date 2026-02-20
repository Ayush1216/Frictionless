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
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-mesh-gradient opacity-60" />

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
              <CheckCircle2 className="w-16 h-16 text-score-excellent mx-auto mb-5" />
            </motion.div>
            <h1 className="text-2xl font-display font-bold text-white mb-2">
              Payment Confirmed!
            </h1>
            <p className="text-muted-foreground font-body text-sm">
              Redirecting to your dashboard...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-14 h-14 text-primary mx-auto mb-5 animate-spin" />
            <h1 className="text-2xl font-display font-bold text-white mb-2">
              Confirming your payment...
            </h1>
            <p className="text-muted-foreground font-body text-sm">
              This usually takes a few seconds. Please don&apos;t close this page.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
