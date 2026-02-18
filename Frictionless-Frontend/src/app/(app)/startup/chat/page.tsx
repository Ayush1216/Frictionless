'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Bot,
  ChevronLeft,
  Menu,
  Sparkles,
  Pin,
  Trash2,
  Copy,
  Zap,
  BookOpen,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AIChatInterface } from '@/components/ai/AIChatInterface';
import type { ChatThread, ChatMessage } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

type ResponseMode = 'concise' | 'deep_dive';

const RESPONSE_MODES: { value: ResponseMode; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'concise', label: 'Concise', icon: Zap, description: 'Quick, actionable answers' },
  { value: 'deep_dive', label: 'Deep Dive', icon: BookOpen, description: 'Thorough analysis with evidence' },
];

const STORAGE_KEY = 'frictionless_chat_threads';
const MESSAGES_KEY = 'frictionless_chat_messages';

interface StoredThread extends ChatThread {
  pinned?: boolean;
}

function loadThreads(): StoredThread[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveThreads(threads: StoredThread[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch { /* quota exceeded */ }
}

function loadMessages(threadId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${MESSAGES_KEY}_${threadId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(threadId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(`${MESSAGES_KEY}_${threadId}`, JSON.stringify(messages));
  } catch { /* quota exceeded */ }
}

function deleteMessages(threadId: string) {
  try {
    localStorage.removeItem(`${MESSAGES_KEY}_${threadId}`);
  } catch { /* ignore */ }
}

export default function AIChatPage() {
  const [threads, setThreads] = useState<StoredThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [responseMode, setResponseMode] = useState<ResponseMode>('concise');
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadThreads();
    setThreads(saved);
    if (saved.length > 0) {
      setActiveThreadId(saved[0].id);
    }
    setMounted(true);
  }, []);

  // Persist threads on change
  useEffect(() => {
    if (mounted) saveThreads(threads);
  }, [threads, mounted]);

  // Messages for active thread
  const activeMessages = useMemo<ChatMessage[]>(() => {
    if (!activeThreadId || !mounted) return [];
    return loadMessages(activeThreadId);
  }, [activeThreadId, mounted]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  // Separate pinned and unpinned threads
  const pinnedThreads = useMemo(() => threads.filter((t) => t.pinned), [threads]);
  const unpinnedThreads = useMemo(() => threads.filter((t) => !t.pinned), [threads]);

  const handleNewChat = useCallback(() => {
    const id = `thread-${Date.now()}`;
    const newThread: StoredThread = {
      id,
      title: 'New Chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      pinned: false,
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(id);
  }, []);

  const handlePinThread = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, pinned: !t.pinned } : t
      )
    );
    toast.success('Thread pin toggled');
  }, []);

  const handleDeleteThread = useCallback((threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    deleteMessages(threadId);
    if (activeThreadId === threadId) setActiveThreadId(null);
    toast.success('Thread deleted');
  }, [activeThreadId]);

  const handleExportChat = useCallback(() => {
    if (!activeThreadId) return;
    const msgs = loadMessages(activeThreadId);
    if (msgs.length === 0) {
      toast.error('No messages to copy');
      return;
    }
    const text = msgs.map((m) => `[${m.role}]: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Chat copied to clipboard');
  }, [activeThreadId]);

  // Called by AIChatInterface when messages change — update thread metadata
  const handleMessagesUpdate = useCallback((threadId: string, messages: ChatMessage[]) => {
    saveMessages(threadId, messages);
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        // Auto-title from first user message
        const firstUser = messages.find((m) => m.role === 'user');
        const title = firstUser
          ? firstUser.content.slice(0, 50) + (firstUser.content.length > 50 ? '...' : '')
          : t.title;
        return {
          ...t,
          title: t.title === 'New Chat' && firstUser ? title : t.title,
          message_count: messages.length,
          updated_at: new Date().toISOString(),
        };
      })
    );
  }, []);

  const renderThreadItem = (thread: StoredThread, closeSidebar = false) => (
    <div
      key={thread.id}
      className={cn(
        'group w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors',
        activeThreadId === thread.id
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted/50 border border-transparent'
      )}
    >
      <button
        className="flex items-start gap-3 flex-1 min-w-0 text-left"
        onClick={() => {
          setActiveThreadId(thread.id);
          if (closeSidebar) setShowSidebar(false);
        }}
      >
        {thread.pinned ? (
          <Pin className={cn('w-4 h-4 mt-0.5 flex-shrink-0', activeThreadId === thread.id ? 'text-primary' : 'text-accent')} />
        ) : (
          <MessageSquare className={cn('w-4 h-4 mt-0.5 flex-shrink-0', activeThreadId === thread.id ? 'text-primary' : 'text-muted-foreground')} />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium truncate', activeThreadId === thread.id ? 'text-foreground' : 'text-muted-foreground')}>
            {thread.title}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {thread.message_count} messages &middot; {format(parseISO(thread.updated_at), 'MMM d')}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); handlePinThread(thread.id); }}
          className={cn('p-1 rounded hover:bg-muted', thread.pinned ? 'text-accent' : 'text-muted-foreground')}
          title={thread.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDeleteThread(thread.id); }}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  // If no thread exists and user lands on page, start a new chat
  const effectiveThreadId = activeThreadId;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar - Conversation list */}
      <AnimatePresence initial={false}>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden sm:flex flex-col border-r border-border bg-card/50 overflow-hidden flex-shrink-0"
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded overflow-hidden">
                    <Image src="/ai-logo.png" alt="Frictionless" width={20} height={20} className="object-contain" />
                  </div>
                  <h2 className="text-sm font-display font-bold text-foreground">Ask Frictionless</h2>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {threads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No conversations yet</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Start a new chat to get started</p>
                </div>
              )}
              {pinnedThreads.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Pinned</p>
                  {pinnedThreads.map((thread) => renderThreadItem(thread))}
                  <div className="h-px bg-border mx-3 my-2" />
                </>
              )}
              {unpinnedThreads.map((thread) => renderThreadItem(thread))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-lg flex-shrink-0">
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="sm:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Image src="/ai-logo.png" alt="Frictionless AI" width={20} height={20} className="object-contain" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {activeThread?.title ?? 'Ask Frictionless'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {activeThread
                  ? `${activeThread.message_count} messages`
                  : 'Your AI readiness advisor'}
              </p>
            </div>
          </div>

          {/* Response mode toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {RESPONSE_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.value}
                  onClick={() => setResponseMode(mode.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                    responseMode === mode.value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={mode.description}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Export actions */}
          {activeThread && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleExportChat}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Copy chat to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Chat interface */}
        <AIChatInterface
          key={effectiveThreadId ?? 'new'}
          initialMessages={activeMessages}
          className="flex-1 min-h-0"
          onMessagesChange={effectiveThreadId ? (msgs: ChatMessage[]) => handleMessagesUpdate(effectiveThreadId, msgs) : undefined}
        />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSidebar(false)}
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 flex flex-col border-r border-border bg-card sm:hidden"
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded overflow-hidden">
                    <Image src="/ai-logo.png" alt="Frictionless" width={20} height={20} className="object-contain" />
                  </div>
                  <h2 className="text-sm font-display font-bold text-foreground">Ask Frictionless</h2>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => { handleNewChat(); setShowSidebar(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {threads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No conversations yet</p>
                </div>
              )}
              {pinnedThreads.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Pinned</p>
                  {pinnedThreads.map((thread) => renderThreadItem(thread, true))}
                  <div className="h-px bg-border mx-3 my-2" />
                </>
              )}
              {unpinnedThreads.map((thread) => renderThreadItem(thread, true))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
