import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
    const actor = searchParams.get('actor') || undefined;
    const entity = searchParams.get('entity') || undefined;
    const action = searchParams.get('action') || undefined;
    const since = searchParams.get('since') || undefined;

    const backendUrl = (process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
    const params = new URLSearchParams({ org_id: orgId, limit: String(limit) });
    if (actor) params.set('actor', actor);
    if (entity) params.set('entity', entity);
    if (action) params.set('action', action);
    if (since) params.set('since', since);

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const res = await fetch(
      `${backendUrl}/api/startup-activity?${params.toString()}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      }
    ).catch((err) => {
      console.warn('[activity] backend fetch failed:', err?.name === 'AbortError' ? 'timeout' : err);
      return new Response(JSON.stringify({ activities: [] }), { status: 502 });
    });

    clearTimeout(timeout);
    const data = await res.json().catch(() => ({ activities: [] }));
    return NextResponse.json(
      { activities: data.activities ?? [] },
      {
        headers: {
          'Cache-Control': 'private, max-age=30', // Cache for 30s
        },
      }
    );
  } catch (err) {
    console.error('[startup/activity]', err);
    return NextResponse.json({ activities: [] }, { status: 200 });
  }
}
