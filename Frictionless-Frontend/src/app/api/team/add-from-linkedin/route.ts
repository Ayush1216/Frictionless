import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import { isValidPersonLinkedInUrl } from '@/lib/linkedin-url';

const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://127.0.0.1:8001';
const BACKEND_TIMEOUT_MS = 60_000; // Gemini + search can take 30–60s

/**
 * POST /api/team/add-from-linkedin
 * Body: { linkedin_url: string, role_type?: "Founder" | "Leadership" | "Other", company_name_override?: string }
 * Adds a team member from a LinkedIn person profile (backend uses Gemini + Search). Returns { ok, status, person?, extraction_data?, message?, error? }.
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
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const linkedin_url = typeof body.linkedin_url === 'string' ? body.linkedin_url.trim() : '';
    const role_type = typeof body.role_type === 'string' ? body.role_type.trim() : 'Other';
    const company_name_override = typeof body.company_name_override === 'string' ? body.company_name_override.trim() || undefined : undefined;

    const { valid, message } = isValidPersonLinkedInUrl(linkedin_url);
    if (!valid) {
      return NextResponse.json({ error: message || 'Invalid LinkedIn URL' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/team/add-from-linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          linkedin_url,
          role_type: role_type || 'Other',
          company_name_override: company_name_override ?? null,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timed out. The profile may take a minute to fetch. Try again.' },
          { status: 504 }
        );
      }
      throw e;
    }
    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || 'Failed to add team member' },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[team/add-from-linkedin]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
