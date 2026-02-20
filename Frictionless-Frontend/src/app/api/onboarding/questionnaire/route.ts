import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

const VALID_PRIMARY_SECTOR = [
  'saas_b2b', 'marketplace', 'consumer_app', 'saas_enterprise',
  'fintech', 'healthtech', 'hardware_iot', 'deeptech_ip', 'cpg_d2c', 'other',
];
const VALID_PRODUCT_STATUS = ['idea', 'mvp', 'beta', 'launched', 'scaling'];
const VALID_FUNDING_STAGE = ['preseed', 'seed', 'series_a', 'series_b', 'series_c_plus'];
const VALID_ROUND_TARGET = [
  'under_100k', '100k_250k', '250k_500k', '500k_1m', '1m_2m', '2m_5m', '5m_plus', 'other',
];
const VALID_ENTITY_TYPE = [
  'c_corp', 'non_us_equiv', 'pbc_bcorp',
  'llc_converting', 'scorp_converting', 'partnership_converting',
  'llc_no_convert', 'scorp_no_convert', 'sole_proprietorship',
  'no_entity', 'nonprofit', 'other_unknown',
];
const VALID_REVENUE_MODEL = ['subscription', 'usage', 'transaction', 'licensing', 'ad', 'not_monetizing'];

function isValid<T extends string>(val: unknown, allowed: readonly T[]): val is T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val);
}

/** Validate a comma-separated multiselect value. Each part must be in the allowed list. */
function isValidMulti(val: unknown, allowed: readonly string[]): boolean {
  if (typeof val !== 'string' || !val.trim()) return false;
  return val.split(',').every((v) => allowed.includes(v.trim()));
}

/**
 * POST /api/onboarding/questionnaire
 * Saves the 6 required startup readiness questionnaire answers.
 * Startup only.
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

    const { data: org } = await supabase
      .from('organizations')
      .select('org_type')
      .eq('id', orgId)
      .single();

    if (org?.org_type !== 'startup') {
      return NextResponse.json({ error: 'Questionnaire is for startups only' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const primary_sector = body.primary_sector;
    const product_status = body.product_status;
    const funding_stage = body.funding_stage;
    const round_target = body.round_target;
    const entity_type = body.entity_type;
    const revenue_model = body.revenue_model;
    const primary_sector_other = typeof body.primary_sector_other === 'string' ? body.primary_sector_other.trim() : '';
    const round_target_other = typeof body.round_target_other === 'string' ? body.round_target_other.trim() : '';
    const entity_type_other = typeof body.entity_type_other === 'string' ? body.entity_type_other.trim() : '';

    if (!isValidMulti(primary_sector, VALID_PRIMARY_SECTOR)) {
      return NextResponse.json({ error: 'Invalid primary_sector' }, { status: 400 });
    }
    if (typeof primary_sector === 'string' && primary_sector.split(',').includes('other') && !primary_sector_other) {
      return NextResponse.json({ error: 'Please specify your primary sector when selecting Other' }, { status: 400 });
    }
    if (!isValid(product_status, VALID_PRODUCT_STATUS)) {
      return NextResponse.json({ error: 'Invalid product_status' }, { status: 400 });
    }
    if (!isValid(funding_stage, VALID_FUNDING_STAGE)) {
      return NextResponse.json({ error: 'Invalid funding_stage' }, { status: 400 });
    }
    if (!isValid(round_target, VALID_ROUND_TARGET)) {
      return NextResponse.json({ error: 'Invalid round_target' }, { status: 400 });
    }
    if (round_target === 'other' && !round_target_other) {
      return NextResponse.json({ error: 'Please specify your round target when selecting Other' }, { status: 400 });
    }
    if (!isValid(entity_type, VALID_ENTITY_TYPE)) {
      return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 });
    }
    if (!isValidMulti(revenue_model, VALID_REVENUE_MODEL)) {
      return NextResponse.json({ error: 'Invalid revenue_model' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const row = {
      org_id: orgId,
      primary_sector,
      product_status,
      funding_stage,
      round_target,
      entity_type,
      revenue_model,
      ...(typeof primary_sector === 'string' && primary_sector.split(',').includes('other') && primary_sector_other && { primary_sector_other }),
      ...(round_target === 'other' && round_target_other && { round_target_other }),
      updated_at: now,
    };

    const { error } = await supabase
      .from('startup_readiness_questionnaire')
      .upsert(row, { onConflict: 'org_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger readiness scoring on backend (runs asynchronously on backend)
    const backendUrl = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl.replace(/\/$/, '')}/api/run-readiness-scoring`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
        signal: AbortSignal.timeout(10_000), // 10 s — backend accepts and queues immediately
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.warn('[questionnaire] Backend scoring trigger returned non-OK:', res.status, txt.slice(0, 200));
      }
    } catch (e) {
      const isTimeout = e instanceof DOMException && e.name === 'TimeoutError';
      console.warn('[questionnaire] Failed to trigger readiness scoring:', isTimeout ? 'timeout (10s)' : e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
