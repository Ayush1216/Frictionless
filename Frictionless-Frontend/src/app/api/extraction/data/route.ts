import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

/**
 * GET /api/extraction/data
 * Returns extraction_data from startup_extraction_results for current user's org.
 */
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
      return NextResponse.json({ status: 'pending', error: 'No organization' }, { status: 200 });
    }

    const backendUrl = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';
    const res = await fetch(
      `${backendUrl.replace(/\/$/, '')}/api/extraction-data?org_id=${encodeURIComponent(orgId)}`
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ status: 'pending', error: data?.detail || 'Backend error' }, { status: 200 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { status: 'pending', error: err instanceof Error ? err.message : 'Server error' },
      { status: 200 }
    );
  }
}
