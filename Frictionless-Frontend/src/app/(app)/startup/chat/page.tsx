'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Bot,
  ChevronLeft,
  Menu,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIChatInterface } from '@/components/ai/AIChatInterface';
import { dummyChatThreads, dummyChatMessages } from '@/lib/dummy-data/chat-messages';
import type { ChatThread, ChatMessage } from '@/types/database';
import { format, parseISO } from 'date-fns';

export default function AIChatPage() {
  const [threads] = useState<ChatThread[]>(
    dummyChatThreads.map((t) => ({
      ...t,
    }))
  );
  const [activeThreadId, setActiveThreadId] = useState<string | null>('thread-1');
  const [showSidebar, setShowSidebar] = useState(true);

  // Messages for active thread
  const activeMessages = useMemo<ChatMessage[]>(() => {
    if (!activeThreadId) return [];
    return dummyChatMessages
      .filter((m) => m.thread_id === activeThreadId)
      .map((m) => ({ ...m }));
  }, [activeThreadId]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const handleNewChat = () => {
    setActiveThreadId(null);
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
            className="hidden sm:flex flex-col border-r border-obsidian-700/50 bg-obsidian-900/50 overflow-hidden flex-shrink-0"
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-obsidian-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-electric-blue" />
                  <h2 className="text-sm font-display font-bold text-foreground">AI Chat</h2>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 rounded-md hover:bg-obsidian-800 text-obsidian-400 hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-electric-blue text-white text-sm font-medium hover:bg-electric-blue/90 transition-colors shadow-glow"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors',
                    activeThreadId === thread.id
                      ? 'bg-electric-blue/10 border border-electric-blue/20'
                      : 'hover:bg-obsidian-800/50 border border-transparent'
                  )}
                >
                  <MessageSquare className={cn(
                    'w-4 h-4 mt-0.5 flex-shrink-0',
                    activeThreadId === thread.id ? 'text-electric-blue' : 'text-obsidian-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      activeThreadId === thread.id ? 'text-foreground' : 'text-obsidian-300'
                    )}>
                      {thread.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {thread.message_count} messages &middot; {format(parseISO(thread.updated_at), 'MMM d')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-obsidian-700/50 bg-obsidian-900/50 backdrop-blur-lg flex-shrink-0">
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-lg hover:bg-obsidian-800 text-obsidian-400 hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {/* Mobile menu */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="sm:hidden p-2 rounded-lg hover:bg-obsidian-800 text-obsidian-400 hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-neon-gradient/20 border border-electric-blue/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-electric-blue" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {activeThread?.title ?? 'New Chat'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {activeThread
                  ? `${activeThread.message_count} messages`
                  : 'Start a new conversation'}
              </p>
            </div>
          </div>
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
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 flex flex-col border-r border-obsidian-700/50 bg-obsidian-900 sm:hidden"
          >
            <div className="p-4 border-b border-obsidian-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-electric-blue" />
                  <h2 className="text-sm font-display font-bold text-foreground">AI Chat</h2>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 rounded-md hover:bg-obsidian-800 text-obsidian-400 hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => { handleNewChat(); setShowSidebar(false); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-electric-blue text-white text-sm font-medium hover:bg-electric-blue/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => { setActiveThreadId(thread.id); setShowSidebar(false); }}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors',
                    activeThreadId === thread.id
                      ? 'bg-electric-blue/10 border border-electric-blue/20'
                      : 'hover:bg-obsidian-800/50 border border-transparent'
                  )}
                >
                  <MessageSquare className={cn(
                    'w-4 h-4 mt-0.5 flex-shrink-0',
                    activeThreadId === thread.id ? 'text-electric-blue' : 'text-obsidian-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      activeThreadId === thread.id ? 'text-foreground' : 'text-obsidian-300'
                    )}>
                      {thread.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {thread.message_count} messages
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
