'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChat } from '@/lib/hooks/useAIChat';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedExplanation } from '@/lib/ai/task-explanation-cache';
import { AIChatBubble, AITypingIndicator } from '@/components/ai/AIChatBubble';
import type { Task } from '@/types/database';

interface AskFrictionlessModalProps {
  task: Task | null;
  categoryName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AskFrictionlessModal({ task, categoryName, isOpen, onClose }: AskFrictionlessModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const systemPrompt = getPrompt('TASK_EXPLAINER');
  const { messages, isStreaming, streamingContent, sendMessage, reset } = useAIChat({
    systemPrompt,
  });

  // Auto-send initial explanation when modal opens
  useEffect(() => {
    if (isOpen && task && messages.length === 0) {
      // Check for cached explanation first
      const cached = getCachedExplanation(task.id);
      const context = `Task: "${task.title}"\nCategory: ${categoryName ?? 'General'}\nDescription: ${task.description || 'No description provided.'}\nPriority: ${task.priority}`;

      if (cached) {
        sendMessage(`Please explain this task and how to approach it:\n\n${context}`);
      } else {
        sendMessage(`Please explain this task and how to approach it:\n\n${context}`);
      }
    }
  }, [isOpen, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset chat when task changes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('message') as HTMLInputElement;
    const value = input.value.trim();
    if (!value || isStreaming) return;
    sendMessage(value);
    input.value = '';
  };

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
            className="ask-frictionless-modal fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 sm:inset-auto sm:top-[10%] sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg sm:max-h-[80vh] z-50 flex flex-col glass-card overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Ask Frictionless</h3>
                {task && (
                  <p className="text-xs text-muted-foreground truncate">{task.title}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <AIChatBubble
                  key={msg.id}
                  role={msg.role === 'system' ? 'assistant' : msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp.toISOString()}
                />
              ))}
              {isStreaming && streamingContent && (
                <AIChatBubble
                  role="assistant"
                  content={streamingContent}
                  timestamp={new Date().toISOString()}
                  isStreaming
                />
              )}
              {isStreaming && !streamingContent && <AITypingIndicator />}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  name="message"
                  type="text"
                  placeholder="Ask a follow-up question..."
                  disabled={isStreaming}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground',
                    'placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors',
                    isStreaming && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <button
                  type="submit"
                  disabled={isStreaming}
                  className={cn(
                    'p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                    isStreaming && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
