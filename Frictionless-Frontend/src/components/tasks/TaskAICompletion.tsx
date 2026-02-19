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
  chatFullPanel?: boolean;
  onChatFullPanel?: () => void;
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
    const userMsg: ChatMessage = { role: 'user', content: msg };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      const { reply, suggest_complete, submitted_value } = await chatWithTaskAI(taskId, msg, history);
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setChatMessages((prev) => [...prev, assistantMsg]);
      setSuggestComplete(suggest_complete);
      if (submitted_value) setLastSubmittedValue(submitted_value);

      // Persist messages to DB
      try {
        await saveTaskChatMessages(taskId, [
          ...chatMessages, userMsg, assistantMsg,
        ].map((m) => ({ role: m.role, content: m.content })));
      } catch { /* non-blocking */ }
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--fi-text-muted)', border: '1px solid transparent' }}
            title="Start a new chat"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            New chat
          </button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-y-auto rounded-lg p-3 space-y-2 flex flex-col"
          style={{ border: '1px solid var(--fi-border)' }}
        >
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--fi-primary)' }} />
            </div>
          ) : (
            <>
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-sm rounded-lg px-3 py-2 flex-shrink-0',
                    m.role === 'user' ? 'ml-4' : 'mr-4'
                  )}
                  style={{
                    background: m.role === 'user' ? 'rgba(16,185,129,0.08)' : 'var(--fi-bg-secondary)',
                    color: 'var(--fi-text-primary)',
                  }}
                >
                  <div>{m.content}</div>
                  {m.created_at && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--fi-text-muted)', opacity: 0.7 }}>
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
            className="p-2 rounded-lg disabled:opacity-50 transition-colors"
            style={{
              border: '1px solid var(--fi-border)',
              color: 'var(--fi-text-muted)',
            }}
            title="Upload proof document (adds to Data Room and updates score)"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
            placeholder="Type your message or attach a document..."
            className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{
              background: 'var(--fi-bg-secondary)',
              border: '1px solid var(--fi-border)',
              color: 'var(--fi-text-primary)',
            }}
          />
          <button
            onClick={handleChatSend}
            disabled={chatLoading || !chatInput.trim()}
            className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: 'var(--fi-primary)', color: '#fff' }}
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors flex-shrink-0 mt-2"
            style={{
              background: 'rgba(16,185,129,0.12)',
              color: 'var(--fi-score-excellent)',
            }}
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
        <Sparkles className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
        <h4 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Complete with AI</h4>
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
              className="flex flex-col items-center gap-3 backdrop-blur-xl rounded-2xl p-8 shadow-xl"
              style={{
                background: 'color-mix(in srgb, var(--fi-bg-card) 90%, transparent)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <PartyPopper className="w-12 h-12" style={{ color: 'var(--fi-score-excellent)' }} />
              <p className="text-lg font-bold" style={{ color: 'var(--fi-text-primary)' }}>Task Complete!</p>
              <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>Score rescore queued</p>
            </motion.div>
          </motion.div>
        )}

        {/* Idle: upload or chat */}
        {step === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <TaskFileUpload onFileSelect={handleFileSelect} />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--fi-border)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--fi-text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--fi-border)' }} />
            </div>
            <button
              onClick={handleChatClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'var(--fi-bg-secondary)',
                border: '1px solid var(--fi-border)',
                color: 'var(--fi-text-primary)',
              }}
            >
              <MessageSquare className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
              Chat with AI
            </button>
          </motion.div>
        )}

        {/* Chat with AI */}
        {step === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-[320px] sm:min-h-[400px]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: 'var(--fi-text-primary)' }}>Chat with AI</span>
              <button
                onClick={() => setStep('idle')}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--fi-text-muted)' }}
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div
              className="flex-1 min-h-[240px] overflow-y-auto rounded-lg p-3 space-y-2"
              style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
            >
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-sm rounded-lg px-3 py-2',
                    m.role === 'user' ? 'ml-4' : 'mr-4'
                  )}
                  style={{
                    background: m.role === 'user' ? 'rgba(16,185,129,0.08)' : 'var(--fi-bg)',
                    color: 'var(--fi-text-primary)',
                  }}
                >
                  <div>{m.content}</div>
                  {m.created_at && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--fi-text-muted)', opacity: 0.7 }}>
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
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{
                  background: 'var(--fi-bg-secondary)',
                  border: '1px solid var(--fi-border)',
                  color: 'var(--fi-text-primary)',
                }}
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ background: 'var(--fi-primary)', color: '#fff' }}
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                style={{
                  background: 'rgba(16,185,129,0.12)',
                  color: 'var(--fi-score-excellent)',
                }}
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
              <Loader2 className="w-8 h-8" style={{ color: 'var(--fi-primary)' }} />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>AI is analyzing your document...</p>
              <p className="text-xs mt-1" style={{ color: 'var(--fi-text-muted)' }}>Extracting fields and validating data</p>
            </div>
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
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ border: '2px solid var(--fi-primary)' }}
                    animate={step === 'analyzing' && i <= 1 ? { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.2)' } : {}}
                    transition={{ delay: i * 0.6 }}
                  >
                    {step === 'analyzing' && i <= 1 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full" style={{ background: 'var(--fi-score-excellent)' }} />
                    )}
                  </motion.div>
                  <span style={{ color: 'var(--fi-text-muted)' }}>{label}</span>
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
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.12)' }}
            >
              <PartyPopper className="w-6 h-6" style={{ color: 'var(--fi-score-excellent)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Data accepted!</p>
            <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Task marked as complete. Score rescore queued.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
