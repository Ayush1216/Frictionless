import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/share/readiness
 * Creates a share link with a rich readiness snapshot including:
 * - Overall score + delta + history
 * - Categories with rubric items
 * - Tasks grouped by category
 * - Company profile from extraction table
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
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const expiresHours = typeof body.expires_hours === 'number' ? body.expires_hours : 168;
    const snapshot = body.readiness_snapshot || {};

    // Get org name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle();

    // Get company profile from extraction table
    let companyProfile: Record<string, unknown> = {};
    try {
      const { data: extraction } = await supabase
        .from('extraction')
        .select('company_name, description, industry, stage, founded_year, location, website, team_size')
        .eq('org_id', orgId)
        .maybeSingle();
      if (extraction) companyProfile = extraction as Record<string, unknown>;
    } catch { /* extraction table may not exist */ }

    const shareToken = randomBytes(32).toString('hex');
    const expiresAt = expiresHours > 0
      ? new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString()
      : null;

    // Build the full snapshot with company info
    const fullSnapshot = {
      ...snapshot,
      company_name: org?.name || snapshot.company_name || 'Startup',
      company_profile: {
        ...(companyProfile || {}),
        ...(snapshot.company_profile || {}),
      },
      generated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('share_links').insert({
      token: shareToken,
      org_id: orgId,
      share_type: 'company_profile',
      expires_at: expiresAt,
      permissions: {
        view: true,
        is_readiness_report: true,
        readiness_snapshot: fullSnapshot,
      },
    });

    if (error) {
      console.error('[share/readiness] DB error:', error.message, error.details);
      return NextResponse.json({ error: `Failed to create share link: ${error.message}` }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (request.nextUrl?.origin || '');
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    return NextResponse.json({
      token: shareToken,
      url: shareUrl,
      share_type: 'readiness_report',
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error('[share/readiness]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
