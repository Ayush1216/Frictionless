'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2, CheckCircle2, Upload, Sparkles, Info } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { streamChat } from '@/lib/ai/openai-client';
import { useTasksSync } from '@/contexts/TasksSyncContext';
import type { Task } from '@/types/database';

interface ReadinessTaskCardProps {
  task: Task;
  categoryName: string;
  onAsk: (task: Task) => void;
  isExpanded?: boolean;
  onToggleExpand?: (taskId: string) => void;
  aiDescription?: string;
  aiDescriptionLoading?: boolean;
}

function getImpactBadge(priority: string): { label: string; color: string; bg: string } {
  switch (priority) {
    case 'critical':
      return { label: 'Critical', color: 'var(--fi-score-need-improvement)', bg: 'rgba(239,68,68,0.1)' };
    case 'high':
      return { label: 'High Impact', color: 'var(--fi-score-need-improvement)', bg: 'rgba(239,68,68,0.08)' };
    case 'medium':
      return { label: 'Medium', color: 'var(--fi-score-good)', bg: 'rgba(234,179,8,0.1)' };
    default:
      return { label: 'Low', color: 'var(--fi-score-excellent)', bg: 'rgba(16,185,129,0.1)' };
  }
}

export function ReadinessTaskCard({ task, categoryName, onAsk, isExpanded, onToggleExpand, aiDescription, aiDescriptionLoading }: ReadinessTaskCardProps) {
  const impact = getImpactBadge(task.priority);
  const isDone = task.status === 'done';
  const tasksSync = useTasksSync();

  const [isCompleting, setIsCompleting] = useState(false);
  const [completionAnalysis, setCompletionAnalysis] = useState<string | null>(null);
  const [proofUploaded, setProofUploaded] = useState(() => {
    try { return localStorage.getItem(`task-proof-${task.id}`) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    if (!isExpanded) {
      setCompletionAnalysis(null);
    }
  }, [isExpanded]);

  const handleMarkComplete = useCallback(async () => {
    if (!proofUploaded) { onAsk(task); return; }
    if (!tasksSync || isCompleting) return;
    setIsCompleting(true);

    try {
      const success = await tasksSync.completeTaskViaApi(task.id);
      if (success) {
        setCompletionAnalysis('generating');
        const systemPrompt = `You are a startup advisor. The founder just completed a readiness task. Provide a brief congratulatory analysis (2-3 sentences) of the impact this has on their readiness. Be encouraging and specific.`;
        const analysisMsg = `I just completed: "${task.title}" in "${categoryName}". Worth ${task.potential_points ?? 'several'} points.`;

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
          analysis = `Great work completing "${task.title}"! This is worth ${task.potential_points ?? 'several'} points toward your readiness.`;
          setCompletionAnalysis(analysis);
        }
        try { localStorage.removeItem(`task-proof-${task.id}`); } catch { /* ignore */ }
      }
    } catch {
      setCompletionAnalysis('Failed to mark as complete. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }, [task, tasksSync, isCompleting, categoryName, proofUploaded, onAsk]);

  const handleMarkProofDone = useCallback(() => {
    setProofUploaded(true);
    try { localStorage.setItem(`task-proof-${task.id}`, 'true'); } catch { /* ignore */ }
  }, [task.id]);

  // Use AI description if available, otherwise fall back to task.description
  const displayDescription = aiDescription || task.description || null;

  return (
    <div
      className="overflow-hidden transition-all duration-200 p-0 rounded-xl"
      style={{
        background: 'var(--fi-bg-card)',
        border: isExpanded ? '2px solid var(--fi-primary)' : '1px solid var(--fi-border)',
        opacity: isDone ? 0.5 : 1,
      }}
    >
      {/* Clickable header row */}
      <button
        onClick={() => onToggleExpand?.(task.id)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors rounded-t-xl"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--fi-bg-card-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-base font-semibold leading-snug"
            style={{
              color: isDone ? 'var(--fi-text-muted)' : 'var(--fi-text-primary)',
              textDecoration: isDone ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-muted)' }}
            >
              {categoryName}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: impact.bg, color: impact.color }}
            >
              {impact.label}
            </span>
            {task.potential_points && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--fi-score-excellent)' }}
              >
                +{task.potential_points} pts
              </span>
            )}
          </div>
        </div>

        {/* Ask AI button — styled with primary color */}
        <div onClick={(e) => { e.stopPropagation(); onAsk(task); }}>
          <button
            onClick={() => onAsk(task)}
            className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold transition-all duration-200 hover:brightness-110"
            style={{
              background: 'rgba(16,185,129,0.1)',
              color: 'var(--fi-primary)',
              border: '1px solid var(--fi-primary)',
            }}
          >
            Ask
            <Image src="/ai-logo.png" alt="" width={14} height={14} className="shrink-0 object-contain" />
          </button>
        </div>

        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-5 h-5" style={{ color: 'var(--fi-text-muted)' }} />
        </motion.div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div style={{ borderTop: '1px solid var(--fi-border)' }}>
              {/* Scrollable content area */}
              <div className="px-5 pb-4 pt-4 space-y-4 max-h-[280px] overflow-y-auto">
                {/* AI-generated description */}
                {aiDescriptionLoading ? (
                  <div className="flex items-center gap-2 py-3 px-4 rounded-lg" style={{ background: 'var(--fi-bg-secondary)' }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: 'var(--fi-primary)' }} />
                    <span className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>Generating AI explanation...</span>
                  </div>
                ) : displayDescription ? (
                  <div className="flex gap-3">
                    <div
                      className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-0.5"
                      style={{ background: 'rgba(16,185,129,0.1)' }}
                    >
                      <Info className="w-3.5 h-3.5" style={{ color: 'var(--fi-primary)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--fi-text-muted)' }}>
                        What this means
                      </p>
                      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>
                        {displayDescription}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Points value */}
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" style={{ color: 'var(--fi-primary)', opacity: 0.7 }} />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--fi-text-muted)' }}>
                    Worth <strong style={{ color: 'var(--fi-primary)' }}>+{task.potential_points ?? '?'} pts</strong> toward your readiness score
                  </span>
                </div>

                {/* Completion banner */}
                {completionAnalysis && (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--fi-score-excellent)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--fi-score-excellent)' }}>Task Completed!</span>
                    </div>
                    {completionAnalysis === 'generating' ? (
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--fi-text-muted)' }}>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analyzing impact...
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed" style={{ color: 'var(--fi-text-secondary)' }}>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="text-sm" style={{ color: 'var(--fi-text-secondary)' }}>{children}</p>,
                          }}
                        >{completionAnalysis}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions — pinned at bottom outside scroll area */}
              {task.status !== 'done' && !completionAnalysis && (
                <div className="px-5 pb-5 pt-2 space-y-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
                  {/* Proof status */}
                  {!proofUploaded && (
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                      style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', color: 'var(--fi-score-good)' }}
                    >
                      <Upload className="w-4 h-4 shrink-0" />
                      <span className="flex-1">Upload proof or evidence to mark complete</span>
                      <button
                        onClick={handleMarkProofDone}
                        className="text-[11px] font-semibold underline hover:no-underline shrink-0"
                      >
                        I have proof
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onAsk(task)}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid var(--fi-primary)',
                        color: 'var(--fi-primary)',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.15)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'; }}
                    >
                      <Image src="/ai-logo.png" alt="Frictionless" width={16} height={16} className="opacity-80" />
                      Chat with AI
                    </button>
                    <button
                      onClick={handleMarkComplete}
                      disabled={isCompleting}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: isCompleting ? 'rgba(16,185,129,0.5)' : proofUploaded ? 'var(--fi-score-excellent)' : 'rgba(16,185,129,0.1)',
                        color: proofUploaded ? 'white' : 'var(--fi-primary)',
                        border: proofUploaded ? 'none' : '1px solid var(--fi-primary)',
                        cursor: isCompleting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isCompleting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Completing...</>
                      ) : proofUploaded ? (
                        <><CheckCircle2 className="w-4 h-4" /> Mark Complete</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Submit Proof</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
