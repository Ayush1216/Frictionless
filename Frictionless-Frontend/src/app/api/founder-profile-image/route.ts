import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import { fetchAndExtractProfileImageUrl } from '@/lib/linkedin-profile-image';

const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';

/**
 * POST /api/founder-profile-image
 * Fetches LinkedIn profile image: tries direct fetch first; on HTTP 999 (LinkedIn block) falls back to backend (Gemini+Search).
 * Returns extracted image URL + metadata or error. Does not persist; caller persists to extraction_data.
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
    const linkedinUrl = typeof body.linkedin_url === 'string' ? body.linkedin_url.trim() : '';
    if (!linkedinUrl) {
      return NextResponse.json({ error: 'linkedin_url is required' }, { status: 400 });
    }
    if (!linkedinUrl.toLowerCase().includes('linkedin.com/in/')) {
      return NextResponse.json({ error: 'Use a LinkedIn person profile URL (linkedin.com/in/...)' }, { status: 400 });
    }

    let result = await fetchAndExtractProfileImageUrl(linkedinUrl);

    // When LinkedIn returns HTTP 999 (blocks automated access), fall back to backend Gemini+Search
    const useBackendFallback =
      'error' in result &&
      (result.error.includes('999') || result.error.includes('blocks automated') || result.error.includes('backend fallback'));

    if (useBackendFallback && BACKEND_URL) {
      try {
        const backendRes = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/profile-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: orgId, linkedin_url: linkedinUrl }),
        });
        const backendData = (await backendRes.json().catch(() => ({}))) as { profile_image_url?: string | null };
        const backendUrl = (backendData.profile_image_url || '').trim();
        if (backendRes.ok && backendUrl) {
          return NextResponse.json({
            profile_image_url: backendUrl,
            profile_image_source: 'linkedin',
            profile_image_synced_at: new Date().toISOString(),
          });
        }
      } catch (backendErr) {
        console.warn('[founder-profile-image] Backend fallback failed', backendErr);
      }
    }

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error, debug_scraped_url: result.debug_scraped_url ?? null },
        { status: 422 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
