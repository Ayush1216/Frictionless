'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Paperclip,
  Send,
  Bot,
  User,
  ChevronLeft,
  CheckCheck,
} from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { PageHeader } from '@/components/shared/PageHeader';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'other';
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: string;
  name: string;
  type: 'ai' | 'investor' | 'team';
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  messages: Message[];
}

const dummyConversations: Conversation[] = [
  {
    id: 'conv-1',
    name: 'AI Assistant',
    type: 'ai',
    avatar: undefined,
    lastMessage: "I've analyzed your pitch deck. The financial projections look strong, but consider adding more detail on your unit economics.",
    timestamp: '2m ago',
    unreadCount: 2,
    messages: [
      { id: 'm1', content: "Hi! Can you review my pitch deck and provide feedback?", role: 'user', timestamp: '10:30 AM', read: true },
      { id: 'm2', content: "Of course! I'd be happy to review your pitch deck. Please upload it or paste the key sections.", role: 'other', timestamp: '10:31 AM', read: true },
      { id: 'm3', content: "I've uploaded it. What do you think about the financial projections?", role: 'user', timestamp: '10:35 AM', read: true },
      { id: 'm4', content: "I've analyzed your pitch deck. The financial projections look strong, but consider adding more detail on your unit economics.", role: 'other', timestamp: '10:36 AM', read: false },
    ],
  },
  {
    id: 'conv-2',
    name: 'Sarah Chen',
    type: 'investor',
    avatar: undefined,
    lastMessage: "Let's schedule a call for next week. Does Tuesday work?",
    timestamp: '1h ago',
    unreadCount: 0,
    messages: [
      { id: 'm5', content: "Thank you for the warm intro. We'd love to learn more about NeuralPay.", role: 'other', timestamp: 'Yesterday', read: true },
      { id: 'm6', content: "Absolutely! We're excited to share our progress. When would work for a call?", role: 'user', timestamp: 'Yesterday', read: true },
      { id: 'm7', content: "Let's schedule a call for next week. Does Tuesday work?", role: 'other', timestamp: '1h ago', read: true },
    ],
  },
  {
    id: 'conv-3',
    name: 'Alex Morgan',
    type: 'team',
    avatar: undefined,
    lastMessage: "I've updated the financial model with the new assumptions.",
    timestamp: '3h ago',
    unreadCount: 1,
    messages: [
      { id: 'm8', content: "Can you update the financial model with the new customer acquisition costs?", role: 'user', timestamp: 'Yesterday', read: true },
      { id: 'm9', content: "I've updated the financial model with the new assumptions.", role: 'other', timestamp: '3h ago', read: false },
    ],
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MessagesPage() {
  const isMobile = useIsMobile();
  const [conversations] = useState<Conversation[]>(dummyConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const map: Record<string, Message[]> = {};
    dummyConversations.forEach((c) => { map[c.id] = [...c.messages]; });
    return map;
  });
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const selected = conversations.find((c) => c.id === selectedId);
  const currentMessages = selectedId ? messages[selectedId] ?? [] : [];

  const handleSend = () => {
    if (!messageInput.trim() || !selectedId) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      content: messageInput.trim(),
      role: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), newMsg],
    }));
    setMessageInput('');
  };

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setIsMobileChatOpen(true);
  };

  const shouldHideListOnMobile = isMobile && isMobileChatOpen;

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">
      <div className="hidden lg:block mb-6">
        <PageHeader
          title="Messages"
          subtitle="Chat with AI, investors, and team members"
        />
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)] rounded-xl glass-card overflow-hidden">
        {/* Conversation list */}
        <motion.aside
          initial={false}
          animate={
            isMobile
              ? {
                  width: shouldHideListOnMobile ? 0 : '100%',
                  opacity: shouldHideListOnMobile ? 0 : 1,
                  flex: shouldHideListOnMobile ? 0 : 1,
                }
              : { width: 320, opacity: 1, flex: 0 }
          }
          transition={{ duration: 0.2 }}
          className="flex flex-col border-r border-obsidian-600/50 shrink-0 overflow-hidden"
        >
          <div className="p-3 border-b border-obsidian-600/50">
            <h2 className="text-lg font-display font-semibold text-foreground lg:hidden">
              Conversations
            </h2>
            <h2 className="text-base font-display font-semibold text-foreground hidden lg:block">
              Conversations
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <motion.button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-obsidian-700/50',
                  selectedId === conv.id && 'bg-electric-blue/10 border-l-2 border-l-electric-blue'
                )}
                whileTap={{ scale: 0.99 }}
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={conv.avatar} alt={conv.name} />
                  <AvatarFallback
                    className={cn(
                      'text-sm font-bold',
                      conv.type === 'ai' && 'bg-electric-cyan/20 text-electric-cyan',
                      conv.type === 'investor' && 'bg-electric-purple/20 text-electric-purple',
                      conv.type === 'team' && 'bg-electric-blue/20 text-electric-blue'
                    )}
                  >
                    {conv.type === 'ai' ? <Bot className="w-5 h-5" /> : getInitials(conv.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground truncate">{conv.name}</span>
                    <span className="text-[10px] text-obsidian-500 shrink-0">{conv.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-electric-blue text-white text-[10px] font-bold flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.aside>

        {/* Message area - hidden on mobile when no conversation selected */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0',
          isMobile && !selectedId && 'hidden'
        )}>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                {/* Chat header */}
                <div className="flex items-center gap-3 p-3 border-b border-obsidian-600/50">
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="lg:hidden p-1 -ml-1 rounded-lg hover:bg-obsidian-700/50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={selected.avatar} alt={selected.name} />
                    <AvatarFallback
                      className={cn(
                        'text-xs font-bold',
                        selected.type === 'ai' && 'bg-electric-cyan/20 text-electric-cyan',
                        selected.type === 'investor' && 'bg-electric-purple/20 text-electric-purple',
                        selected.type === 'team' && 'bg-electric-blue/20 text-electric-blue'
                      )}
                    >
                      {selected.type === 'ai' ? <Bot className="w-4 h-4" /> : getInitials(selected.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{selected.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">Active now</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentMessages.map((msg, i) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={cn(
                        'flex gap-2',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.role === 'other' && (
                        <Avatar className="h-8 w-8 shrink-0 mt-1">
                          <AvatarFallback className="bg-obsidian-700 text-obsidian-300 text-xs">
                            {selected.type === 'ai' ? <Bot className="w-4 h-4" /> : getInitials(selected.name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-2.5',
                          msg.role === 'user'
                            ? 'bg-electric-blue text-white rounded-br-md'
                            : 'bg-obsidian-700/80 text-foreground rounded-bl-md'
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className="flex items-center gap-1.5 mt-1 justify-end">
                          <span className="text-[10px] opacity-70">{msg.timestamp}</span>
                          {msg.role === 'user' && msg.read && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <Avatar className="h-8 w-8 shrink-0 mt-1">
                          <AvatarFallback className="bg-electric-blue/20 text-electric-blue text-xs">
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-obsidian-600/50">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      className="flex-1"
                    />
                    <Button size="icon" onClick={handleSend} className="shrink-0 bg-electric-blue hover:bg-electric-blue/90">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-obsidian-700/50 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-obsidian-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Select a conversation</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Choose a conversation from the list to start messaging, or start a new chat with the AI Assistant.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
