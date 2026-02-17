import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

/**
 * POST /api/onboarding/reset-to-start
 * Clears website + pitch_deck assets so the user can start onboarding from the beginning.
 * Use when extraction is not ready (e.g. user left during extraction).
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
      return NextResponse.json({ ok: true });
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('org_type')
      .eq('id', orgId)
      .single();

    if (orgError || !org || org.org_type !== 'startup') {
      return NextResponse.json({ ok: true });
    }

    // Clear website
    await supabase
      .from('organizations')
      .update({ website: null, updated_at: new Date().toISOString() })
      .eq('id', orgId);

    // Delete pitch_deck assets
    await supabase
      .from('org_assets')
      .delete()
      .eq('org_id', orgId)
      .eq('category', 'pitch_deck');

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
