import { getAuthHeaders } from '@/lib/api/tasks';
import type { ChatThread, ChatMessage } from '@/types/database';

// ─── Thread CRUD ───

export async function fetchThreads(): Promise<ChatThread[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/intelligence/threads', { headers });
  const data = await res.json().catch(() => ({ threads: [] }));
  return data.threads ?? [];
}

export async function createThread(title?: string): Promise<ChatThread | null> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/intelligence/threads', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title ?? 'New Chat' }),
  });
  const data = await res.json().catch(() => ({}));
  return data.thread ?? null;
}

export async function deleteThread(threadId: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/intelligence/threads?id=${threadId}`, {
    method: 'DELETE',
    headers,
  });
  return res.ok;
}

// ─── Messages ───

export async function fetchMessages(threadId: string): Promise<ChatMessage[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/intelligence/threads/${threadId}/messages`, { headers });
  const data = await res.json().catch(() => ({ messages: [] }));
  return data.messages ?? [];
}

export async function saveMessage(
  threadId: string,
  role: string,
  content: string,
  attachments?: unknown[],
  metadata?: Record<string, unknown>
): Promise<ChatMessage | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/intelligence/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content, attachments, metadata }),
  });
  const data = await res.json().catch(() => ({}));
  return data.message ?? null;
}

// ─── Streaming Chat ───

export async function streamChatMessage(
  threadId: string,
  message: string,
  opts?: { responseMode?: string; attachments?: unknown[] }
): Promise<ReadableStream<Uint8Array> | null> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/intelligence/chat', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thread_id: threadId,
      message,
      response_mode: opts?.responseMode ?? 'concise',
      attachments: opts?.attachments ?? [],
    }),
  });

  if (!res.ok || !res.body) return null;
  return res.body;
}

// ─── Extraction Detection ───

export async function detectExtraction(
  threadId: string,
  message: string
): Promise<{ extracted: boolean; fields?: { field: string; value: string }[]; summary?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/intelligence/extract', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, thread_id: threadId }),
    });
    return await res.json();
  } catch {
    return { extracted: false };
  }
}
