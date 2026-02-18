'use client';

import { useState, useMemo, useCallback } from 'react';
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
  Download,
  Copy,
  Zap,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIChatInterface } from '@/components/ai/AIChatInterface';
import { dummyChatThreads, dummyChatMessages } from '@/lib/dummy-data/chat-messages';
import type { ChatThread, ChatMessage } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

type ResponseMode = 'concise' | 'deep_dive';

const RESPONSE_MODES: { value: ResponseMode; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'concise', label: 'Concise', icon: Zap, description: 'Quick, actionable answers' },
  { value: 'deep_dive', label: 'Deep Dive', icon: BookOpen, description: 'Thorough analysis with evidence' },
];

export default function AIChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>(
    dummyChatThreads.map((t) => ({ ...t }))
  );
  const [activeThreadId, setActiveThreadId] = useState<string | null>('thread-1');
  const [showSidebar, setShowSidebar] = useState(true);
  const [responseMode, setResponseMode] = useState<ResponseMode>('concise');

  // Messages for active thread
  const activeMessages = useMemo<ChatMessage[]>(() => {
    if (!activeThreadId) return [];
    return dummyChatMessages
      .filter((m) => m.thread_id === activeThreadId)
      .map((m) => ({ ...m }));
  }, [activeThreadId]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  // Separate pinned and unpinned threads
  const pinnedThreads = useMemo(() => threads.filter((t) => (t as ChatThread & { pinned?: boolean }).pinned), [threads]);
  const unpinnedThreads = useMemo(() => threads.filter((t) => !(t as ChatThread & { pinned?: boolean }).pinned), [threads]);

  const handleNewChat = useCallback(() => {
    setActiveThreadId(null);
  }, []);

  const handlePinThread = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, pinned: !(t as ChatThread & { pinned?: boolean }).pinned } as ChatThread
          : t
      )
    );
    toast.success('Thread pin toggled');
  }, []);

  const handleDeleteThread = useCallback((threadId: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) setActiveThreadId(null);
    toast.success('Thread deleted');
  }, [activeThreadId]);

  const handleExportChat = useCallback(() => {
    if (!activeThread) return;
    const msgs = dummyChatMessages.filter((m) => m.thread_id === activeThreadId);
    const text = msgs.map((m) => `[${m.role}]: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Chat copied to clipboard');
  }, [activeThread, activeThreadId]);

  const renderThreadItem = (thread: ChatThread, closeSidebar = false) => {
    const isPinned = (thread as ChatThread & { pinned?: boolean }).pinned;
    return (
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
          {isPinned ? (
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
            className={cn('p-1 rounded hover:bg-muted', isPinned ? 'text-accent' : 'text-muted-foreground')}
            title={isPinned ? 'Unpin' : 'Pin'}
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
  };

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
                  <Bot className="w-5 h-5 text-primary" />
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
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
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
          key={activeThreadId ?? 'new'}
          initialMessages={activeMessages}
          className="flex-1 min-h-0"
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
                  <Bot className="w-5 h-5 text-primary" />
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
