import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId, getSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';
const TARGET_MATCHES = 10;

/** Parse a value that might be a JSON string (handles double-encoded jsonb) */
function safeJson(val: unknown): unknown {
  if (val == null) return val;
  if (typeof val !== 'string') return val;
  try {
    let parsed = JSON.parse(val);
    // Double-encoded: string → string → object
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { /* ignore */ }
    }
    return parsed;
  } catch {
    return val;
  }
}

/** Ensure jsonb fields on a match row are objects, not strings, and numeric fields are numbers */
function normalizeMatch(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    fit_score_0_to_100: Number(row.fit_score_0_to_100) || 0,
    fit_score_if_eligible_0_to_100: Number(row.fit_score_if_eligible_0_to_100) || 0,
    eligible: row.eligible === true || row.eligible === 'true',
    investor_profile: safeJson(row.investor_profile) || {},
    category_breakdown: safeJson(row.category_breakdown) || {},
    gate_fail_reasons: safeJson(row.gate_fail_reasons) || [],
  };
}

/**
 * GET /api/startup/investors
 *
 * 1. Query startup_investor_matches DIRECTLY from Supabase using org_id.
 * 2. If matches exist → return immediately (no backend call needed).
 * 3. If no matches → check backend status, trigger pipeline if needed.
 */
export async function GET(request: NextRequest) {
  try {
    // --- Auth ---
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await getCurrentUserOrgId(supabase);
    if (!orgId) {
      return NextResponse.json(
        { status: 'error', error: 'No organization found. Please complete your startup profile first.', matches: [] },
        { status: 200 }
      );
    }

    // --- 1. Check startup_investor_matches directly from Supabase ---
    // Try service-role client first (bypasses RLS), fall back to authenticated client
    const sb = getSupabaseServer() || supabase;
    const { data: rows, error: dbErr } = await sb
      .from('startup_investor_matches')
      .select('*')
      .eq('org_id', orgId)
      .order('fit_score_0_to_100', { ascending: false });

    if (dbErr) {
      console.error('[investors/route] Supabase query error:', dbErr.message);
      // If service-role failed (e.g. RLS), retry with authenticated client
      if (sb !== supabase) {
        const { data: rows2, error: dbErr2 } = await supabase
          .from('startup_investor_matches')
          .select('*')
          .eq('org_id', orgId)
          .order('fit_score_0_to_100', { ascending: false });

        if (!dbErr2 && rows2 && rows2.length > 0) {
          const matches = rows2.map(normalizeMatch);
          if (matches.length < TARGET_MATCHES) triggerPipeline(orgId);
          return NextResponse.json(
            { status: 'ready', matches, match_count: matches.length },
            { headers: { 'Cache-Control': 'no-store' } }
          );
        }
        if (dbErr2) console.error('[investors/route] Auth client also failed:', dbErr2.message);
      }
    }

    if (!dbErr && rows && rows.length > 0) {
      const matches = rows.map(normalizeMatch);

      // If fewer than target, trigger more in background (non-blocking)
      if (matches.length < TARGET_MATCHES) {
        triggerPipeline(orgId);
      }

      return NextResponse.json(
        { status: 'ready', matches, match_count: matches.length },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // --- Fast path: if frontend already knows pipeline is running, skip the slow backend status call ---
    // BUT still check DB directly — matches may have been progressively written since last poll
    const knownStatus = request.nextUrl.searchParams.get('known_status');
    if (knownStatus === 'generating' || knownStatus === 'matching') {
      // Re-query DB with auth client (in case service-role check above failed/was skipped)
      const { data: fastRows } = await supabase
        .from('startup_investor_matches')
        .select('*')
        .eq('org_id', orgId)
        .order('fit_score_0_to_100', { ascending: false });
      if (fastRows && fastRows.length > 0) {
        const matches = fastRows.map(normalizeMatch);
        return NextResponse.json(
          { status: 'ready', matches, match_count: matches.length },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }
      // Still nothing in DB — pipeline genuinely in progress
      return NextResponse.json(
        { status: knownStatus, matches: [], message: `Pipeline still ${knownStatus}...` },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // --- 2. No matches in DB yet — check backend status & trigger pipeline ---
    const backendBase = BACKEND_URL.replace(/\/$/, '');

    let backendStatus = 'unknown';
    try {
      const res = await fetch(
        `${backendBase}/api/investor-matches?org_id=${encodeURIComponent(orgId)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json().catch(() => ({}));
      backendStatus = data.status || 'unknown';
    } catch (err) {
      backendStatus = 'unreachable';
      console.error(`[investors/route] Backend unreachable at ${backendBase}:`, err instanceof Error ? err.message : err);
    }

    // If pipeline is already running, relay the status
    if (backendStatus === 'generating') {
      return NextResponse.json({ status: 'generating', matches: [], message: 'Generating thesis profile...' });
    }
    if (backendStatus === 'matching') {
      return NextResponse.json({ status: 'matching', matches: [], message: 'Finding investor matches...' });
    }

    // Backend unreachable — return error, do NOT pretend to be matching
    if (backendStatus === 'unreachable') {
      console.error('[investors/route] Backend is unreachable — returning error to frontend');
      return NextResponse.json({
        status: 'error',
        error: `Backend server is not reachable at ${backendBase}. Please make sure the backend is running (uvicorn app.main:app).`,
        matches: [],
      });
    }

    // Backend is reachable but no matches yet — trigger pipeline and report status
    const triggered = await triggerPipelineWithStatus(orgId);

    if (!triggered) {
      console.error('[investors/route] Failed to trigger pipeline');
      return NextResponse.json({
        status: 'error',
        error: 'Could not start the investor matching pipeline. The backend may be busy or misconfigured.',
        matches: [],
      });
    }

    // Pipeline was successfully triggered
    const returnStatus = backendStatus === 'no_profile' ? 'generating' : 'matching';
    return NextResponse.json({
      status: returnStatus,
      matches: [],
      message: returnStatus === 'generating'
        ? 'Generating thesis profile...'
        : 'Starting investor matching pipeline...',
    });
  } catch (err) {
    console.error('[investors/route] Unhandled error:', err);
    return NextResponse.json(
      { status: 'error', error: err instanceof Error ? err.message : 'Server error', matches: [] },
      { status: 200 }
    );
  }
}

/** Fire-and-forget: trigger the backend pipeline (used for background match top-up) */
function triggerPipeline(orgId: string) {
  const backendBase = BACKEND_URL.replace(/\/$/, '');
  fetch(`${backendBase}/api/run-investor-pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, max_matches: 10 }),
    signal: AbortSignal.timeout(30_000), // 30 s — pipeline accepts and runs async
  }).catch(() => {
    // Non-critical: background top-up failed; user already has existing matches
  });
}

/** Trigger pipeline and wait for response to verify it actually started */
async function triggerPipelineWithStatus(orgId: string): Promise<boolean> {
  const backendBase = BACKEND_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${backendBase}/api/run-investor-pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, max_matches: 10 }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.ok !== false;
  } catch (err) {
    console.error('[investors/route] Pipeline trigger failed:', err instanceof Error ? err.message : err);
    return false;
  }
}
