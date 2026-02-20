import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

const BUCKET = 'org-assets';
const CATEGORY = 'data_room_doc';
const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';

/**
 * POST /api/startup/data-room/upload
 * Upload a file to the data room (storage + org_assets), then trigger backend to process it
 * (OCR, KV merge, Frictionless). Used from Data Room page and from task chat when user sends proof.
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !file.size) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // Don't store the same document again if it already exists in the data room (by title)
    const { data: existingRows } = await supabase
      .from('org_assets')
      .select('id, storage_path')
      .eq('org_id', orgId)
      .eq('category', CATEGORY)
      .eq('title', file.name)
      .limit(1);

    if (existingRows?.length) {
      return NextResponse.json({
        ok: true,
        already_exists: true,
        storage_path: existingRows[0]?.storage_path ?? null,
      });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${orgId}/data_room/${Date.now()}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || 'Upload failed' },
        { status: 500 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('org_assets').insert({
      org_id: orgId,
      category: CATEGORY,
      title: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/octet-stream',
      file_size_bytes: file.size,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Trigger backend: OCR doc, merge KV into extraction, run Frictionless
    try {
      const url = `${BACKEND_URL.replace(/\/$/, '')}/api/process-dataroom-doc`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, storage_path: storagePath }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[data-room/upload] process-dataroom-doc failed:', res.status, err);
      }
    } catch (e) {
      console.warn('[data-room/upload] backend trigger failed:', e);
    }

    return NextResponse.json({ ok: true, storage_path: storagePath });
  } catch (err) {
    console.error('[data-room/upload]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
