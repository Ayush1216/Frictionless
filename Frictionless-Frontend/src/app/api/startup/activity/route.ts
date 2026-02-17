import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

/**
 * GET /api/startup/activity
 * Returns recent activity (score history + completed tasks) from backend for the current startup org.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token || null);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await getCurrentUserOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ activities: [] }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30', 10) || 30));

    const backendUrl = (process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
    const res = await fetch(
      `${backendUrl}/api/startup-activity?org_id=${encodeURIComponent(orgId)}&limit=${limit}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    const data = await res.json().catch(() => ({ activities: [] }));
    return NextResponse.json({ activities: data.activities ?? [] });
  } catch (err) {
    console.error('[startup/activity]', err);
    return NextResponse.json({ activities: [] }, { status: 200 });
  }
}
