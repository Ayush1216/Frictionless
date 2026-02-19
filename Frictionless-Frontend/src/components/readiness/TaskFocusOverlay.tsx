'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { streamChat, isAIEnabled } from '@/lib/ai/openai-client';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedExplanation, setCachedExplanation } from '@/lib/ai/task-explanation-cache';
import { useTasksSync } from '@/contexts/TasksSyncContext';
import { useUIStore } from '@/stores/ui-store';
import type { Task } from '@/types/database';

interface TaskFocusOverlayProps {
  task: Task | null;
  categoryName: string;
  isOpen: boolean;
  onClose: () => void;
  onAskTask: (task: Task) => void;
  onTaskCompleted?: () => void;
}

function getImpactBadge(priority: string): { label: string; className: string } {
  switch (priority) {
    case 'critical':
      return { label: 'Critical', className: 'bg-score-poor/15 text-score-poor border-score-poor/20' };
    case 'high':
      return { label: 'High Impact', className: 'bg-score-poor/10 text-score-poor border-score-poor/15' };
    case 'medium':
      return { label: 'Medium', className: 'bg-score-fair/10 text-score-fair border-score-fair/15' };
    default:
      return { label: 'Low', className: 'bg-muted text-muted-foreground border-border' };
  }
}

function parseSteps(text: string): string[] {
  const lines = text.split('\n');
  const steps: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*\*?\*?\d+[\.\)]\*?\*?\s+(.+)/);
    if (match) {
      steps.push(match[1].replace(/\*\*/g, '').trim());
    }
  }
  return steps;
}

const DEMO_EXPLANATION = `**Why this matters:** This task directly impacts how investors evaluate your readiness and can significantly improve your score in this category.

**How to approach it:**
1. Start by gathering all relevant data and documents
2. Identify key metrics and benchmarks from your industry
3. Create a structured analysis with supporting evidence
4. Get feedback from advisors or mentors
5. Iterate and refine based on feedback

**Tip:** Focus on quality over quantity — investors appreciate depth and specificity over vague claims.`;

export function TaskFocusOverlay({
  task,
  categoryName,
  isOpen,
  onClose,
  onAskTask,
  onTaskCompleted,
}: TaskFocusOverlayProps) {
  const [guidance, setGuidance] = useState<string | null>(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const [subStepsDone, setSubStepsDone] = useState<Set<number>>(new Set());
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionAnalysis, setCompletionAnalysis] = useState<string | null>(null);
  const theme = useUIStore((s) => s.theme);
  const tasksSync = useTasksSync();
  const prevTaskId = useRef<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Load guidance when task changes
  useEffect(() => {
    if (!isOpen || !task) return;
    if (prevTaskId.current === task.id && guidance) return;
    prevTaskId.current = task.id;
    setGuidance(null);
    setSubStepsDone(new Set());
    setCompletionAnalysis(null);

    const loadGuidance = async () => {
      const cached = getCachedExplanation(task.id);
      if (cached) { setGuidance(cached); return; }

      if (!isAIEnabled()) {
        setGuidance(DEMO_EXPLANATION);
        setCachedExplanation(task.id, DEMO_EXPLANATION);
        return;
      }

      setIsLoadingGuidance(true);
      try {
        const systemPrompt = getPrompt('TASK_EXPLAINER');
        const userMessage = `Task: "${task.title}"\nCategory: ${categoryName}\nDescription: ${task.description || 'No description provided.'}\nPriority: ${task.priority}`;

        let fullContent = '';
        for await (const chunk of streamChat(
          [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
          { model: 'gpt-4.1-mini' }
        )) {
          fullContent += chunk;
          setGuidance(fullContent);
        }
        setCachedExplanation(task.id, fullContent);
      } catch {
        setGuidance('Unable to generate guidance. Please try again.');
      } finally {
        setIsLoadingGuidance(false);
      }
    };

    loadGuidance();
  }, [isOpen, task, categoryName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      prevTaskId.current = null;
      setCompletionAnalysis(null);
    }
  }, [isOpen]);

  const steps = guidance ? parseSteps(guidance) : [];
  const toggleStep = (i: number) => {
    setSubStepsDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleMarkComplete = useCallback(async () => {
    if (!task || !tasksSync || isCompleting) return;
    setIsCompleting(true);

    try {
      const success = await tasksSync.completeTaskViaApi(task.id);
      if (success) {
        setCompletionAnalysis('generating');
        const systemPrompt = `You are a startup advisor. The founder just completed a readiness task. Provide a brief congratulatory analysis (3-4 sentences) of the impact this has on their readiness. Mention the category and potential score improvement. Be encouraging and specific.`;
        const analysisMsg = `I just completed the task: "${task.title}" in the "${categoryName}" category. It was worth ${task.potential_points ?? 'several'} points. Give me a brief analysis of what this means for my readiness.`;

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
          analysis = `Great work completing "${task.title}"! This task in the ${categoryName} category is worth ${task.potential_points ?? 'several'} points toward your readiness score. Run a new assessment to see your updated score.`;
          setCompletionAnalysis(analysis);
        }

        onTaskCompleted?.();
      }
    } catch {
      setCompletionAnalysis('Failed to mark as complete. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }, [task, tasksSync, isCompleting, categoryName, onTaskCompleted]);

  if (!task) return null;

  const impact = getImpactBadge(task.priority);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed inset-4 sm:inset-auto sm:top-[5vh] sm:left-1/2 sm:-translate-x-1/2 z-50 w-auto sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col rounded-2xl glass-card border border-border/60 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/50 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-display font-semibold text-foreground leading-snug">
                    {task.title}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
                      {categoryName}
                    </span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', impact.className)}>
                      {impact.label}
                    </span>
                    {task.potential_points && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-score-excellent/10 text-score-excellent border border-score-excellent/15">
                        +{task.potential_points} pts
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Completion banner */}
              {completionAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-score-excellent/5 border border-score-excellent/20 p-3"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-score-excellent" />
                    <span className="text-xs font-semibold text-score-excellent">Task Completed!</span>
                  </div>
                  {completionAnalysis === 'generating' ? (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analyzing impact...
                    </div>
                  ) : (
                    <div className={cn("text-xs text-foreground leading-relaxed prose prose-sm max-w-none [&>p]:text-xs", theme === 'dark' ? 'prose-invert' : '')}>
                      <ReactMarkdown>{completionAnalysis}</ReactMarkdown>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Description */}
              {task.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
              )}

              {/* How to Approach This */}
              <div className="rounded-lg bg-muted/20 border border-border/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-0.5 h-3.5 bg-primary rounded-full" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">How to Approach This</span>
                  {isLoadingGuidance && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </div>
                {guidance ? (
                  <div className={cn("prose prose-sm max-w-none text-muted-foreground text-xs [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>p]:text-xs [&>ul]:mb-1.5 [&>ol]:mb-1.5 [&>ul>li]:text-xs [&>ol>li]:text-xs [&>strong]:text-foreground", theme === 'dark' ? 'prose-invert' : '')}>
                    <ReactMarkdown>{guidance}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating guidance...
                  </div>
                )}
              </div>

              {/* Sub-steps checklist */}
              {steps.length > 0 && (
                <div className="rounded-lg bg-muted/20 border border-border/40 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-0.5 h-3.5 bg-score-excellent rounded-full" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Progress Checklist</span>
                    <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">{subStepsDone.size}/{steps.length}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 rounded-full bg-muted mb-2 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-score-excellent"
                      animate={{ width: `${steps.length > 0 ? (subStepsDone.size / steps.length) * 100 : 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="space-y-1">
                    {steps.map((step, i) => (
                      <button
                        key={i}
                        onClick={() => toggleStep(i)}
                        className="w-full flex items-start gap-2 group text-left hover:bg-muted/30 rounded-md px-2 py-1 transition-colors"
                      >
                        <div className="shrink-0 mt-0.5">
                          {subStepsDone.has(i) ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-score-excellent" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          )}
                        </div>
                        <span className={cn('text-xs flex-1 leading-relaxed', subStepsDone.has(i) ? 'line-through text-muted-foreground' : 'text-foreground')}>
                          {step}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border/50 shrink-0 flex items-center gap-2">
              <button
                onClick={() => { onAskTask(task); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-muted/50 border border-border/50 text-foreground hover:bg-muted transition-colors"
              >
                <Image src="/ai-logo.png" alt="Frictionless" width={14} height={14} className="opacity-80" />
                Ask Frictionless
              </button>
              {task.status !== 'done' && !completionAnalysis && (
                <button
                  onClick={handleMarkComplete}
                  disabled={isCompleting}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors',
                    isCompleting
                      ? 'bg-score-excellent/50 text-white cursor-not-allowed'
                      : 'bg-score-excellent text-white hover:bg-score-excellent/90'
                  )}
                >
                  {isCompleting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Completing...</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
