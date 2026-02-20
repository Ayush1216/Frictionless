import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();
    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ active: false, reason: 'not_paid' });
    }

    const orgId = session.client_reference_id;
    if (!orgId) {
      return NextResponse.json({ active: false, reason: 'no_org' });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    }

    const now = new Date().toISOString();

    await supabase.from('subscriptions').upsert(
      {
        org_id: orgId,
        stripe_customer_id: (session.customer as string) ?? null,
        stripe_subscription_id: (session.subscription as string) ?? null,
        stripe_payment_intent_id: (session.payment_intent as string) ?? null,
        payment_status: 'paid',
        subscription_status: 'active',
        amount_paid: (session.amount_total ?? 0) / 100,
        currency: (session.currency ?? 'usd').toUpperCase(),
        subscription_start_date: now,
        updated_at: now,
      },
      { onConflict: 'org_id' },
    );

    console.log('[verify-session] Subscription activated for org:', orgId);
    return NextResponse.json({ active: true });
  } catch (err) {
    console.error('[verify-session]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
