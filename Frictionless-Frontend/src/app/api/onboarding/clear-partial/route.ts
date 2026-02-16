import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

/**
 * POST /api/onboarding/clear-partial
 * Clears partial onboarding data so the user can start fresh.
 * Only clears when onboarding is incomplete (e.g. website set but no pitch deck).
 * Safe to call when already complete (no-op).
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
      .select('org_type, website')
      .eq('id', orgId)
      .single();

    if (orgError || !org || (org.org_type !== 'startup' && org.org_type !== 'capital_provider')) {
      return NextResponse.json({ ok: true });
    }

    const category = org.org_type === 'startup' ? 'pitch_deck' : 'thesis_document';

    const { count } = await supabase
      .from('org_assets')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('category', category);

    const hasAsset = (count ?? 0) > 0;
    const hasWebsite = !!org.website?.trim();
    const isPartial = hasWebsite && !hasAsset;

    if (!isPartial) {
      return NextResponse.json({ ok: true });
    }

    await supabase
      .from('organizations')
      .update({ website: null, updated_at: new Date().toISOString() })
      .eq('id', orgId);

    await supabase
      .from('org_assets')
      .delete()
      .eq('org_id', orgId)
      .eq('category', category);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
