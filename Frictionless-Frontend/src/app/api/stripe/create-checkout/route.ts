import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

const PRICE_MAP: Record<string, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  quarterly: process.env.STRIPE_PRICE_QUARTERLY,
  annual: process.env.STRIPE_PRICE_ANNUAL,
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await getCurrentUserOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const { plan } = await request.json();
    const priceId = PRICE_MAP[plan];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const origin = request.headers.get('origin') || request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: orgId,
      customer_email: user?.email ?? undefined,
      success_url: `${origin}/subscribe/success`,
      cancel_url: `${origin}/subscribe`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
