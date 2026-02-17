import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://127.0.0.1:8001';
const BACKEND_FETCH_TIMEOUT_MS = 10_000; // 10s so page doesn't hang on slow backend

function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(timeout));
}

/**
 * GET /api/company-profile
 * Returns company profile data for the current user's startup org. All data is read from
 * backend DB tables (no live Apollo API call on page load):
 *
 * - extraction: company profile from backend table startup_extraction_results (pitch deck
 *   extraction, LinkedIn scrape, founder data, ai_summary, etc.). This is the primary
 *   company profile stored and updated by the app.
 * - questionnaire: from Supabase startup_readiness_questionnaire.
 * - apollo: enrichment data from backend table apollo_organization_enrichment (saved
 *   when org was enriched; not a live Apollo API call).
 *
 * Backend fetches are limited to 10s each so the page loads with partial data if one source is slow.
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

    const base = BACKEND_URL.replace(/\/$/, '');
    const extractionUrl = `${base}/api/extraction-data?org_id=${encodeURIComponent(orgId)}`;
    const apolloUrl = `${base}/api/apollo-data?org_id=${encodeURIComponent(orgId)}`;

    const [extRes, questRes, apolloRes] = await Promise.all([
      fetchWithTimeout(extractionUrl).catch(() => null),
      supabase.from('startup_readiness_questionnaire').select('*').eq('org_id', orgId).single(),
      fetchWithTimeout(apolloUrl).catch(() => null),
    ]);

    const extData = extRes ? await extRes.json().catch(() => ({})) : {};
    const extraction = extData.status === 'ready' ? extData.extraction_data : null;
    const questionnaire = questRes.data ?? null;
    const apolloJson = apolloRes ? await apolloRes.json().catch(() => ({})) : {};
    const apollo = apolloJson.status === 'ready' ? apolloJson.raw_data : null;

    return NextResponse.json({
      extraction,
      questionnaire,
      apollo,
      orgId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/company-profile
 * Updates extraction_data and/or questionnaire. Optionally triggers readiness regeneration.
 */
export async function PATCH(request: NextRequest) {
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

    const { data: org } = await supabase.from('organizations').select('org_type').eq('id', orgId).single();
    if (org?.org_type !== 'startup') {
      return NextResponse.json({ error: 'Company profile is for startups only' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { extraction_patch, questionnaire: questionnaireUpdates } = body;
    // Only run readiness when client explicitly requests it (e.g. "Regenerate readiness" / "Save & recalculate")
    const regenerate_readiness = body.regenerate_readiness === true;

    if (extraction_patch && typeof extraction_patch === 'object') {
      const patchRes = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/extraction-data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, extraction_data_patch: extraction_patch }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: err?.detail || 'Failed to update extraction data' },
          { status: patchRes.status }
        );
      }
    }

    if (questionnaireUpdates && typeof questionnaireUpdates === 'object') {
      const validKeys = [
        'primary_sector', 'product_status', 'funding_stage', 'round_target',
        'entity_type', 'revenue_model', 'primary_sector_other', 'round_target_other', 'entity_type_other',
      ];
      const updates: Record<string, string> = {};
      for (const k of validKeys) {
        if (typeof questionnaireUpdates[k] === 'string') {
          updates[k] = questionnaireUpdates[k];
        }
      }
      if (Object.keys(updates).length > 0) {
        const { data: existing } = await supabase
          .from('startup_readiness_questionnaire')
          .select('*')
          .eq('org_id', orgId)
          .single();
        if (!existing) {
          return NextResponse.json(
            { error: 'Complete onboarding questionnaire first before editing' },
            { status: 400 }
          );
        }
        const required = ['primary_sector', 'product_status', 'funding_stage', 'round_target', 'entity_type', 'revenue_model'];
        const row = {
          ...existing,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        const hasAllRequired = required.every((k) => (row as Record<string, unknown>)[k]);
        if (!hasAllRequired) {
          return NextResponse.json(
            { error: 'All 6 questionnaire fields are required' },
            { status: 400 }
          );
        }
        const { error } = await supabase
          .from('startup_readiness_questionnaire')
          .upsert(row, { onConflict: 'org_id' });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    if (regenerate_readiness) {
      try {
        const readRes = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/run-readiness-scoring`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: orgId }),
        });
        if (!readRes.ok) {
          console.warn('[company-profile] Readiness regenerate failed:', readRes.status);
        }
      } catch (e) {
        console.warn('[company-profile] Readiness regenerate error:', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
