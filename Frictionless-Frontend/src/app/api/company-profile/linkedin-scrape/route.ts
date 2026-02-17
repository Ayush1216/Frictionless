import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';

function isValidLinkedInUrl(url: string): { valid: boolean; message?: string } {
  const u = url.trim().replace(/^\s+|\s+$/g, '');
  if (!u) return { valid: false, message: 'URL is required' };
  let href = u;
  if (!/^https?:\/\//i.test(href)) href = 'https://' + href;
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('linkedin.com')) return { valid: false, message: 'Must be a LinkedIn URL' };
    const path = parsed.pathname.toLowerCase();
    if (path.includes('/company/')) return { valid: true };
    if (path.includes('/in/')) return { valid: false, message: 'Company profile re-scrape uses a company LinkedIn URL (e.g. linkedin.com/company/...). Person URLs are not supported for this action.' };
    return { valid: false, message: 'Use a company (linkedin.com/company/...) or person (linkedin.com/in/...) URL' };
  } catch {
    return { valid: false, message: 'Invalid URL format' };
  }
}

/**
 * POST /api/company-profile/linkedin-scrape
 * Body: { linkedin_url: string }
 * Triggers backend LinkedIn re-scrape and returns updated extraction_data + status.
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

    const { valid, message } = isValidLinkedInUrl(linkedin_url);
    if (!valid) {
      return NextResponse.json({ error: message || 'Invalid LinkedIn URL' }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/linkedin-rescrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, linkedin_url }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || 'Scrape request failed' },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[linkedin-scrape]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
