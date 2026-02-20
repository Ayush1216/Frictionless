import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await getCurrentUserOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('subscription_status, payment_status, subscription_start_date')
      .eq('org_id', orgId)
      .single();

    const active = sub?.subscription_status === 'active';
    return NextResponse.json({
      active,
      subscription_status: sub?.subscription_status ?? null,
      payment_status: sub?.payment_status ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
