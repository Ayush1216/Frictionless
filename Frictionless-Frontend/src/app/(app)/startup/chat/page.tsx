'use client';

import { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  ChevronLeft,
  Menu,
  Pin,
  Trash2,
  Copy,
  Zap,
  BookOpen,
  Search,
  Globe,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AIChatInterface } from '@/components/ai/AIChatInterface';
import { useIntelligenceChat } from '@/lib/hooks/useIntelligenceChat';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';

type ResponseMode = 'concise' | 'deep_dive';

const RESPONSE_MODES: { value: ResponseMode; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'concise', label: 'Concise', icon: Zap, description: 'Quick, actionable answers' },
  { value: 'deep_dive', label: 'Deep Dive', icon: BookOpen, description: 'Thorough analysis with evidence' },
];

function groupThreadsByDate<T extends { updated_at: string; pinned?: boolean }>(threads: T[]) {
  const pinned: T[] = [];
  const today: T[] = [];
  const yesterday: T[] = [];
  const earlier: T[] = [];

  for (const t of threads) {
    if (t.pinned) { pinned.push(t); continue; }
    try {
      const d = parseISO(t.updated_at);
      if (isToday(d)) today.push(t);
      else if (isYesterday(d)) yesterday.push(t);
      else earlier.push(t);
    } catch {
      earlier.push(t);
    }
  }
  return { pinned, today, yesterday, earlier };
}

export default function AIChatPage() {
  const {
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
    deleteThread,
    togglePin,
    responseMode,
    setResponseMode,
    webMode,
    setWebMode,
  } = useIntelligenceChat();

  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const activeThread = threads.find((t) => t.id === activeThreadId);

  // Filter threads by search
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t => t.title.toLowerCase().includes(q));
  }, [threads, searchQuery]);

  const grouped = useMemo(() => groupThreadsByDate(filteredThreads), [filteredThreads]);

  const handleNewChat = useCallback(async () => {
    await createNewThread();
  }, [createNewThread]);

  const handleDeleteThread = useCallback(async (threadId: string) => {
    await deleteThread(threadId);
    toast.success('Thread deleted');
  }, [deleteThread]);

  const handleExportChat = useCallback(() => {
    if (messages.length === 0) {
      toast.error('No messages to copy');
      return;
    }
    const text = messages
      .filter(m => m.role !== 'system-card')
      .map((m) => `[${m.role}]: ${m.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Chat copied to clipboard');
  }, [messages]);

  const handleSendMessage = useCallback(async (text: string, attachments?: Parameters<typeof sendMessage>[1]) => {
    // Auto-create thread if none active
    if (!activeThreadId) {
      const newId = await createNewThread();
      if (!newId) return;
      // Pass newId directly to avoid stale-closure race condition
      await sendMessage(text, attachments, newId);
      return;
    }
    await sendMessage(text, attachments);
  }, [activeThreadId, createNewThread, sendMessage]);

  const renderThreadGroup = (label: string, items: typeof threads, closeSidebar = false) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <p className="text-[10px] font-semibold uppercase tracking-wider px-3 pt-3 pb-1.5" style={{ color: 'var(--fi-text-muted)' }}>
          {label}
        </p>
        {items.map((thread) => (
          <div
            key={thread.id}
            className="group w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all mx-1"
            style={{
              background: activeThreadId === thread.id ? 'rgba(16,185,129,0.06)' : 'transparent',
              border: activeThreadId === thread.id ? '1px solid rgba(16,185,129,0.12)' : '1px solid transparent',
              width: 'calc(100% - 8px)',
            }}
          >
            <button
              className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
              onClick={() => {
                setActiveThreadId(thread.id);
                if (closeSidebar) setShowSidebar(false);
              }}
            >
              {thread.pinned ? (
                <Pin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: activeThreadId === thread.id ? 'var(--fi-primary)' : 'var(--fi-text-muted)' }} />
              ) : (
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: activeThreadId === thread.id ? 'var(--fi-primary)' : 'var(--fi-text-muted)' }} />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-medium truncate"
                  style={{ color: activeThreadId === thread.id ? 'var(--fi-text-primary)' : 'var(--fi-text-secondary)' }}
                >
                  {thread.title}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--fi-text-muted)' }}>
                  {(() => { try { return format(parseISO(thread.updated_at), 'MMM d, h:mm a'); } catch { return ''; } })()}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); togglePin(thread.id); }}
                className="p-1 rounded"
                style={{ color: thread.pinned ? 'var(--fi-primary)' : 'var(--fi-text-muted)' }}
                title={thread.pinned ? 'Unpin' : 'Pin'}
              >
                <Pin className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteThread(thread.id); }}
                className="p-1 rounded hover:text-red-400"
                style={{ color: 'var(--fi-text-muted)' }}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <AnimatePresence initial={false}>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden sm:flex flex-col overflow-hidden flex-shrink-0"
            style={{
              borderRight: '1px solid var(--fi-border)',
              background: 'color-mix(in srgb, var(--fi-bg-card) 50%, transparent)',
            }}
          >
            {/* Header */}
            <div className="p-4" style={{ borderBottom: '1px solid var(--fi-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <Image src="/ai-logo.png" alt="Frictionless" width={18} height={18} className="object-contain" />
                  </div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--fi-text-primary)' }}>Ask Frictionless</h2>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--fi-text-muted)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'var(--fi-primary)', boxShadow: '0 2px 8px rgba(16,185,129,0.2)' }}
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--fi-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none"
                  style={{
                    background: 'var(--fi-bg-secondary)',
                    border: '1px solid var(--fi-border)',
                    color: 'var(--fi-text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto pb-2">
              {isLoadingThreads && threads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--fi-primary)', borderTopColor: 'transparent' }} />
                </div>
              )}
              {!isLoadingThreads && threads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <MessageSquare className="w-8 h-8 mb-2" style={{ color: 'var(--fi-text-muted)', opacity: 0.3 }} />
                  <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>No conversations yet</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--fi-text-muted)', opacity: 0.6 }}>Start a new chat to get started</p>
                </div>
              )}
              {renderThreadGroup('Pinned', grouped.pinned)}
              {grouped.pinned.length > 0 && (grouped.today.length > 0 || grouped.yesterday.length > 0 || grouped.earlier.length > 0) && (
                <div className="h-px mx-3 my-1" style={{ background: 'var(--fi-border)' }} />
              )}
              {renderThreadGroup('Today', grouped.today)}
              {renderThreadGroup('Yesterday', grouped.yesterday)}
              {renderThreadGroup('Earlier', grouped.earlier)}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div
          className="flex items-center gap-3 px-4 sm:px-5 py-3 flex-shrink-0"
          style={{
            borderBottom: '1px solid var(--fi-border)',
            background: 'color-mix(in srgb, var(--fi-bg-card) 60%, transparent)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--fi-text-muted)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="sm:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--fi-text-muted)' }}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <Image src="/ai-logo.png" alt="Frictionless AI" width={22} height={22} className="object-contain" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--fi-text-primary)' }}>
                {activeThread?.title ?? 'Ask Frictionless'}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--fi-text-muted)' }}>
                {activeThread
                  ? `${activeThread.message_count ?? 0} messages`
                  : 'Your AI Frictionless advisor'}
              </p>
            </div>
          </div>

          {/* Response mode toggle */}
          <div
            className="hidden sm:flex items-center gap-1 rounded-xl p-0.5"
            style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
          >
            {RESPONSE_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = responseMode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => setResponseMode(mode.value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isActive ? 'var(--fi-bg-card)' : 'transparent',
                    color: isActive ? 'var(--fi-text-primary)' : 'var(--fi-text-muted)',
                    boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  }}
                  title={mode.description}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Web search toggle */}
          <button
            onClick={() => setWebMode(!webMode)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: webMode ? 'rgba(16,185,129,0.1)' : 'var(--fi-bg-secondary)',
              border: `1px solid ${webMode ? 'rgba(16,185,129,0.3)' : 'var(--fi-border)'}`,
              color: webMode ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
            }}
            title={webMode ? 'Web search ON — disable' : 'Enable web search'}
          >
            <Globe className="w-3.5 h-3.5" />
            Web
          </button>

          {/* Export */}
          {activeThread && messages.length > 0 && (
            <button
              onClick={handleExportChat}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--fi-text-muted)' }}
              title="Copy chat to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Chat interface */}
        <AIChatInterface
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          isLoadingMessages={isLoadingMessages}
          onSendMessage={handleSendMessage}
          className="flex-1 min-h-0"
        />
      </div>

      {/* ── Mobile sidebar overlay ── */}
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

      {/* ── Mobile sidebar drawer ── */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 flex flex-col sm:hidden"
            style={{
              borderRight: '1px solid var(--fi-border)',
              background: 'var(--fi-bg-card)',
            }}
          >
            <div className="p-4" style={{ borderBottom: '1px solid var(--fi-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <Image src="/ai-logo.png" alt="Frictionless" width={18} height={18} className="object-contain" />
                  </div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--fi-text-primary)' }}>Ask Frictionless</h2>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--fi-text-muted)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => { handleNewChat(); setShowSidebar(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'var(--fi-primary)' }}
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-2">
              {threads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <MessageSquare className="w-8 h-8 mb-2" style={{ color: 'var(--fi-text-muted)', opacity: 0.3 }} />
                  <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>No conversations yet</p>
                </div>
              )}
              {renderThreadGroup('Pinned', grouped.pinned, true)}
              {renderThreadGroup('Today', grouped.today, true)}
              {renderThreadGroup('Yesterday', grouped.yesterday, true)}
              {renderThreadGroup('Earlier', grouped.earlier, true)}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
