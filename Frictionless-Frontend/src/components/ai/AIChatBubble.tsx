'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AIStreamingText } from './AIStreamingText';
import { ChatExtractionCard } from '@/components/chat/ChatExtractionCard';
import { ChatFilePreview } from '@/components/chat/ChatFilePreview';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, parseISO } from 'date-fns';
import type { ChatAttachment } from '@/types/database';

interface AIChatBubbleProps {
  role: 'user' | 'assistant' | 'system' | 'system-card';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  onStreamComplete?: () => void;
  attachments?: ChatAttachment[];
  metadata?: Record<string, unknown>;
}

export function AIChatBubble({
  role,
  content,
  timestamp,
  isStreaming = false,
  onStreamComplete,
  attachments,
  metadata,
}: AIChatBubbleProps) {
  const isUser = role === 'user';
  const theme = useUIStore((s) => s.theme);

  // System-card messages render as extraction cards
  if (role === 'system-card') {
    const fields = (metadata?.extracted_fields as { field: string; value: string }[]) ?? [];
    return <ChatExtractionCard content={content} fields={fields} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('flex gap-3 max-w-full', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      {isUser ? (
        <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
          <AvatarFallback
            className="text-xs font-bold"
            style={{ background: 'var(--fi-border)', color: 'var(--fi-text-muted)' }}
          >
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden"
          style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.15)',
          }}
        >
          <Image src="/ai-logo.png" alt="Frictionless" width={20} height={20} className="object-contain" />
        </div>
      )}

      {/* Bubble */}
      <div className={cn('max-w-[80%] sm:max-w-[70%]', isUser ? 'items-end' : 'items-start')}>
        {/* File attachments */}
        {attachments && attachments.length > 0 && (
          <div className="mb-2 space-y-1">
            {attachments.map((att, i) => (
              <ChatFilePreview key={i} attachment={att} compact />
            ))}
          </div>
        )}

        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isUser ? 'rounded-tr-md' : 'rounded-tl-md'
          )}
          style={
            isUser
              ? { background: 'var(--fi-bg-secondary)', color: 'var(--fi-text-primary)' }
              : {
                  background: 'var(--fi-bg-card)',
                  border: '1px solid var(--fi-border)',
                  color: 'var(--fi-text-primary)',
                }
          }
        >
          {isUser ? (
            <p>{content}</p>
          ) : isStreaming ? (
            <AIStreamingText text={content} speed={15} isStreaming onComplete={onStreamComplete} />
          ) : (
            <div
              className={cn(
                'prose prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>table]:text-xs',
                theme === 'dark' ? 'prose-invert' : 'prose-neutral'
              )}
              style={{ color: 'var(--fi-text-primary)' }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
        {/* Timestamp */}
        <p
          className={cn('text-[10px] mt-1 px-1', isUser ? 'text-right' : 'text-left')}
          style={{ color: 'var(--fi-text-muted)' }}
        >
          {(() => {
            try { return format(parseISO(timestamp), 'h:mm a'); } catch { return ''; }
          })()}
        </p>
      </div>
    </motion.div>
  );
}

// Typing indicator with Frictionless logo
export function AITypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden"
        style={{
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.15)',
        }}
      >
        <Image src="/ai-logo.png" alt="Frictionless" width={20} height={20} className="object-contain" />
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-md"
        style={{
          background: 'var(--fi-bg-card)',
          border: '1px solid var(--fi-border)',
        }}
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--fi-primary)', opacity: 0.6 }}
              animate={{ y: [0, -5, 0] }}
              transition={{
                repeat: Infinity,
                duration: 0.7,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
