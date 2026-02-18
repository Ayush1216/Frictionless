'use client';

import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AIStreamingText } from './AIStreamingText';
import ReactMarkdown from 'react-markdown';
import { format, parseISO } from 'date-fns';

interface AIChatBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  onStreamComplete?: () => void;
}

export function AIChatBubble({ role, content, timestamp, isStreaming = false, onStreamComplete }: AIChatBubbleProps) {
  const isUser = role === 'user';
  const theme = useUIStore((s) => s.theme);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex gap-3 max-w-full', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
        <AvatarFallback className={cn(
          'text-xs font-bold',
          isUser
            ? 'bg-border text-muted-foreground'
            : 'bg-primary/20 text-primary'
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Bubble */}
      <div className={cn('max-w-[80%] sm:max-w-[70%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-muted/80 text-foreground rounded-tr-md'
              : 'glass-card rounded-tl-md'
          )}
        >
          {isUser ? (
            <p>{content}</p>
          ) : isStreaming ? (
            <AIStreamingText text={content} speed={15} isStreaming onComplete={onStreamComplete} />
          ) : (
            <div className={cn(
              "prose prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>li]:text-muted-foreground",
              theme === 'dark' ? 'prose-invert' : 'prose-neutral'
            )}>
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
        {/* Timestamp */}
        <p className={cn(
          'text-[10px] text-muted-foreground mt-1 px-1',
          isUser ? 'text-right' : 'text-left'
        )}>
          {format(parseISO(timestamp), 'h:mm a')}
        </p>
      </div>
    </motion.div>
  );
}

// Typing indicator for AI "thinking"
export function AITypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3"
    >
      <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="px-4 py-3 glass-card rounded-2xl rounded-tl-md">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/60"
              animate={{ y: [0, -4, 0] }}
              transition={{
                repeat: Infinity,
                duration: 0.8,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
