'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIChatBubble, AITypingIndicator } from './AIChatBubble';
import type { ChatMessage } from '@/types/database';
import { useAIChat } from '@/lib/hooks/useAIChat';
import { AI_PROMPTS } from '@/lib/ai/prompts';
import { isAIEnabled } from '@/lib/ai/openai-client';

// Pre-written AI responses for demo mode when API key is not configured
const demoAIResponses = [
  "Based on your current readiness score of 82, here are some areas to focus on:\n\n1. **Storytelling & Pitch** - Your pitch deck is solid, but adding a competitive positioning matrix would strengthen it.\n2. **Metrics & Financials** - Adding a sensitivity analysis to your financial model would show investors you've stress-tested your assumptions.\n3. **Go-To-Market** - Document your sales motion in detail to boost this category.",
  "Looking at your investor matches, I'd recommend prioritizing firms with fintech expertise and Series A focus. Your strongest matches are in the 85-92 range, which indicates excellent alignment.\n\nWould you like me to help you craft a personalized outreach message for any of them?",
  "Great question! Here's how to improve your readiness score:\n\n- **Complete pending tasks** in the Storytelling category (3 remaining)\n- **Upload your cap table** - this is a critical document investors will ask for\n- **Add unit economics breakdown** - CAC, LTV, and payback period are key metrics\n\nEach completed task triggers a score rescore. I estimate you could reach 88-90 with these improvements.",
  "I've analyzed your competitive landscape. Here are key differentiators you should highlight:\n\n| Feature | You | Competitor A | Competitor B |\n|---------|-----|-------------|-------------|\n| AI-Powered | Yes | No | Partial |\n| B2B Focus | Yes | No | Yes |\n| Settlement Speed | <1hr | 2-3 days | 1 day |\n\nConsider adding this comparison to your pitch deck.",
];

interface AIChatInterfaceProps {
  initialMessages?: ChatMessage[];
  className?: string;
}

export function AIChatInterface({ initialMessages = [], className }: AIChatInterfaceProps) {
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [demoTyping, setDemoTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const demoIndexRef = useRef(0);

  const { messages: aiMessages, isStreaming, streamingContent, sendMessage: aiSendMessage } = useAIChat({
    systemPrompt: AI_PROMPTS.READINESS_ADVISOR,
  });

  const useRealAI = isAIEnabled();
  const isTyping = useRealAI ? isStreaming : demoTyping;

  // Merge AI hook messages with display messages for real AI mode, or use displayMessages for demo
  const messages: ChatMessage[] = useRealAI
    ? aiMessages.map((m) => ({
        id: m.id,
        thread_id: 'active' as const,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        created_at: m.timestamp.toISOString(),
      }))
    : displayMessages;

  // For real AI streaming: we show streaming content as the last message
  const streamingContentForDisplay = useRealAI && isStreaming ? streamingContent : '';
  const messagesToRender = useMemo(
    () =>
      streamingContentForDisplay
        ? [
            ...messages,
            {
              id: 'streaming',
              thread_id: 'active' as const,
              role: 'assistant' as const,
              content: streamingContentForDisplay,
              created_at: new Date().toISOString(),
            },
          ]
        : messages,
    [messages, streamingContentForDisplay]
  );

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messagesToRender, isTyping, scrollToBottom]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    if (useRealAI) {
      await aiSendMessage(text);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      return;
    }

    // Demo mode: use pre-written responses
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      thread_id: 'active',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setDisplayMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setDemoTyping(true);

    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1000));
    setDemoTyping(false);

    const responseText = demoAIResponses[demoIndexRef.current % demoAIResponses.length];
    demoIndexRef.current++;

    const aiMsg: ChatMessage = {
      id: `msg-ai-${Date.now()}`,
      thread_id: 'active',
      role: 'assistant',
      content: responseText,
      created_at: new Date().toISOString(),
    };

    setStreamingMsgId(aiMsg.id);
    setDisplayMessages((prev) => [...prev, aiMsg]);

    setTimeout(() => setStreamingMsgId(null), responseText.length * 15 + 500);
  }, [input, isTyping, useRealAI, aiSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {messagesToRender.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-neon-gradient/20 border border-primary/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-display font-bold text-foreground mb-1">
              Hi there! How can I help?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              I can help you improve your readiness score, review documents, prepare for investor meetings, and more.
            </p>
            {/* Quick action chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {['Improve my score', 'Explain my matches', 'Help with tasks', 'Review my pitch'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setInput(chip);
                    setTimeout(() => sendMessage(), 100);
                  }}
                  className="px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
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
              role={msg.role as 'user' | 'assistant'}
              content={msg.content}
              timestamp={msg.created_at}
              isStreaming={msg.id === streamingMsgId || (useRealAI && msg.id === 'streaming')}
              onStreamComplete={() => setStreamingMsgId(null)}
            />
          ))}
        </AnimatePresence>

        {/* Typing indicator - demo mode or real AI before first chunk */}
        <AnimatePresence>
          {isTyping && !streamingContentForDisplay && <AITypingIndicator />}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4 bg-card/80 backdrop-blur-lg">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {/* Attach button */}
          <button className="flex-shrink-0 p-2.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className={cn(
                'w-full resize-none rounded-xl px-4 py-3 text-sm',
                'bg-secondary/50 border border-input',
                'text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20',
                'transition-colors max-h-[150px]'
              )}
            />
          </div>

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className={cn(
              'flex-shrink-0 p-2.5 rounded-lg transition-all',
                input.trim() && !isTyping
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
