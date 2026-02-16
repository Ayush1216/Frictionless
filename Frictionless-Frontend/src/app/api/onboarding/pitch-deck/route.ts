import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

const BUCKET = 'org-assets';
const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';
const CATEGORY = 'pitch_deck';

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !file.size) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = safeName.split('.').pop() || 'pdf';
    const storagePath = `${orgId}/pitch_deck/${Date.now()}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || 'Upload failed. Ensure the org-assets bucket exists and RLS allows uploads.' },
        { status: 500 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('org_assets').insert({
      org_id: orgId,
      category: CATEGORY,
      title: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/pdf',
      file_size_bytes: file.size,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Startups: trigger extraction pipeline (OCR, founder, charts, KV)
    const { data: org } = await supabase
      .from('organizations')
      .select('org_type')
      .eq('id', orgId)
      .single();

    const url = `${BACKEND_URL.replace(/\/$/, '')}/api/run-extraction-pipeline`;
    if (org?.org_type === 'startup' && BACKEND_URL) {
      try {
        console.log('[onboarding/pitch-deck] Triggering extraction at', url);
        const extRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org_id: orgId }),
        });
        const extData = await extRes.json().catch(() => ({}));
        if (!extRes.ok) {
          console.error('[onboarding/pitch-deck] Extraction trigger failed:', extRes.status, extData);
        } else {
          console.log('[onboarding/pitch-deck] Extraction started:', extData);
        }
      } catch (e) {
        console.error('[onboarding/pitch-deck] Extraction trigger failed:', e);
      }
    } else {
      if (org?.org_type !== 'startup') {
        console.log('[onboarding/pitch-deck] Skipping extraction: org_type=', org?.org_type);
      }
      if (!BACKEND_URL) {
        console.warn('[onboarding/pitch-deck] BACKEND_URL not set, skipping extraction');
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
