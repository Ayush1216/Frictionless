import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

/** Categories to show in Data Room: pitch deck (already uploaded) + docs added via task chat / upload */
const DATA_ROOM_CATEGORIES = ['pitch_deck', 'data_room_doc'] as const;

/**
 * GET /api/startup/data-room
 * List org_assets for the current org (pitch_deck and data_room_doc only). No dummy data.
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
      return NextResponse.json({ documents: [] }, { status: 200 });
    }

    const { data: rows, error } = await supabase
      .from('org_assets')
      .select('id, title, category, storage_path, mime_type, file_size_bytes, created_at')
      .eq('org_id', orgId)
      .in('category', [...DATA_ROOM_CATEGORIES])
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[data-room] list error:', error);
      return NextResponse.json({ documents: [] }, { status: 200 });
    }

    const documents = (rows ?? []).map((r) => ({
      id: r.id,
      name: r.title ?? 'Document',
      category: r.category as string,
      file_type: r.mime_type ?? 'application/octet-stream',
      file_size: r.file_size_bytes ?? 0,
      uploaded_at: r.created_at ?? new Date().toISOString(),
      uploaded_by: 'You',
      validation_status: 'valid' as const,
      storage_path: r.storage_path,
    }));

    return NextResponse.json({ documents });
  } catch (err) {
    console.error('[data-room]', err);
    return NextResponse.json({ documents: [] }, { status: 200 });
  }
}
