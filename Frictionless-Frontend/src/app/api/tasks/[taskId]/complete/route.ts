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

export async function POST(
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

    const userId = (await supabase.auth.getUser()).data?.user?.id ?? null;
    const body = await request.json().catch(() => ({}));
    const completedBy = body.completed_by ?? userId;

    const res = await getBackend(
      token ?? '',
      `/api/tasks/${taskId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ completed_by: completedBy }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail ?? 'Failed to complete task' },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[tasks complete]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
