import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/team/members
 * Returns team members + pending invites for the current user's org.
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
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }

    // Fetch active members from org_memberships joined with auth profiles
    const { data: memberships, error: membErr } = await supabase
      .from('org_memberships')
      .select('user_id, role, created_at')
      .eq('org_id', orgId);

    if (membErr) {
      console.error('[team/members] memberships error:', membErr);
    }

    // Build members list from memberships
    const members: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: 'active' | 'invited';
      joinedAt: string;
      avatar?: string;
    }[] = [];

    if (memberships && memberships.length > 0) {
      // Fetch user profiles for these user_ids
      const userIds = memberships.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      for (const m of memberships) {
        const profile = profileMap.get(m.user_id);
        members.push({
          id: m.user_id,
          name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          role: m.role || 'viewer',
          status: 'active',
          joinedAt: m.created_at,
          avatar: profile?.avatar_url || undefined,
        });
      }
    }

    // Fetch pending invites
    const { data: invites } = await supabase
      .from('team_invites')
      .select('id, email, role, created_at')
      .eq('org_id', orgId)
      .eq('status', 'pending');

    const pendingInvites = (invites || []).map((inv) => ({
      id: inv.id,
      name: inv.email.split('@')[0],
      email: inv.email,
      role: inv.role || 'viewer',
      status: 'invited' as const,
      joinedAt: inv.created_at,
    }));

    return NextResponse.json({
      members: [...members, ...pendingInvites],
    });
  } catch (err) {
    console.error('[team/members]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
