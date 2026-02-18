'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2, CheckCircle2, Circle, Upload } from 'lucide-react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { streamChat, isAIEnabled } from '@/lib/ai/openai-client';
import { getPrompt } from '@/lib/ai/prompts';
import { getCachedExplanation, setCachedExplanation } from '@/lib/ai/task-explanation-cache';
import { useTasksSync } from '@/contexts/TasksSyncContext';
import { useUIStore } from '@/stores/ui-store';
import type { Task } from '@/types/database';

interface ReadinessTaskCardProps {
  task: Task;
  categoryName: string;
  onAsk: (task: Task) => void;
  isExpanded?: boolean;
  onToggleExpand?: (taskId: string) => void;
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

export function ReadinessTaskCard({ task, categoryName, onAsk, isExpanded, onToggleExpand }: ReadinessTaskCardProps) {
  const impact = getImpactBadge(task.priority);
  const isDone = task.status === 'done';
  const theme = useUIStore((s) => s.theme);
  const tasksSync = useTasksSync();

  const [guidance, setGuidance] = useState<string | null>(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const [subStepsDone, setSubStepsDone] = useState<Set<number>>(() => {
    // Restore from localStorage
    try {
      const saved = localStorage.getItem(`task-steps-${task.id}`);
      if (saved) return new Set(JSON.parse(saved) as number[]);
    } catch { /* ignore */ }
    return new Set();
  });
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionAnalysis, setCompletionAnalysis] = useState<string | null>(null);
  const [proofUploaded, setProofUploaded] = useState(() => {
    try {
      return localStorage.getItem(`task-proof-${task.id}`) === 'true';
    } catch { return false; }
  });
  const hasLoadedRef = useRef(false);

  // Load guidance when expanded
  useEffect(() => {
    if (!isExpanded || hasLoadedRef.current || guidance) return;
    hasLoadedRef.current = true;

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
  }, [isExpanded, task, categoryName, guidance]);

  // Reset transient state when collapsed (but keep sub-steps)
  useEffect(() => {
    if (!isExpanded) {
      hasLoadedRef.current = false;
      setCompletionAnalysis(null);
    }
  }, [isExpanded]);

  const steps = guidance ? parseSteps(guidance) : [];
  const toggleStep = (i: number) => {
    setSubStepsDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      // Persist to localStorage
      try { localStorage.setItem(`task-steps-${task.id}`, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  const handleMarkComplete = useCallback(async () => {
    // If no proof uploaded, open chat to ask for it
    if (!proofUploaded) {
      onAsk(task);
      return;
    }

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
        // Clear proof state after completion
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

  return (
    <div className={cn(
      'glass-card overflow-hidden transition-all duration-200',
      isExpanded && 'ring-2 ring-score-excellent/40 border-score-excellent/30 shadow-lg shadow-score-excellent/5',
      isDone && 'opacity-50'
    )}>
      {/* Clickable header row */}
      <button
        onClick={() => onToggleExpand?.(task.id)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium leading-snug',
            isDone ? 'line-through text-muted-foreground' : 'text-foreground'
          )}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-medium">{categoryName}</span>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', impact.className)}>
              {impact.label}
            </span>
            {task.potential_points && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
                +{task.potential_points} pts
              </span>
            )}
          </div>
        </div>

        {/* Ask AI button */}
        <div
          onClick={(e) => { e.stopPropagation(); onAsk(task); }}
          role="button"
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/15"
        >
          <Image src="/ai-logo.png" alt="AI" width={14} height={14} className="opacity-80" />
          Ask AI
        </div>

        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expandable dropdown content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-3">
              {/* Description */}
              {task.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
              )}

              {/* Completion banner */}
              {completionAnalysis && (
                <div className="rounded-lg bg-score-excellent/5 border border-score-excellent/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-score-excellent" />
                    <span className="text-xs font-semibold text-score-excellent">Task Completed!</span>
                  </div>
                  {completionAnalysis === 'generating' ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analyzing impact...
                    </div>
                  ) : (
                    <div className={cn("text-xs text-foreground leading-relaxed prose prose-sm max-w-none [&>p]:text-xs", theme === 'dark' ? 'prose-invert' : '')}>
                      <ReactMarkdown>{completionAnalysis}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* AI Guidance + Steps — side by side on desktop */}
              <div className={cn('grid gap-3', steps.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
                {/* AI Guidance */}
                <div className="rounded-lg bg-muted/20 border border-border/40 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-0.5 h-3.5 bg-primary rounded-full" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">How to Approach This</span>
                    {isLoadingGuidance && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  </div>
                  {guidance ? (
                    <div className={cn(
                      "prose prose-sm max-w-none text-muted-foreground text-xs",
                      "[&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>p]:text-xs [&>ul]:mb-1.5 [&>ol]:mb-1.5 [&>ul>li]:text-xs [&>ol>li]:text-xs [&>strong]:text-foreground",
                      theme === 'dark' ? 'prose-invert' : ''
                    )}>
                      <ReactMarkdown>{guidance}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating guidance...
                    </div>
                  )}
                </div>

                {/* Sub-steps checklist */}
                {steps.length > 0 && (
                  <div className="rounded-lg bg-muted/20 border border-border/40 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-0.5 h-3.5 bg-score-excellent rounded-full" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Steps</span>
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

              {/* Actions */}
              {task.status !== 'done' && !completionAnalysis && (
                <div className="space-y-2 pt-1">
                  {/* Proof status */}
                  {!proofUploaded && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-600 dark:text-amber-400">
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1">Upload proof or evidence to mark complete</span>
                      <button
                        onClick={handleMarkProofDone}
                        className="text-[10px] font-semibold underline hover:no-underline shrink-0"
                      >
                        I have proof
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onAsk(task)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold bg-muted/50 border border-border/50 text-foreground hover:bg-muted transition-colors"
                    >
                      <Image src="/ai-logo.png" alt="Frictionless" width={14} height={14} className="opacity-80" />
                      Chat with AI
                    </button>
                    <button
                      onClick={handleMarkComplete}
                      disabled={isCompleting}
                      className={cn(
                        'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors',
                        isCompleting
                          ? 'bg-score-excellent/50 text-white cursor-not-allowed'
                          : proofUploaded
                            ? 'bg-score-excellent text-white hover:bg-score-excellent/90'
                            : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15'
                      )}
                    >
                      {isCompleting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Completing...</>
                      ) : proofUploaded ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete</>
                      ) : (
                        <><Upload className="w-3.5 h-3.5" /> Submit Proof</>
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
