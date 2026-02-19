import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatThread, ChatMessage, ChatAttachment } from '@/types/database';
import {
  fetchThreads,
  createThread,
  deleteThread as apiDeleteThread,
  fetchMessages,
  streamChatMessage,
  detectExtraction,
} from '@/lib/api/intelligence';

const PINNED_KEY = 'frictionless_pinned_threads';

function loadPinnedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function savePinnedIds(ids: Set<string>) {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(Array.from(ids)));
  } catch { /* ignore */ }
}

export interface UseIntelligenceChatReturn {
  threads: ChatThread[];
  activeThreadId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  setActiveThreadId: (id: string | null) => void;
  sendMessage: (text: string, attachments?: ChatAttachment[], threadIdOverride?: string) => Promise<void>;
  createNewThread: () => Promise<string | null>;
  deleteThread: (threadId: string) => Promise<void>;
  togglePin: (threadId: string) => void;
  responseMode: string;
  setResponseMode: (mode: string) => void;
  refreshThreads: () => Promise<void>;
}

export function useIntelligenceChat(): UseIntelligenceChatReturn {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [responseMode, setResponseMode] = useState('concise');
  const pinnedRef = useRef(loadPinnedIds());
  const abortRef = useRef(false);

  // Apply pinned status to threads
  const applyPins = useCallback((rawThreads: ChatThread[]): ChatThread[] => {
    const pins = pinnedRef.current;
    return rawThreads.map(t => ({ ...t, pinned: pins.has(t.id) }));
  }, []);

  // Load threads from DB on mount
  const refreshThreads = useCallback(async () => {
    try {
      setIsLoadingThreads(true);
      const raw = await fetchThreads();
      setThreads(applyPins(raw));
    } catch {
      // DB unreachable - leave threads empty
    } finally {
      setIsLoadingThreads(false);
    }
  }, [applyPins]);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const msgs = await fetchMessages(activeThreadId);
        if (!cancelled) setMessages(msgs);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setIsLoadingMessages(false);
      }
    };

    loadMessages();
    return () => { cancelled = true; };
  }, [activeThreadId]);

  // Create a new thread
  const createNewThread = useCallback(async () => {
    try {
      const thread = await createThread();
      if (thread) {
        setThreads(prev => applyPins([thread, ...prev]));
        setActiveThreadId(thread.id);
        return thread.id;
      }
    } catch { /* ignore */ }
    return null;
  }, [applyPins]);

  // Delete a thread
  const deleteThreadHandler = useCallback(async (threadId: string) => {
    try {
      await apiDeleteThread(threadId);
      setThreads(prev => prev.filter(t => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setMessages([]);
      }
      // Remove from pins
      pinnedRef.current.delete(threadId);
      savePinnedIds(pinnedRef.current);
    } catch { /* ignore */ }
  }, [activeThreadId]);

  // Toggle pin
  const togglePin = useCallback((threadId: string) => {
    const pins = pinnedRef.current;
    if (pins.has(threadId)) {
      pins.delete(threadId);
    } else {
      pins.add(threadId);
    }
    savePinnedIds(pins);
    pinnedRef.current = new Set(pins);
    setThreads(prev => prev.map(t =>
      t.id === threadId ? { ...t, pinned: pins.has(threadId) } : t
    ));
  }, []);

  // Send a message with streaming
  // Optional threadIdOverride allows sending to a just-created thread
  // before React state has updated (avoids stale-closure race condition).
  const sendMessage = useCallback(async (text: string, attachments?: ChatAttachment[], threadIdOverride?: string) => {
    const threadId = threadIdOverride || activeThreadId;
    if (!threadId || isStreaming) return;

    // Optimistically add user message to local state
    const userMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      thread_id: threadId,
      role: 'user',
      content: text,
      attachments: attachments ?? [],
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');
    abortRef.current = false;

    let fullContent = '';

    try {
      const stream = await streamChatMessage(threadId, text, {
        responseMode,
        attachments: attachments ?? [],
      });

      if (!stream) throw new Error('No stream');

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        if (abortRef.current) break;
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value, { stream: true });
        setStreamingContent(fullContent);
      }
    } catch {
      fullContent = 'Sorry, I encountered an error. Please try again.';
    }

    // Add assistant message to local state
    const assistantMsg: ChatMessage = {
      id: `temp-ai-${Date.now()}`,
      thread_id: threadId,
      role: 'assistant',
      content: fullContent,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setStreamingContent('');
    setIsStreaming(false);

    // Update thread in local state (title may have changed)
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId) return t;
      const firstUser = t.title === 'New Chat' ? text.slice(0, 60) + (text.length > 60 ? '...' : '') : t.title;
      return {
        ...t,
        title: t.title === 'New Chat' ? firstUser : t.title,
        updated_at: new Date().toISOString(),
        message_count: (t.message_count ?? 0) + 2,
      };
    }));

    // Re-fetch messages from DB to replace temp IDs with real ones
    fetchMessages(threadId).then(dbMessages => {
      if (dbMessages.length > 0) setMessages(dbMessages);
    }).catch(() => { /* keep optimistic state */ });

    // Background: detect extractable company info
    detectExtraction(threadId, text).then(result => {
      if (result.extracted && result.fields) {
        const cardMsg: ChatMessage = {
          id: `card-${Date.now()}`,
          thread_id: threadId,
          role: 'system-card',
          content: result.summary || `Saved ${result.fields.length} data point${result.fields.length > 1 ? 's' : ''} to your company profile`,
          metadata: { extracted_fields: result.fields },
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, cardMsg]);
      }
    }).catch(() => { /* ignore */ });
  }, [activeThreadId, isStreaming, responseMode]);

  return {
    threads,
    activeThreadId,
    messages,
    isStreaming,
    streamingContent,
    isLoadingThreads,
    isLoadingMessages,
    setActiveThreadId,
    sendMessage,
    createNewThread,
    deleteThread: deleteThreadHandler,
    togglePin,
    responseMode,
    setResponseMode,
    refreshThreads,
  };
}
