'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AIChatBubble, AITypingIndicator } from './AIChatBubble';
import { ChatFilePreview } from '@/components/chat/ChatFilePreview';
import type { ChatMessage, ChatAttachment } from '@/types/database';
import { getAuthHeaders } from '@/lib/api/tasks';
import { toast } from 'sonner';

interface AIChatInterfaceProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isLoadingMessages?: boolean;
  onSendMessage: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  className?: string;
}

const QUICK_CHIPS = [
  'How can I improve my readiness score?',
  'What do investors look for?',
  'Help me with my pitch',
  'Explain my weakest category',
];

export function AIChatInterface({
  messages,
  isStreaming,
  streamingContent,
  isLoadingMessages,
  onSendMessage,
  className,
}: AIChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<ChatAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Streaming message to show in real-time
  const messagesToRender = useMemo(() => {
    if (streamingContent) {
      return [
        ...messages,
        {
          id: 'streaming',
          thread_id: 'active',
          role: 'assistant' as const,
          content: streamingContent,
          created_at: new Date().toISOString(),
        },
      ];
    }
    return messages;
  }, [messages, streamingContent]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesToRender, isStreaming, scrollToBottom]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  };

  // File upload handler
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const tempAttachment: ChatAttachment = {
        name: file.name,
        storage_path: '',
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        status: 'uploading',
      };
      setPendingFiles(prev => [...prev, tempAttachment]);

      try {
        const headers = await getAuthHeaders();
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/startup/data-room/upload', {
          method: 'POST',
          headers: { ...headers },
          body: formData,
        });

        const data = await res.json();

        if (res.ok && (data.ok || data.already_exists)) {
          setPendingFiles(prev =>
            prev.map(f =>
              f.name === file.name && f.status === 'uploading'
                ? { ...f, storage_path: data.storage_path ?? '', status: 'ready' }
                : f
            )
          );
          toast.success(`${file.name} uploaded to data room`);
        } else {
          setPendingFiles(prev =>
            prev.map(f =>
              f.name === file.name && f.status === 'uploading'
                ? { ...f, status: 'error' }
                : f
            )
          );
          toast.error(`Failed to upload ${file.name}`);
        }
      } catch {
        setPendingFiles(prev =>
          prev.map(f =>
            f.name === file.name && f.status === 'uploading'
              ? { ...f, status: 'error' }
              : f
          )
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const attachments = pendingFiles.filter(f => f.status === 'ready');
    setInput('');
    setPendingFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    await onSendMessage(text, attachments.length > 0 ? attachments : undefined);
  }, [input, isStreaming, pendingFiles, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasInput = input.trim().length > 0 || pendingFiles.some(f => f.status === 'ready');
  const canSend = hasInput && !isStreaming;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
        {isLoadingMessages && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--fi-primary)', borderTopColor: 'transparent' }} />
            <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Loading messages...</span>
          </div>
        )}

        {!isLoadingMessages && messagesToRender.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)',
                border: '1px solid rgba(16,185,129,0.2)',
                boxShadow: '0 8px 32px rgba(16,185,129,0.08)',
              }}
            >
              <Image src="/ai-logo.png" alt="Frictionless" width={40} height={40} className="object-contain" />
            </div>
            <h3
              className="text-xl font-bold mb-2"
              style={{ color: 'var(--fi-text-primary)' }}
            >
              Ask Frictionless
            </h3>
            <p
              className="text-sm max-w-md mb-8 leading-relaxed"
              style={{ color: 'var(--fi-text-muted)' }}
            >
              Your AI readiness advisor. Ask about your score, get fundraising tips, upload documents, or share company updates.
            </p>
            {/* Quick action chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setInput(chip);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }, 50);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: 'var(--fi-bg-secondary)',
                    border: '1px solid var(--fi-border)',
                    color: 'var(--fi-text-secondary)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--fi-primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--fi-primary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--fi-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--fi-text-secondary)'; }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messagesToRender.map((msg) => (
            <AIChatBubble
              key={msg.id}
              role={msg.role as 'user' | 'assistant' | 'system-card'}
              content={msg.content}
              timestamp={msg.created_at}
              isStreaming={msg.id === 'streaming'}
              attachments={msg.attachments as ChatAttachment[] | undefined}
              metadata={msg.metadata as Record<string, unknown> | undefined}
            />
          ))}
        </AnimatePresence>

        {/* Typing indicator before first chunk arrives */}
        <AnimatePresence>
          {isStreaming && !streamingContent && <AITypingIndicator />}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div
        className="px-4 sm:px-6 py-4"
        style={{
          borderTop: '1px solid var(--fi-border)',
          background: 'color-mix(in srgb, var(--fi-bg-card) 85%, transparent)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Pending file previews */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 max-w-3xl mx-auto">
            {pendingFiles.map((file, i) => (
              <ChatFilePreview key={i} attachment={file} onRemove={() => removePendingFile(i)} />
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
            multiple
            onChange={handleFileSelect}
          />

          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-2.5 rounded-xl transition-all"
            style={{ color: 'var(--fi-text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--fi-primary)'; (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--fi-text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Upload a file to data room"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your readiness..."
              rows={1}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none transition-all max-h-[150px]"
              style={{
                background: 'var(--fi-bg-secondary)',
                border: '1px solid var(--fi-border)',
                color: 'var(--fi-text-primary)',
              }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--fi-primary)'; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--fi-border)'; }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!canSend}
            className="flex-shrink-0 p-2.5 rounded-xl transition-all"
            style={{
              background: canSend ? 'var(--fi-primary)' : 'var(--fi-bg-secondary)',
              color: canSend ? '#fff' : 'var(--fi-text-muted)',
              cursor: canSend ? 'pointer' : 'not-allowed',
              boxShadow: canSend ? '0 2px 8px rgba(16,185,129,0.25)' : 'none',
            }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
