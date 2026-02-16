import { useState, useCallback, useRef } from 'react';
import { streamChat } from '@/lib/ai/openai-client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface UseAIChatOptions {
  systemPrompt?: string;
  onComplete?: (messages: Message[]) => void;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent('');
      abortRef.current = false;

      const chatMessages = [
        ...(options.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ];

      let fullContent = '';
      try {
        for await (const chunk of streamChat(chatMessages)) {
          if (abortRef.current) break;
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      } catch {
        fullContent = 'Sorry, I encountered an error. Please try again.';
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent('');
      setIsStreaming(false);
      options.onComplete?.([...messages, userMessage, assistantMessage]);
    },
    [messages, options]
  );

  const abort = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    abort,
    reset,
    setMessages,
  };
}
