-- 017: Ensure subscriptions table has all columns the backend needs
-- Safe to run regardless of current state (uses IF NOT EXISTS / IF EXISTS)

-- Add columns the backend webhook writes to (skips if already present)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Drop columns that are no longer used (safe — skips if not present)
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS status;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS plan;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS billing_interval;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS current_period_start;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS current_period_end;
