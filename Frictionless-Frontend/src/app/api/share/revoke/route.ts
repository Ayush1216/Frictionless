import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/share/revoke
 * Revoke a share link by token. Body: { token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token || null);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await getCurrentUserOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const shareToken = typeof body.token === 'string' ? body.token.trim() : '';

    if (!shareToken) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('share_links')
      .delete()
      .eq('token', shareToken)
      .eq('org_id', orgId);

    if (error) {
      console.error('[share/revoke]', error);
      return NextResponse.json({ error: 'Failed to revoke link' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[share/revoke]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
