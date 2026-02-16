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

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
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
  const [events, setEvents] = useState<{ id: string; event_type: string; from_state: Record<string, unknown>; to_state: Record<string, unknown>; created_at: string }[]>([]);
  const [comments, setComments] = useState<{ id: string; author: string; content: string; created_at: string }[]>([]);

  const group = taskGroups.find((g) => g.id === task?.task_group_id);

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
              'fixed z-50 right-0 top-0 h-full overflow-y-auto',
              'bg-obsidian-900 border-l border-obsidian-700/50',
              // Desktop: 40% width, Mobile: full screen
              'w-full sm:w-[480px] lg:w-[40%]'
            )}
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    {task.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {task.description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-obsidian-800 text-obsidian-400 hover:text-foreground transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div className="relative">
                  <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">
                    Status
                  </label>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-obsidian-800/50 border border-obsidian-700/50 hover:border-obsidian-600 transition-colors"
                  >
                    <StatusChip status={task.status} />
                    <ChevronDown className="w-3.5 h-3.5 text-obsidian-400 ml-auto" />
                  </button>
                  {showStatusDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 mt-1 w-full bg-obsidian-800 border border-obsidian-700 rounded-lg shadow-xl z-10 overflow-hidden"
                    >
                      {statusOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleStatusChange(opt.value)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-obsidian-700/50 transition-colors',
                            task.status === opt.value && 'bg-obsidian-700/30'
                          )}
                        >
                          <StatusChip status={opt.value} />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">
                    Priority
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-obsidian-800/50 border border-obsidian-700/50">
                    <span className={cn(
                      'text-sm font-medium capitalize',
                      task.priority === 'critical' ? 'text-red-400' :
                      task.priority === 'high' ? 'text-orange-400' :
                      task.priority === 'medium' ? 'text-yellow-400' :
                      'text-green-400'
                    )}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Due date */}
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">
                    Due Date
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-obsidian-800/50 border border-obsidian-700/50 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-obsidian-400" />
                    <span className="text-foreground">
                      {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : 'None'}
                    </span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">
                    Category
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-obsidian-800/50 border border-obsidian-700/50 text-sm">
                    <Tag className="w-3.5 h-3.5 text-obsidian-400" />
                    <span className="text-foreground truncate">{group?.category ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Potential points */}
              {typeof task.potential_points === 'number' && task.potential_points > 0 && task.status !== 'done' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-score-excellent/10 text-score-excellent text-sm font-semibold border border-score-excellent/20">
                  <span>+{task.potential_points} pts</span>
                  <span className="text-xs font-normal text-muted-foreground">if completed</span>
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {task.requires_rescore && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/20">
                    <RefreshCw className="w-3 h-3" />
                    Requires Rescore
                  </span>
                )}
                {task.completion_source && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-electric-purple/10 text-electric-purple border border-electric-purple/20">
                    <Sparkles className="w-3 h-3" />
                    {task.completion_source === 'ai_file_upload' ? 'AI File Upload' :
                     task.completion_source === 'ai_chat' ? 'AI Chat' : 'Manual'}
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-obsidian-700/50">
                {[
                  { id: 'ai' as const, label: 'AI Completion', icon: Sparkles },
                  { id: 'comments' as const, label: 'Comments', icon: MessageSquare },
                  { id: 'history' as const, label: 'History', icon: Activity },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                      activeTab === tab.id
                        ? 'border-electric-blue text-electric-blue'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
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
                        <p className="text-xs text-muted-foreground">AI analysis results from file upload:</p>
                        <AIExtractionCard
                          extractions={demoExtractions}
                          onAcceptAll={() => {}}
                          onEdit={() => {}}
                          onReject={() => {}}
                        />
                      </div>
                    ) : task.status !== 'done' ? (
                      <TaskAICompletion taskId={task.id} />
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 text-obsidian-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Task is already complete</p>
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
                    <h4 className="text-sm font-semibold text-foreground mb-3">Activity Timeline</h4>
                    <div className="space-y-3">
                      {events.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity yet</p>
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
                                <div className="w-2 h-2 rounded-full bg-electric-blue mt-2" />
                                <div className="flex-1 w-px bg-obsidian-700/40 mt-1" />
                              </div>
                              <div className="pb-4">
                                <p className="text-sm text-foreground">{desc}{detail}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
