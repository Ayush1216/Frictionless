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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string>),
    },
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

    const res = await getBackend(token ?? '', `/api/tasks/${taskId}/chat-messages`);
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[tasks chat-messages]', err);
    return NextResponse.json({ messages: [] }, { status: 200 });
  }
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

    await getCurrentUserOrgId(supabase);
    const userId = (await supabase.auth.getUser()).data?.user?.id ?? null;
    const body = await request.json().catch(() => ({}));

    const res = await getBackend(
      token ?? '',
      `/api/tasks/${taskId}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({
          message: body.message ?? '',
          history: body.history ?? [],
          author_user_id: body.author_user_id ?? userId,
        }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail ?? 'Chat failed' },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[tasks chat]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
