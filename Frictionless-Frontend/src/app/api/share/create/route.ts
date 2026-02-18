import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/share/create
 * H1: Create a tokenized share link for company_profile or data_room.
 * Body: { share_type: 'company_profile' | 'data_room', expires_hours?: number }
 */
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
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const shareType = body.share_type === 'data_room' ? 'data_room' : 'company_profile';
    const expiresHours = typeof body.expires_hours === 'number' ? body.expires_hours : 168; // 7 days default

    const shareToken = randomBytes(32).toString('hex');
    const expiresAt = expiresHours > 0
      ? new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase.from('share_links').insert({
      token: shareToken,
      org_id: orgId,
      share_type: shareType,
      expires_at: expiresAt,
      permissions: { view: true },
    });

    if (error) {
      console.error('[share/create]', error);
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (request.nextUrl?.origin || '');
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    return NextResponse.json({
      token: shareToken,
      url: shareUrl,
      share_type: shareType,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('[share/create]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
