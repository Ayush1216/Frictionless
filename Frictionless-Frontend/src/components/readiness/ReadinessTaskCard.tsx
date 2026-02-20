'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2, CheckCircle2, Sparkles, Info, Send } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { streamChat } from '@/lib/ai/openai-client';
import { useTasksSync } from '@/contexts/TasksSyncContext';
import { getAuthHeaders } from '@/lib/api/tasks';
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

/**
 * Convert a task title into a snake_case key for extraction_data patching.
 * e.g. "Cash on hand (USD)" → "cash_on_hand_usd"
 */
function titleToFieldKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function ReadinessTaskCard({ task, categoryName, onAsk, isExpanded, onToggleExpand, aiDescription, aiDescriptionLoading }: ReadinessTaskCardProps) {
  const impact = getImpactBadge(task.priority);
  const isDone = task.status === 'done';
  const tasksSync = useTasksSync();

  const [inputValue, setInputValue] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionAnalysis, setCompletionAnalysis] = useState<string | null>(null);

  useEffect(() => {
    if (!isExpanded) {
      setCompletionAnalysis(null);
    }
  }, [isExpanded]);

  // Save input to company profile, then mark task complete
  const handleCompleteTask = useCallback(async () => {
    if (!tasksSync || isCompleting) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setIsCompleting(true);
    try {
      // Step 1: Save data to company profile via extraction_patch
      const fieldKey = titleToFieldKey(task.title);
      const headers = await getAuthHeaders();
      await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction_patch: {
            startup_kv: { initial_details: { [fieldKey]: trimmed } },
          },
          regenerate_readiness: false,
        }),
      });

      // Step 2: Mark task complete (with the submitted value)
      const success = await tasksSync.completeTaskViaApi(task.id, trimmed);
      if (success) {
        setCompletionAnalysis('generating');
        const systemPrompt = `You are a startup advisor. The founder just completed a Frictionless task by providing data. Provide a brief congratulatory analysis (2-3 sentences) of the impact this has on their Frictionless. Be encouraging and specific.`;
        const analysisMsg = `I just completed: "${task.title}" in "${categoryName}". Worth ${task.potential_points ?? 'several'} points. Value provided: "${trimmed}"`;

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
          analysis = `Great work completing "${task.title}"! This is worth ${task.potential_points ?? 'several'} points toward your Frictionless score.`;
          setCompletionAnalysis(analysis);
        }
      }
    } catch {
      setCompletionAnalysis('Failed to complete. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }, [task, tasksSync, isCompleting, inputValue, categoryName]);

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

        {/* Ask AI button */}
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
              {/* Content area */}
              <div className="px-5 pb-4 pt-4 space-y-4">
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
                    Worth <strong style={{ color: 'var(--fi-primary)' }}>+{task.potential_points ?? '?'} pts</strong> toward your Frictionless score
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

              {/* Input + Complete button — pinned at bottom */}
              {task.status !== 'done' && !completionAnalysis && (
                <div className="px-5 pb-5 pt-2 space-y-3" style={{ borderTop: '1px solid var(--fi-border)' }}>
                  {/* Data input field */}
                  <div>
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wide block mb-1.5"
                      style={{ color: 'var(--fi-text-muted)' }}
                    >
                      {task.title}
                    </label>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={`Enter ${task.title.toLowerCase()}...`}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: 'var(--fi-bg-secondary)',
                        border: '1px solid var(--fi-border)',
                        color: 'var(--fi-text-primary)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--fi-primary)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--fi-border)'; }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && inputValue.trim()) handleCompleteTask(); }}
                    />
                  </div>

                  {/* Complete Task button */}
                  <button
                    onClick={handleCompleteTask}
                    disabled={isCompleting || !inputValue.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: (!inputValue.trim() || isCompleting) ? 'rgba(16,185,129,0.1)' : 'var(--fi-primary)',
                      color: (!inputValue.trim() || isCompleting) ? 'var(--fi-text-muted)' : 'white',
                      cursor: (!inputValue.trim() || isCompleting) ? 'not-allowed' : 'pointer',
                      opacity: (!inputValue.trim() || isCompleting) ? 0.6 : 1,
                    }}
                  >
                    {isCompleting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving &amp; completing...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Complete Task</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
