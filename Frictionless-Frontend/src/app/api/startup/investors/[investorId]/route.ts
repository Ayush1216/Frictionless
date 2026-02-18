import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId, getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';

function safeJsonParse(val: unknown): unknown {
  if (val == null || typeof val !== 'string') return val;
  try {
    let parsed = JSON.parse(val);
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { /* ignore */ }
    }
    return parsed;
  } catch {
    return val;
  }
}

/**
 * GET /api/startup/investors/[investorId]
 *
 * Multi-strategy lookup:
 * 1. Try investor_universal_profiles by id (UUID match)
 * 2. Try investor_universal_profiles by investor_uid (text match)
 * 3. Fallback: get embedded investor_profile from startup_investor_matches
 *
 * This guarantees we always find data regardless of which ID format was used.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ investorId: string }> }
) {
  try {
    const { investorId } = await params;
    const fetchAI = request.nextUrl.searchParams.get('ai') === '1';

    // Auth check
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sb = getSupabaseServer() || supabase;
    if (!sb) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const orgId = await getCurrentUserOrgId(supabase);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profile: Record<string, any> | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let matchData: Record<string, any> | null = null;

    // Strategy 1: Try investor_universal_profiles by id (UUID)
    {
      const { data: rows } = await sb
        .from('investor_universal_profiles')
        .select('*')
        .eq('id', investorId)
        .limit(1);
      if (rows?.length) profile = rows[0];
    }

    // Strategy 2: Try investor_universal_profiles by uid (auto-generated column)
    if (!profile) {
      const { data: rows } = await sb
        .from('investor_universal_profiles')
        .select('*')
        .eq('uid', investorId)
        .limit(1);
      if (rows?.length) profile = rows[0];
    }

    // Strategy 3: Get from startup_investor_matches (embedded investor_profile)
    if (orgId) {
      const { data: matchRows } = await sb
        .from('startup_investor_matches')
        .select('*')
        .eq('org_id', orgId)
        .eq('investor_id', investorId)
        .limit(1);
      if (matchRows?.length) {
        const raw = matchRows[0];
        matchData = {
          fit_score_0_to_100: raw.fit_score_0_to_100,
          fit_score_if_eligible_0_to_100: raw.fit_score_if_eligible_0_to_100,
          eligible: raw.eligible,
          gate_fail_reasons: safeJsonParse(raw.gate_fail_reasons) || [],
          category_breakdown: safeJsonParse(raw.category_breakdown) || {},
          investor_profile: safeJsonParse(raw.investor_profile) || {},
          matching_version: raw.matching_version,
          matched_at: raw.matched_at,
        };

        // If no profile from universal table, build from embedded match data
        if (!profile) {
          const inv = matchData.investor_profile as Record<string, unknown>;
          profile = {
            id: investorId,
            investor_name: inv?.name || inv?.investor_name || 'Unknown Investor',
            investor_type: inv?.investor_type || null,
            investor_hq_city: inv?.city || inv?.investor_hq_city || null,
            investor_hq_state: inv?.state || inv?.investor_hq_state || null,
            investor_hq_country: inv?.country || inv?.investor_hq_country || null,
            investor_url: inv?.website || inv?.investor_url || null,
            investor_linkedin_url: inv?.linkedin_url || inv?.investor_linkedin_url || null,
            investor_email: inv?.email || inv?.investor_email || null,
            investor_thesis_summary: inv?.thesis_summary || inv?.investor_thesis_summary || null,
            investor_minimum_check_usd: inv?.check_min_usd || inv?.investor_minimum_check_usd || null,
            investor_maximum_check_usd: inv?.check_max_usd || inv?.investor_maximum_check_usd || null,
            investor_typical_check_usd: inv?.check_typical_usd || inv?.investor_typical_check_usd || null,
            investor_stages: inv?.stages || inv?.investor_stages || [],
            investor_sectors: inv?.sectors || inv?.investor_sectors || [],
            investor_geography_focus: inv?.geography_focus || inv?.investor_geography_focus || [],
            investor_portfolio_size: inv?.portfolio_size || inv?.investor_portfolio_size || null,
            investor_aum_usd: inv?.aum_usd || inv?.investor_aum_usd || null,
            investor_lead_or_follow: inv?.lead_or_follow || inv?.investor_lead_or_follow || null,
            investor_active_status: inv?.active_status || inv?.investor_active_status || null,
            investor_founded_year: inv?.founded_year || inv?.investor_founded_year || null,
            logo_url: inv?.logo_url || null,
            raw_profile_json: inv,
            _source: 'match_embedded',
          };
        }
      }
    }

    if (!profile) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 });
    }

    // Parse JSON fields if from universal table
    if (profile._source !== 'match_embedded') {
      for (const field of ['raw_profile_json', 'normalized_thesis_json', 'metadata_json']) {
        if (profile[field]) profile[field] = safeJsonParse(profile[field]);
      }
      // Extract logo_url
      const meta = profile.metadata_json || {};
      if (!profile.logo_url) {
        profile.logo_url = meta?.logo_public_url || profile.raw_profile_json?.logo_url || null;
      }
    }

    // If AI insights requested, call backend
    let aiInsights = null;
    if (fetchAI) {
      const backendBase = BACKEND_URL.replace(/\/$/, '');
      try {
        const res = await fetch(
          `${backendBase}/api/investor-profile?investor_id=${encodeURIComponent(investorId)}`,
          { signal: AbortSignal.timeout(15000) }
        );
        if (res.ok) {
          const data = await res.json();
          aiInsights = data?.ai_insights || null;
        }
      } catch {
        // Backend unavailable — skip AI insights
      }
    }

    return NextResponse.json(
      { status: 'ok', profile, match: matchData, ai_insights: aiInsights },
      { headers: { 'Cache-Control': fetchAI ? 'private, max-age=60' : 'private, max-age=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('[investor-profile] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
