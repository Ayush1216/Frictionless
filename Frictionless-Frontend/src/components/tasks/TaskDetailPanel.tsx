'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Tag,
  Sparkles,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronLeft,
  FileText,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusChip } from '@/components/shared/StatusChip';
import { TaskAICompletion } from './TaskAICompletion';
import { TaskComments } from './TaskComments';
import { AIExtractionCard } from '@/components/ai/AIExtractionCard';
import { useTaskStore } from '@/stores/task-store';
import { useTasksSync } from '@/contexts/TasksSyncContext';
import { fetchTaskEvents, fetchTaskComments } from '@/lib/api/tasks';
import type { Task, TaskStatus, AIExtraction } from '@/types/database';
import { format, parseISO } from 'date-fns';

// Done is not selectable here – completion must go through AI chat
const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
];

const EVENT_DESCRIPTIONS: Record<string, string> = {
  create: 'Task created',
  update: 'Task updated',
  status_change: 'Status changed',
  complete: 'Task completed',
  reopen: 'Task reopened',
  delete: 'Task deleted',
  restore: 'Task restored',
  reorder: 'Task reordered',
  move_group: 'Moved to another group',
  rescore_requested: 'Rescore requested',
  rescore_completed: 'Rescore completed',
};

// Demo extractions for tasks that have them
const demoExtractions: AIExtraction[] = [
  { field: 'Document Type', value: 'Pitch Deck', confidence: 0.95 },
  { field: 'Page Count', value: 18, confidence: 0.99 },
  { field: 'Last Modified', value: '2025-01-15', confidence: 0.88 },
  { field: 'Contains Financials', value: true, confidence: 0.82 },
];

interface TaskDetailPanelProps {
  task: Task | null;
  onClose: () => void;
}

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sync = useTasksSync();
  const storeUpdateTask = useTaskStore((s) => s.updateTask);
  const updateTask = sync?.updateTask ?? storeUpdateTask;
  const taskGroups = useTaskStore((s) => s.taskGroups);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'comments' | 'history'>('ai');
  const [chatFullPanel, setChatFullPanel] = useState(false);
  const [events, setEvents] = useState<{ id: string; event_type: string; from_state: Record<string, unknown>; to_state: Record<string, unknown>; created_at: string }[]>([]);
  const [comments, setComments] = useState<{ id: string; author: string; content: string; created_at: string }[]>([]);

  const group = taskGroups.find((g) => g.id === task?.task_group_id);

  useEffect(() => {
    setChatFullPanel(false);
  }, [task?.id]);

  useEffect(() => {
    if (!task?.id) return;
    let cancelled = false;
    (async () => {
      const [evRes, cmtRes] = await Promise.all([
        fetchTaskEvents(task.id),
        fetchTaskComments(task.id),
      ]);
      if (!cancelled) {
        setEvents(evRes.events ?? []);
        setComments(cmtRes.comments ?? []);
      }
    })();
    return () => { cancelled = true; };
  }, [task?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const refreshEvents = useCallback(() => {
    if (!task?.id) return;
    fetchTaskEvents(task.id).then((r) => setEvents(r.events ?? []));
  }, [task?.id]);

  const handleStatusChange = (status: TaskStatus) => {
    if (task) {
      updateTask(task.id, { status });
      setShowStatusDropdown(false);
      setTimeout(refreshEvents, 500);
    }
  };

  const hasExtractions = task?.status === 'done' && task?.completion_source === 'ai_file_upload';

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed z-50 right-0 top-0 flex flex-col',
              'border-l',
              // Use dvh so panel stays above browser/OS UI (e.g. taskbar)
              'h-dvh max-h-dvh',
              // Desktop: 40% width, Mobile: full screen
              'w-full sm:w-[480px] lg:w-[40%]'
            )}
            style={{ background: 'var(--fi-bg-card)', borderColor: 'var(--fi-border)' }}
          >
            {chatFullPanel ? (
              <>
                <div className="flex items-center justify-between flex-shrink-0 px-4 py-3" style={{ borderBottom: '1px solid var(--fi-border)' }}>
                  <button
                    onClick={() => setChatFullPanel(false)}
                    className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: 'var(--fi-text-primary)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <span className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>Chat with AI</span>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--fi-text-muted)' }}
                    title="Close panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col pb-[max(env(safe-area-inset-bottom,0px),2rem)]">
                  <TaskAICompletion
                    taskId={task.id}
                    chatFullPanel
                    onExitFullPanel={() => setChatFullPanel(false)}
                  />
                </div>
              </>
            ) : (
            <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-display font-bold" style={{ color: 'var(--fi-text-primary)' }}>
                    {task.title}
                  </h2>
                  <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--fi-text-muted)' }}>
                    {task.description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors flex-shrink-0"
                  style={{ color: 'var(--fi-text-muted)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta grid: fixed order for all tasks (Status, Impact, Due Date, Category) */}
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: '1fr 1fr', gridTemplateAreas: '"status impact" "due-date category"' }}
              >
                <div className="relative" style={{ gridArea: 'status' }}>
                  <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fi-text-muted)' }}>
                    Status
                  </label>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-colors"
                    style={{ background: 'var(--fi-bg-tertiary)', border: '1px solid var(--fi-border)' }}
                  >
                    <StatusChip status={task.status} />
                    <ChevronDown className="w-3.5 h-3.5 ml-auto" style={{ color: 'var(--fi-text-muted)' }} />
                  </button>
                  {showStatusDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 mt-1 w-full rounded-lg shadow-xl z-10 overflow-hidden"
                      style={{ background: 'var(--fi-bg-tertiary)', border: '1px solid var(--fi-border)' }}
                    >
                      {statusOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleStatusChange(opt.value)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                          style={{
                            background: task.status === opt.value ? 'var(--fi-bg-secondary)' : 'transparent',
                          }}
                        >
                          <StatusChip status={opt.value} />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                <div style={{ gridArea: 'impact' }}>
                  <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fi-text-muted)' }}>
                    Impact
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--fi-bg-tertiary)', border: '1px solid var(--fi-border)' }}>
                    <span
                      className="text-sm font-medium capitalize"
                      style={{
                        color: (task.priority === 'critical' || task.priority === 'high') ? 'var(--fi-score-need-improvement)' :
                          task.priority === 'medium' ? 'var(--fi-score-good)' :
                          task.priority === 'low' ? 'var(--fi-score-excellent)' :
                          'var(--fi-text-muted)',
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>

                <div style={{ gridArea: 'due-date' }}>
                  <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fi-text-muted)' }}>
                    Due Date
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--fi-bg-tertiary)', border: '1px solid var(--fi-border)' }}>
                    <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--fi-text-muted)' }} />
                    <span style={{ color: 'var(--fi-text-primary)' }}>
                      {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : 'None'}
                    </span>
                  </div>
                </div>

                <div style={{ gridArea: 'category' }}>
                  <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--fi-text-muted)' }}>
                    Category
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--fi-bg-tertiary)', border: '1px solid var(--fi-border)' }}>
                    <Tag className="w-3.5 h-3.5" style={{ color: 'var(--fi-text-muted)' }} />
                    <span className="truncate" style={{ color: 'var(--fi-text-primary)' }}>{group?.category ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Potential points */}
              {typeof task.potential_points === 'number' && task.potential_points > 0 && task.status !== 'done' && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--fi-score-excellent-bg)', color: 'var(--fi-score-excellent)', border: '1px solid color-mix(in srgb, var(--fi-score-excellent) 20%, transparent)' }}
                >
                  <span>+{task.potential_points} pts</span>
                  <span className="text-xs font-normal" style={{ color: 'var(--fi-text-muted)' }}>if completed</span>
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {task.requires_rescore && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: 'var(--fi-score-good-bg)', color: 'var(--fi-score-good)', border: '1px solid color-mix(in srgb, var(--fi-score-good) 20%, transparent)' }}>
                    <RefreshCw className="w-3 h-3" />
                    Requires Rescore
                  </span>
                )}
                {task.completion_source && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: 'color-mix(in srgb, var(--fi-primary) 10%, transparent)', color: 'var(--fi-primary)', border: '1px solid color-mix(in srgb, var(--fi-primary) 20%, transparent)' }}>
                    <Sparkles className="w-3 h-3" />
                    {task.completion_source === 'ai_file_upload' ? 'AI File Upload' :
                     task.completion_source === 'ai_chat' ? 'AI Chat' : 'Manual'}
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex" style={{ borderBottom: '1px solid var(--fi-border)' }}>
                {[
                  { id: 'ai' as const, label: 'AI Completion', icon: Sparkles },
                  { id: 'comments' as const, label: 'Comments', icon: MessageSquare },
                  { id: 'history' as const, label: 'History', icon: Activity },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px"
                    style={{
                      borderColor: activeTab === tab.id ? 'var(--fi-primary)' : 'transparent',
                      color: activeTab === tab.id ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'ai' && (
                  <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {hasExtractions ? (
                      <div className="space-y-4">
                        <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>AI analysis results from file upload:</p>
                        <AIExtractionCard
                          extractions={demoExtractions}
                          onAcceptAll={() => {}}
                          onEdit={() => {}}
                          onReject={() => {}}
                        />
                      </div>
                    ) : task.status !== 'done' ? (
                      <TaskAICompletion
                        taskId={task.id}
                        onChatFullPanel={() => setChatFullPanel(true)}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--fi-text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>Task is already complete</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'comments' && (
                  <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <TaskComments
                      taskId={task.id}
                      comments={comments}
                      onCommentAdded={(c) => setComments((prev) => [...prev, c])}
                    />
                  </motion.div>
                )}

                {activeTab === 'history' && (
                  <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--fi-text-primary)' }}>Activity Timeline</h4>
                    <div className="space-y-3">
                      {events.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>No activity yet</p>
                      ) : (
                        events.map((event) => {
                          const desc = EVENT_DESCRIPTIONS[event.event_type] ?? event.event_type;
                          const statusChange = event.event_type === 'status_change' || event.event_type === 'complete';
                          const detail = statusChange && event.from_state?.status && event.to_state?.status
                            ? ` (${event.from_state.status} → ${event.to_state.status})`
                            : '';
                          return (
                            <div key={event.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full mt-2" style={{ background: 'var(--fi-primary)' }} />
                                <div className="flex-1 w-px mt-1" style={{ background: 'var(--fi-border)' }} />
                              </div>
                              <div className="pb-4">
                                <p className="text-sm" style={{ color: 'var(--fi-text-primary)' }}>{desc}{detail}</p>
                                <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--fi-text-muted)' }}>
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(event.created_at), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
