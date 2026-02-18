import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/team/invite
 * G2: Create a team invite. Body: { email: string, role?: string }
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

    const { data: { user } } = await supabase.auth.getUser();
    const createdBy = user?.id ?? null;

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = typeof body.role === 'string' && ['admin', 'member', 'viewer'].includes(body.role) ? body.role : 'member';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const { data: invite, error } = await supabase
      .from('team_invites')
      .insert({
        org_id: orgId,
        email,
        role,
        invite_token: inviteToken,
        status: 'pending',
        created_by: createdBy,
        expires_at: expiresAt,
      })
      .select('id, email, role, invite_token, expires_at, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 409 });
      }
      console.error('[team/invite]', error);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (request.nextUrl?.origin || '');
    const acceptUrl = `${baseUrl}/auth/accept-invite?token=${inviteToken}`;

    return NextResponse.json({
      ok: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
        accept_url: acceptUrl,
      },
    });
  } catch (err) {
    console.error('[team/invite]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
