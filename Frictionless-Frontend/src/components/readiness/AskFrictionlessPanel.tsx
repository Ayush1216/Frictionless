'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle2, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { streamChat } from '@/lib/ai/openai-client';
import { fetchTaskChatMessages, saveTaskChatMessages, chatWithTaskAI } from '@/lib/api/tasks';
import { useTasksSync } from '@/contexts/TasksSyncContext';
import { useUIStore } from '@/stores/ui-store';
import type { Task } from '@/types/database';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AskFrictionlessPanelProps {
  task: Task | null;
  categoryName?: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCompleted?: () => void;
}

const FRICTIONLESS_LOGO = '/ai-logo.png';

function FrictionlessAvatar({ size = 26 }: { size?: number }) {
  return (
    <div className="shrink-0 rounded-md overflow-hidden bg-primary/8 flex items-center justify-center" style={{ width: size, height: size }}>
      <Image src={FRICTIONLESS_LOGO} alt="Frictionless AI" width={size - 6} height={size - 6} className="object-contain" />
    </div>
  );
}

export function AskFrictionlessPanel({ task, categoryName, isOpen, onClose, onTaskCompleted }: AskFrictionlessPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const theme = useUIStore((s) => s.theme);
  const tasksSync = useTasksSync();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [suggestComplete, setSuggestComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionAnalysis, setCompletionAnalysis] = useState<string | null>(null);

  const taskIdRef = useRef<string | null>(null);

  // Load chat history when panel opens
  useEffect(() => {
    if (!isOpen || !task) return;
    if (taskIdRef.current === task.id && historyLoaded) return;

    taskIdRef.current = task.id;
    setHistoryLoaded(false);
    setSuggestComplete(false);
    setCompletionAnalysis(null);

    (async () => {
      try {
        const { messages: saved } = await fetchTaskChatMessages(task.id);
        if (saved && saved.length > 0) {
          setMessages(saved.map((m, i) => ({
            id: `history-${i}`,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at),
          })));
        } else {
          setMessages([]);
          // Auto-send initial message via backend
          await sendInitialMessage(task);
        }
      } catch {
        setMessages([]);
        await sendInitialMessage(task);
      }
      setHistoryLoaded(true);
    })();
  }, [isOpen, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      taskIdRef.current = null;
      setHistoryLoaded(false);
      setSuggestComplete(false);
      setCompletionAnalysis(null);
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus input
  useEffect(() => {
    if (isOpen && historyLoaded) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, historyLoaded]);

  const sendInitialMessage = useCallback(async (t: Task) => {
    const initialUserMsg = `Help me understand and complete this task:\n\nTask: "${t.title}"\nCategory: ${categoryName ?? 'General'}\nDescription: ${t.description || 'No description provided.'}\nPriority: ${t.priority}`;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: initialUserMsg,
      timestamp: new Date(),
    };
    setMessages([userMsg]);
    await getBackendResponse([userMsg], t, initialUserMsg);
  }, [categoryName]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Send message to backend which has full company context (founders, team, profile).
   * Falls back to frontend streaming if backend fails.
   */
  const getBackendResponse = useCallback(async (allMessages: ChatMessage[], t: Task, userMessage: string) => {
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // Build history from all previous messages (exclude the current user message)
      const history = allMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await chatWithTaskAI(t.id, userMessage, history);
      const reply = result.reply || 'Sorry, I couldn\'t process that. Please try again.';

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };

      const updatedMessages = [...allMessages, assistantMsg];
      setMessages(updatedMessages);
      setStreamingContent('');
      setIsStreaming(false);

      // Check if backend suggests completion
      if (result.suggest_complete) {
        setSuggestComplete(true);
      }
    } catch {
      // Fallback to frontend streaming if backend fails
      await streamResponseFallback(allMessages, t);
    }
  }, []);

  /**
   * Fallback: frontend-only streaming (no company context).
   */
  const streamResponseFallback = useCallback(async (allMessages: ChatMessage[], t: Task) => {
    const chatMsgs = [
      { role: 'system' as const, content: `You are "Ask Frictionless", a startup advisor helping complete readiness tasks. Be concise and actionable.` },
      ...allMessages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
    ];

    let fullContent = '';
    try {
      for await (const chunk of streamChat(chatMsgs, { model: 'gpt-4.1-mini' })) {
        fullContent += chunk;
        setStreamingContent(fullContent);
      }
    } catch {
      fullContent = 'Sorry, I encountered an error. Please try again.';
    }

    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      content: fullContent,
      timestamp: new Date(),
    };

    const updatedMessages = [...allMessages, assistantMsg];
    setMessages(updatedMessages);
    setStreamingContent('');
    setIsStreaming(false);

    // Check if AI suggests completion
    const lower = fullContent.toLowerCase();
    if (lower.includes('mark') && lower.includes('complete') ||
        lower.includes('ready to complete') ||
        lower.includes('task_completed')) {
      setSuggestComplete(true);
    }

    // Save history to server
    try {
      await saveTaskChatMessages(t.id, updatedMessages.map((m) => ({ role: m.role, content: m.content })));
    } catch {
      // Silent fail
    }
  }, []);

  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming || !task) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    await getBackendResponse(updated, task, content.trim());
  }, [messages, isStreaming, task, getBackendResponse]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputRef.current) return;
    const value = inputRef.current.value;
    inputRef.current.value = '';
    handleSend(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!inputRef.current) return;
      const value = inputRef.current.value;
      inputRef.current.value = '';
      handleSend(value);
    }
  };

  const handleMarkComplete = useCallback(async () => {
    if (!task || !tasksSync || isCompleting) return;
    setIsCompleting(true);

    try {
      const success = await tasksSync.completeTaskViaApi(task.id);
      if (success) {
        // Generate completion analysis
        setCompletionAnalysis('generating');
        const systemPrompt = `You are a startup advisor. The founder just completed a readiness task. Provide a brief congratulatory analysis (3-4 sentences) of the impact this has on their readiness. Mention the category and potential score improvement. Be encouraging and specific.`;
        const analysisMsg = `I just completed the task: "${task.title}" in the "${categoryName}" category. It was worth ${task.potential_points ?? 'several'} points. Give me a brief analysis of what this means for my readiness.`;

        let analysis = '';
        try {
          for await (const chunk of streamChat(
            [{ role: 'system', content: systemPrompt }, { role: 'user', content: analysisMsg }],
            { model: 'gpt-4.1-mini' }
          )) {
            analysis += chunk;
            setCompletionAnalysis(analysis);
          }
        } catch {
          analysis = `Great work completing "${task.title}"! This task in the ${categoryName} category is worth ${task.potential_points ?? 'several'} points toward your readiness score. Consider running a new assessment to see your updated score.`;
          setCompletionAnalysis(analysis);
        }

        onTaskCompleted?.();

        // Auto-close panel after 4 seconds so user sees the next task
        setTimeout(() => {
          onClose();
        }, 4000);
      }
    } catch {
      setCompletionAnalysis('Failed to mark as complete. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }, [task, tasksSync, isCompleting, categoryName, onTaskCompleted, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none"
          />

          {/* Slide-in panel from right */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] lg:w-[440px] flex flex-col bg-background border-l border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 p-3 border-b border-border/50 shrink-0">
              <FrictionlessAvatar size={28} />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-display font-semibold text-foreground">Ask Frictionless</h3>
                {task && (
                  <p className="text-[10px] text-muted-foreground truncate">{task.title}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task context strip */}
            {task && (
              <div className="px-4 py-2 border-b border-border/30 bg-muted/20 shrink-0">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">{categoryName}</span>
                  <span className="text-muted-foreground/50">|</span>
                  <span className={cn(
                    'font-semibold px-1.5 py-0.5 rounded',
                    task.priority === 'critical' || task.priority === 'high' ? 'bg-score-poor/10 text-score-poor' :
                    task.priority === 'medium' ? 'bg-score-fair/10 text-score-fair' : 'bg-muted text-muted-foreground'
                  )}>
                    {task.priority}
                  </span>
                  {task.potential_points && (
                    <span className="font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      +{task.potential_points} pts
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Completion analysis banner */}
            <AnimatePresence>
              {completionAnalysis && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="p-4 bg-score-excellent/5 border-b border-score-excellent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-score-excellent" />
                      <span className="text-xs font-semibold text-score-excellent">Task Completed!</span>
                    </div>
                    {completionAnalysis === 'generating' ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analyzing impact...
                      </div>
                    ) : (
                      <div className={cn("text-xs text-foreground leading-relaxed prose prose-sm max-w-none", theme === 'dark' ? 'prose-invert' : '')}>
                        <ReactMarkdown>{completionAnalysis}</ReactMarkdown>
                      </div>
                    )}
                    <button
                      onClick={onClose}
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Run new assessment to update score
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {!historyLoaded && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                  {msg.role === 'assistant' && <FrictionlessAvatar size={24} />}
                  <div className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-xs',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted/50 border border-border/50 rounded-tl-sm'
                  )}>
                    {msg.role === 'user' ? (
                      <p className="leading-relaxed text-xs">{msg.content}</p>
                    ) : (
                      <div className={cn("prose prose-sm max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0 [&>p]:text-xs [&>ul]:mb-1 [&>ol]:mb-1 [&>li]:text-xs [&>li]:text-foreground [&>strong]:text-foreground text-foreground", theme === 'dark' ? 'prose-invert' : '')}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming response */}
              {isStreaming && streamingContent && (
                <div className="flex gap-2">
                  <FrictionlessAvatar size={24} />
                  <div className="max-w-[85%] rounded-xl px-3 py-2 bg-muted/50 border border-border/50 rounded-tl-sm">
                    <div className={cn("prose prose-sm max-w-none text-foreground [&>p]:text-xs [&>li]:text-xs [&>strong]:text-foreground", theme === 'dark' ? 'prose-invert' : '')}>
                      <ReactMarkdown>{streamingContent}</ReactMarkdown>
                      <span className="inline-block w-0.5 h-3 bg-primary animate-pulse ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {isStreaming && !streamingContent && (
                <div className="flex gap-2">
                  <FrictionlessAvatar size={24} />
                  <div className="px-3 py-2.5 bg-muted/50 border border-border/50 rounded-xl rounded-tl-sm">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/60"
                          animate={{ y: [0, -3, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mark Complete button */}
            {suggestComplete && !completionAnalysis && task?.status !== 'done' && (
              <div className="px-4 py-3 border-t border-border/30 bg-score-excellent/5 shrink-0">
                <button
                  onClick={handleMarkComplete}
                  disabled={isCompleting}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-score-excellent text-white font-semibold text-sm transition-colors',
                    isCompleting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-score-excellent/90'
                  )}
                >
                  {isCompleting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Completing...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Mark as Complete &amp; Analyze</>
                  )}
                </button>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-2.5 border-t border-border/50 shrink-0">
              {/* Quick actions */}
              {messages.length <= 2 && !isStreaming && (
                <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar">
                  {['How do I start?', 'Who on my team should handle this?', 'What evidence is needed?'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-medium bg-muted border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <textarea
                  ref={inputRef}
                  placeholder="Ask about this task..."
                  disabled={isStreaming}
                  rows={1}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    'flex-1 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground resize-none',
                    'placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors max-h-20',
                    isStreaming && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <button
                  type="submit"
                  disabled={isStreaming}
                  className={cn(
                    'p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0',
                    isStreaming && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
