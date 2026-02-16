import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

/**
 * GET /api/onboarding/status
 * Returns { completed: boolean } for the current user's org.
 * Startup: completed when org has website and at least one pitch_deck asset.
 * Capital provider: completed when org has website and at least one thesis_document asset.
 * Other org types: treated as completed (no onboarding required).
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
      return NextResponse.json({ completed: false }, { status: 200 });
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('org_type, website')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ completed: false }, { status: 200 });
    }

    if (org.org_type !== 'startup' && org.org_type !== 'capital_provider') {
      return NextResponse.json({ completed: true }, { status: 200 });
    }

    const category = org.org_type === 'startup' ? 'pitch_deck' : 'thesis_document';
    const hasWebsite = !!org.website?.trim();

    const { count, error: countError } = await supabase
      .from('org_assets')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('category', category);

    if (countError) {
      return NextResponse.json({ completed: false }, { status: 200 });
    }

    const hasAsset = (count ?? 0) > 0;
    let completed = hasWebsite && hasAsset;
    let step: 'website' | 'pitch_deck' | 'questionnaire' | undefined;

    if (org.org_type === 'startup') {
      const { data: qRow } = await supabase
        .from('startup_readiness_questionnaire')
        .select('org_id')
        .eq('org_id', orgId)
        .single();
      const hasQuestionnaire = !!qRow;
      completed = hasWebsite && hasAsset && hasQuestionnaire;
      if (!completed) {
        if (!hasWebsite) step = 'website';
        else if (!hasAsset) step = 'pitch_deck';
        else step = 'questionnaire';
      }
    }

    return NextResponse.json({ completed, step }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
