'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquare, Loader2, PartyPopper, Send, X, Paperclip, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskFileUpload } from './TaskFileUpload';
import { AIExtractionCard } from '@/components/ai/AIExtractionCard';
import { useTaskStore } from '@/stores/task-store';
import { useTasksSync } from '@/contexts/TasksSyncContext';
import { chatWithTaskAI, fetchTaskChatMessages, getAuthHeaders, saveTaskChatMessages } from '@/lib/api/tasks';
import type { AIExtraction } from '@/types/database';

const demoExtractions: AIExtraction[] = [
  { field: 'Company Name', value: 'NeuralPay Inc.', confidence: 0.97 },
  { field: 'Incorporation Date', value: '2023-03-15', confidence: 0.92 },
  { field: 'State of Incorporation', value: 'Delaware', confidence: 0.95 },
  { field: 'Registered Agent', value: 'Corporation Service Company', confidence: 0.88 },
  { field: 'Share Classes', value: 'Common + Series Seed Preferred', confidence: 0.78 },
];

/** First message from the AI when chat has no history — so the AI starts the conversation. */
const INITIAL_AI_MESSAGE =
  "Hi! I'm here to help you complete this task. You can describe what you've done so far, ask how to complete it, or attach a document (e.g. proof or supporting file) using the paperclip. What would you like to do?";

type CompletionStep = 'idle' | 'file-selected' | 'analyzing' | 'results' | 'accepted' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface TaskAICompletionProps {
  taskId: string;
  className?: string;
  /** When true, render only chat UI and fill the side panel (used when panel is in full-panel chat mode). */
  chatFullPanel?: boolean;
  /** Call when user opens "Chat with AI" so the panel can switch to full-panel chat. */
  onChatFullPanel?: () => void;
  /** Call when user exits full-panel chat (e.g. Back). */
  onExitFullPanel?: () => void;
}

export function TaskAICompletion({
  taskId,
  className,
  chatFullPanel = false,
  onChatFullPanel,
  onExitFullPanel,
}: TaskAICompletionProps) {
  const [step, setStep] = useState<CompletionStep>(chatFullPanel ? 'chat' : 'idle');
  const [showConfetti, setShowConfetti] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(chatFullPanel);
  const [suggestComplete, setSuggestComplete] = useState(false);
  const [lastSubmittedValue, setLastSubmittedValue] = useState<string | undefined>();
  const completeTaskWithAI = useTaskStore((s) => s.completeTaskWithAI);
  const completeTaskViaApi = useTasksSync()?.completeTaskViaApi;
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === taskId));

  const handleFileSelect = useCallback(() => {
    setStep('file-selected');
    setTimeout(() => {
      setStep('analyzing');
      setTimeout(() => setStep('results'), 2500);
    }, 800);
  }, []);

  const handleAccept = useCallback(() => {
    completeTaskWithAI(taskId, demoExtractions, 'ai_file_upload');
    setStep('accepted');
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, [taskId, completeTaskWithAI]);

  const handleReject = useCallback(() => {
    setStep('idle');
  }, []);

  const loadChatMessages = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { messages } = await fetchTaskChatMessages(taskId);
      const list = (messages ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        created_at: (m as { created_at?: string }).created_at,
      }));
      setChatMessages(list.length > 0 ? list : [{ role: 'assistant', content: INITIAL_AI_MESSAGE }]);
    } catch {
      setChatMessages([{ role: 'assistant', content: INITIAL_AI_MESSAGE }]);
    } finally {
      setLoadingHistory(false);
    }
  }, [taskId]);

  // Load history when opening inline chat (step === 'chat') so persisted messages show
  useEffect(() => {
    if (step === 'chat' && !chatFullPanel && chatMessages.length === 0) {
      loadChatMessages();
    }
  }, [step, chatFullPanel, chatMessages.length, loadChatMessages]);

  useEffect(() => {
    if (chatFullPanel) {
      setStep('chat');
      loadChatMessages();
    }
  }, [chatFullPanel, loadChatMessages]);

  // Show "Mark as complete" when reopening: task has submitted_value, or last assistant message says they can mark complete (e.g. after upload)
  useEffect(() => {
    if (!chatFullPanel || task?.status === 'done') return;
    if (task?.submitted_value) {
      setSuggestComplete(true);
      setLastSubmittedValue(task.submitted_value ?? undefined);
      return;
    }
    const canMarkComplete = chatMessages.some(
      (m) =>
        m.role === 'assistant' &&
        (m.content.includes('mark the task complete when ready') ||
          m.content.includes('mark as complete') ||
          m.content.includes('You can mark the task complete'))
    );
    if (canMarkComplete) setSuggestComplete(true);
  }, [chatFullPanel, task?.submitted_value, task?.status, chatMessages]);

  const handleChatClick = useCallback(() => {
    onChatFullPanel?.();
  }, [onChatFullPanel]);

  const handleChatSend = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      const { reply, suggest_complete, submitted_value } = await chatWithTaskAI(taskId, msg, history);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setSuggestComplete(suggest_complete);
      if (submitted_value) setLastSubmittedValue(submitted_value);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I could not process that. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatMessages, taskId]);

  const handleMarkCompleteFromChat = useCallback(async () => {
    if (completeTaskViaApi) {
      const ok = await completeTaskViaApi(taskId, lastSubmittedValue);
      if (ok) {
        setStep('accepted');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  }, [taskId, completeTaskViaApi, lastSubmittedValue]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAttachFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || chatLoading) return;
    e.target.value = '';
    const userContent = `Uploaded: ${file.name}`;
    setChatMessages((prev) => [...prev, { role: 'user', content: userContent }]);
    setChatLoading(true);
    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/startup/data-room/upload', {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const alreadyExists = data.already_exists === true;
        const assistantContent = alreadyExists
          ? 'This document is already in your Data Room. You can mark the task complete when ready.'
          : "I've added this document to your Data Room. We're updating your readiness score from it. You can mark the task complete when ready.";
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: assistantContent },
        ]);
        setSuggestComplete(true);
        // Persist to chat history so it's there if user doesn't click Mark as complete
        try {
          await saveTaskChatMessages(taskId, [
            { role: 'user', content: userContent },
            { role: 'assistant', content: assistantContent },
          ]);
        } catch {
          // non-blocking
        }
      } else {
        const errContent = data?.error ?? 'Upload failed. Please try again.';
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errContent },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Upload failed. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, taskId]);

  const handleNewChat = useCallback(() => {
    setChatMessages([{ role: 'assistant', content: INITIAL_AI_MESSAGE }]);
    setSuggestComplete(false);
  }, []);

  if (chatFullPanel) {
    return (
      <div className={cn('flex flex-col flex-1 min-h-0', className)}>
        <div className="flex justify-end shrink-0 mb-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-colors"
            title="Start a new chat"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            New chat
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border p-3 space-y-2 flex flex-col">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-sm rounded-lg px-3 py-2 flex-shrink-0',
                    m.role === 'user'
                      ? 'bg-primary/15 ml-4 text-foreground'
                      : 'bg-muted mr-4 text-foreground'
                  )}
                >
                  <div>{m.content}</div>
                  {m.created_at && (
                    <div className="text-[10px] text-muted-foreground mt-1 opacity-70">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        <div className="flex gap-2 mt-3 flex-shrink-0 p-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleAttachFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={chatLoading}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
            title="Upload proof document (adds to Data Room and updates score)"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
            placeholder="Type your message or attach a document..."
            className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleChatSend}
            disabled={chatLoading || !chatInput.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chatLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        {suggestComplete && completeTaskViaApi && task?.status !== 'done' && (
          <button
            onClick={handleMarkCompleteFromChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-score-excellent/20 text-score-excellent font-medium text-sm hover:bg-score-excellent/30 transition-colors flex-shrink-0 mt-2"
          >
            <PartyPopper className="w-4 h-4" />
            Mark task complete
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <h4 className="text-sm font-semibold text-foreground">Complete with AI</h4>
      </div>

      <AnimatePresence mode="wait">
        {/* Confetti overlay */}
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-3 bg-card/90 backdrop-blur-xl border border-score-excellent/30 rounded-2xl p-8 shadow-xl"
            >
              <PartyPopper className="w-12 h-12 text-score-excellent" />
              <p className="text-lg font-display font-bold text-foreground">Task Complete!</p>
              <p className="text-sm text-muted-foreground">Score rescore queued</p>
            </motion.div>
          </motion.div>
        )}

        {/* Idle: upload or chat */}
        {step === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <TaskFileUpload onFileSelect={handleFileSelect} />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-muted" />
              <span className="text-xs text-muted-foreground font-medium">or</span>
              <div className="flex-1 h-px bg-muted" />
            </div>
            <button
              onClick={handleChatClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted border border-border text-sm font-medium text-foreground hover:bg-muted hover:border-primary/20 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-primary" />
              Chat with AI
            </button>
          </motion.div>
        )}

        {/* Chat with AI - expands to fill container */}
        {step === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-[320px] sm:min-h-[400px]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Chat with AI</span>
              <button
                onClick={() => setStep('idle')}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-[240px] overflow-y-auto rounded-lg bg-muted/50 border border-border p-3 space-y-2">
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-sm rounded-lg px-3 py-2',
                    m.role === 'user'
                      ? 'bg-primary/15 ml-4 text-foreground'
                      : 'bg-muted mr-4 text-foreground'
                  )}
                >
                  <div>{m.content}</div>
                  {m.created_at && (
                    <div className="text-[10px] text-muted-foreground mt-1 opacity-70">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3 flex-shrink-0">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            {suggestComplete && completeTaskViaApi && (
              <button
                onClick={handleMarkCompleteFromChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-score-excellent/20 text-score-excellent font-medium text-sm hover:bg-score-excellent/30 transition-colors"
              >
                <PartyPopper className="w-4 h-4" />
                Mark task complete
              </button>
            )}
          </motion.div>
        )}

        {/* File selected / Analyzing */}
        {(step === 'file-selected' || step === 'analyzing') && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            >
              <Loader2 className="w-8 h-8 text-primary" />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">AI is analyzing your document...</p>
              <p className="text-xs text-muted-foreground mt-1">Extracting fields and validating data</p>
            </div>
            {/* Fake progress steps */}
            <div className="space-y-2 w-full max-w-xs">
              {['Reading document', 'Extracting fields', 'Validating data'].map((label, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.6 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center"
                    animate={step === 'analyzing' && i <= 1 ? { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.2)' } : {}}
                    transition={{ delay: i * 0.6 }}
                  >
                    {step === 'analyzing' && i <= 1 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full bg-score-excellent" />
                    )}
                  </motion.div>
                  <span className="text-muted-foreground">{label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {step === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AIExtractionCard
              extractions={demoExtractions}
              onAcceptAll={handleAccept}
              onReject={handleReject}
              onEdit={() => {}}
            />
          </motion.div>
        )}

        {/* Accepted */}
        {step === 'accepted' && (
          <motion.div
            key="accepted"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-score-excellent/20 flex items-center justify-center">
              <PartyPopper className="w-6 h-6 text-score-excellent" />
            </div>
            <p className="text-sm font-semibold text-foreground">Data accepted!</p>
            <p className="text-xs text-muted-foreground">Task marked as complete. Score rescore queued.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
