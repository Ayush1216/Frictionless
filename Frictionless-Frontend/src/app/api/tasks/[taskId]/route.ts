import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

async function getBackend(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const backendUrl = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';
  return fetch(`${backendUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token ?? '');
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getCurrentUserOrgId(supabase);
    const body = await request.json().catch(() => ({}));

    const res = await getBackend(
      token ?? '',
      `/api/tasks/${taskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail ?? 'Failed to update task' },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[tasks PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
