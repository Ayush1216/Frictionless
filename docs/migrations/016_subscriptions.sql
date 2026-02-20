-- 016: Subscriptions table for Stripe payment tracking
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                    UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_customer_id        TEXT,
  stripe_subscription_id    TEXT,
  stripe_payment_intent_id  TEXT,
  payment_status            TEXT DEFAULT 'pending',
  subscription_status       TEXT NOT NULL DEFAULT 'active',
  amount_paid               NUMERIC(10,2),
  currency                  TEXT DEFAULT 'USD',
  subscription_start_date   TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN DEFAULT FALSE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(org_id)
);

-- Indexes for webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON public.subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own org's subscription
CREATE POLICY "Users can view own org subscription"
  ON public.subscriptions FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_memberships om
      WHERE om.user_id = auth.uid() AND om.is_active = TRUE
    )
  );

-- INSERT/UPDATE/DELETE only via service role (webhook writes bypass RLS)
