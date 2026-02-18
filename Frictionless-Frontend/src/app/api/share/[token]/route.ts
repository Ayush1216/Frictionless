import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/share/:token
 * H1: Public share link - no auth required. Returns profile/data-room payload if token valid.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { data: link, error } = await supabase
      .from('share_links')
      .select('org_id, share_type, expires_at, permissions')
      .eq('token', token)
      .maybeSingle();

    if (error || !link) {
      return NextResponse.json({ error: 'Link not found or invalid' }, { status: 404 });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }

    // Fetch basic org info for display
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', link.org_id)
      .maybeSingle();

    const companyName = org?.name ?? undefined;

    if (link.share_type === 'data_room') {
      // List documents for data room (public read - org_assets)
      const { data: assets } = await supabase
        .from('org_assets')
        .select('id, name, category, file_size, created_at')
        .eq('org_id', link.org_id)
        .in('category', ['pitch_deck', 'data_room_doc'])
        .order('created_at', { ascending: false });

      return NextResponse.json({
        share_type: 'data_room',
        company_name: companyName,
        documents: assets ?? [],
      });
    }

    // Check if this is a readiness report (stored as company_profile with is_readiness_report flag)
    const permissions = (link.permissions as Record<string, unknown>) ?? {};
    if (permissions.is_readiness_report || link.share_type === 'readiness_report') {
      const snapshot = (permissions.readiness_snapshot as Record<string, unknown>) ?? {};
      return NextResponse.json({
        share_type: 'readiness_report',
        company_name: snapshot.company_name || companyName,
        readiness: snapshot,
      });
    }

    return NextResponse.json({
      share_type: 'company_profile',
      company_name: companyName,
    });
  } catch (err) {
    console.error('[share/:token]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
