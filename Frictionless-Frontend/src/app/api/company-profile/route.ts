import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId, getSupabaseServer } from '@/lib/supabase/server';

const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'https://api.frictionlessintelligence.com';

/**
 * GET /api/company-profile
 * Returns company profile data for the current user's startup org.
 *
 * Optimized: reads directly from Supabase (via service role) instead of
 * going through the backend for extraction and apollo data.
 * This eliminates 2 HTTP hops and reduces load time by ~500-1000ms.
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

    // Use service-role client (bypasses RLS) if available; otherwise fall back to user client
    const sb = getSupabaseServer() ?? supabase;

    // All 3 queries run in parallel — use maybeSingle() to handle 0-row case gracefully
    const [extractionRes, questRes, apolloRes] = await Promise.all([
      sb
        .from('startup_extraction_results')
        .select('extraction_data')
        .eq('org_id', orgId)
        .limit(1)
        .maybeSingle(),
      sb
        .from('startup_readiness_questionnaire')
        .select('*')
        .eq('org_id', orgId)
        .maybeSingle(),
      sb
        .from('apollo_organization_enrichment')
        .select('raw_data')
        .eq('org_id', orgId)
        .limit(1)
        .maybeSingle(),
    ]);

    const extraction = extractionRes.data?.extraction_data ?? null;
    const questionnaire = questRes.data ?? null;
    const apollo = apolloRes.data?.raw_data ?? null;

    // If service-role returned nothing, try via backend as fallback
    if (!extraction && !questionnaire && !apollo) {
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        const [extBackend, apolloBackend] = await Promise.all([
          fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/extraction-data?org_id=${orgId}`, { headers })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null),
          fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/apollo-data?org_id=${orgId}`, { headers })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null),
        ]);
        const fallbackExtraction = extBackend?.status === 'ready' ? extBackend.extraction_data : (extBackend?.extraction_data ?? null);
        const fallbackApollo = apolloBackend?.raw_data ?? apolloBackend?.data ?? null;

        if (fallbackExtraction || fallbackApollo) {
          return NextResponse.json(
            { extraction: fallbackExtraction, questionnaire: questRes.data ?? null, apollo: fallbackApollo, orgId },
            { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
          );
        }
      } catch {
        // continue with null data
      }
    }

    return NextResponse.json(
      { extraction, questionnaire, apollo, orgId },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/company-profile
 * Updates extraction_data and/or questionnaire. Optionally triggers Frictionless regeneration.
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
          console.warn('[company-profile] Frictionless regenerate failed:', readRes.status);
        }
      } catch (e) {
        console.warn('[company-profile] Frictionless regenerate error:', e);
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
