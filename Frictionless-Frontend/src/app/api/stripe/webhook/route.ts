import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseServer } from '@/lib/supabase/server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  }

  const now = new Date().toISOString();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.client_reference_id;
        if (!orgId) {
          console.error('[stripe-webhook] No client_reference_id on session');
          break;
        }

        const amount = session.amount_total;

        await supabase.from('subscriptions').upsert(
          {
            org_id: orgId,
            stripe_customer_id: (session.customer as string) ?? null,
            stripe_subscription_id: (session.subscription as string) ?? null,
            stripe_payment_intent_id: (session.payment_intent as string) ?? null,
            payment_status: 'paid',
            subscription_status: 'active',
            amount_paid: (amount ?? 0) / 100,
            currency: (session.currency ?? 'usd').toUpperCase(),
            subscription_start_date: now,
            updated_at: now,
          },
          { onConflict: 'org_id' }
        );

        console.log('[stripe-webhook] Subscription activated for org:', orgId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('org_id')
          .eq('stripe_subscription_id', sub.id)
          .single();

        if (existing) {
          await supabase
            .from('subscriptions')
            .update({
              subscription_status: sub.status,
              updated_at: now,
            })
            .eq('org_id', existing.org_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({
            subscription_status: 'canceled',
            updated_at: now,
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as unknown as Record<string, unknown>;
        const subId = (invoiceAny.subscription as string) ?? null;
        if (subId) {
          await supabase
            .from('subscriptions')
            .update({
              payment_status: 'paid',
              amount_paid: (invoice.amount_paid ?? 0) / 100,
              updated_at: now,
            })
            .eq('stripe_subscription_id', subId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny2 = invoice as unknown as Record<string, unknown>;
        const subId = (invoiceAny2.subscription as string) ?? null;
        if (subId) {
          await supabase
            .from('subscriptions')
            .update({
              payment_status: 'failed',
              subscription_status: 'past_due',
              updated_at: now,
            })
            .eq('stripe_subscription_id', subId);
        }
        break;
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] Error processing event:', err);
  }

  return NextResponse.json({ received: true });
}
