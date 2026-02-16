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
    const userId = (await supabase.auth.getUser()).data?.user?.id ?? null;

    const res = await getBackend(token ?? '', `/api/tasks/${taskId}/comments`);
    const data = await res.json().catch(() => ({ comments: [] }));
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    const comments = (data.comments ?? []).map((c: { id: string; author_user_id?: string; content: string; created_at: string; source?: string }) => ({
      id: c.id,
      author: c.author_user_id === userId ? 'You' : 'Team member',
      author_user_id: c.author_user_id,
      content: c.content,
      created_at: c.created_at,
    }));
    return NextResponse.json({ comments });
  } catch (err) {
    console.error('[tasks/comments GET]', err);
    return NextResponse.json({ comments: [] }, { status: 200 });
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
    if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (await supabase.auth.getUser()).data?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await getCurrentUserOrgId(supabase);

    const body = await request.json().catch(() => ({}));
    const content = (body.content ?? '').trim();
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const res = await getBackend(token ?? '', `/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, author_user_id: userId }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    if (data.comment) {
      data.comment = {
        ...data.comment,
        author: 'You',
      };
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[tasks/comments POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
