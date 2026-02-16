import type { Task, TaskComment } from '@/types/database';
import { supabase } from '@/lib/supabase/client';

const getAuthHeaders = async (): Promise<HeadersInit> => {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token ?? null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function fetchStartupTasks(): Promise<{
  task_groups: { id: string; category: string; title: string; description: string; impact: string; tasks: Task[] }[];
  tasks: Task[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/startup/tasks', { headers });
  const data = await res.json().catch(() => ({ task_groups: [], tasks: [] }));
  return {
    task_groups: data.task_groups ?? [],
    tasks: data.tasks ?? [],
  };
}

export async function updateTask(
  taskId: string,
  updates: { status?: string; description?: string; due_at?: string }
): Promise<{ ok: boolean; task?: Task }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function completeTask(taskId: string): Promise<{ ok: boolean; task?: Task }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return res.json();
}

export async function fetchTaskEvents(taskId: string): Promise<{
  events: { id: string; event_type: string; from_state: Record<string, unknown>; to_state: Record<string, unknown>; created_at: string }[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/tasks/${taskId}/events`, { headers });
  const data = await res.json().catch(() => ({ events: [] }));
  return { events: data.events ?? [] };
}

export async function fetchTaskComments(taskId: string): Promise<{ comments: TaskComment[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/tasks/${taskId}/comments`, { headers });
  const data = await res.json().catch(() => ({ comments: [] }));
  return { comments: data.comments ?? [] };
}

export async function addTaskComment(
  taskId: string,
  content: string
): Promise<{ ok: boolean; comment?: TaskComment }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function fetchTaskChatMessages(
  taskId: string
): Promise<{ messages: { id: string; role: string; content: string; created_at: string }[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/tasks/${taskId}/chat`, { headers });
  const data = await res.json().catch(() => ({ messages: [] }));
  return { messages: data.messages ?? [] };
}

export async function chatWithTaskAI(
  taskId: string,
  message: string,
  history: { role: string; content: string }[] = [],
  authorUserId?: string
): Promise<{ reply: string; suggest_complete: boolean }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/tasks/${taskId}/chat`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      author_user_id: authorUserId ?? undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail ?? data?.error ?? 'Chat failed');
  return { reply: data.reply ?? '', suggest_complete: Boolean(data.suggest_complete) };
}
