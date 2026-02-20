import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import { validateWebsite } from '@/lib/website-validation';

const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const raw = typeof body?.website === 'string' ? body.website : '';
    const validation = validateWebsite(raw);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const website = validation.sanitized;

    const orgId = await getCurrentUserOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('org_type')
      .eq('id', orgId)
      .single();

    const { error } = await supabase
      .from('organizations')
      .update({ website, updated_at: new Date().toISOString() })
      .eq('id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Startups: call backend to enrich org (Apollo → Gemini fallback) and store in Supabase
    if (org?.org_type === 'startup') {
      if (!BACKEND_URL) {
        return NextResponse.json(
          { error: 'Backend not configured. Please set FRICTIONLESS_BACKEND_URL.' },
          { status: 500 }
        );
      }
      const url = `${BACKEND_URL.replace(/\/$/, '')}/api/enrich-organization`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: orgId, website }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = (data?.detail as string) || data?.error || 'Organization enrichment failed';
          console.error('[onboarding/website] Enrichment failed:', res.status, data);
          return NextResponse.json({ error: msg }, { status: res.status >= 400 ? res.status : 502 });
        }
        if (data?.source) {
          console.log(`[onboarding/website] Enrichment succeeded via ${data.source}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Backend unreachable';
        console.error('[onboarding/website] Backend fetch failed:', e);
        return NextResponse.json(
          { error: `Could not enrich organization: ${msg}. Ensure the backend is running.` },
          { status: 502 }
        );
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
