import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

async function getBackend(token: string, path: string): Promise<Response> {
  const backendUrl = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';
  return fetch(`${backendUrl.replace(/\/$/, '')}${path}`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token ?? '');
    if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await getCurrentUserOrgId(supabase);

    const res = await getBackend(token ?? '', `/api/tasks/${taskId}/events`);
    const data = await res.json().catch(() => ({ events: [] }));
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[tasks/events]', err);
    return NextResponse.json({ events: [] }, { status: 200 });
  }
}
