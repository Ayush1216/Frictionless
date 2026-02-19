import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';

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
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const investorName = (body.investor_name || '').trim();
    const investorUrl = (body.investor_url || '').trim();

    if (!investorName) {
      return NextResponse.json({ error: 'investor_name is required' }, { status: 400 });
    }
    if (!investorUrl) {
      return NextResponse.json({ error: 'investor_url is required' }, { status: 400 });
    }

    const backendBase = BACKEND_URL.replace(/\/$/, '');
    const res = await fetch(`${backendBase}/api/investors/add-custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, investor_name: investorName, investor_url: investorUrl }),
      signal: AbortSignal.timeout(60_000),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to add investor' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[investors/add-custom] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
