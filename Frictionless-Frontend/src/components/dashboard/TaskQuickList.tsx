'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { DummyTaskGroup } from '@/lib/dummy-data/tasks';

interface TaskQuickListProps {
  taskGroups: DummyTaskGroup[];
  maxItems?: number;
  className?: string;
}

const priorityConfig: Record<string, { icon: React.ReactNode; style: string }> = {
  critical: {
    icon: <AlertCircle className="w-3 h-3" />,
    style: 'text-score-poor bg-score-poor/15',
  },
  high: {
    icon: <AlertCircle className="w-3 h-3" />,
    style: 'text-score-fair bg-score-fair/15',
  },
  medium: {
    icon: <Clock className="w-3 h-3" />,
    style: 'text-electric-blue bg-electric-blue/15',
  },
  low: {
    icon: <Clock className="w-3 h-3" />,
    style: 'text-obsidian-400 bg-obsidian-600/30',
  },
};

function formatDueDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days}d left`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TaskQuickList({
  taskGroups,
  maxItems = 5,
  className,
}: TaskQuickListProps) {
  // Flatten all tasks, filter to incomplete, sort by priority
  const allTasks = taskGroups.flatMap((g) => g.tasks);
  const incompleteTasks = allTasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  );
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...incompleteTasks].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
  );
  const displayTasks = sorted.slice(0, maxItems);

  // Track completed
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const totalTasks = allTasks.filter((t) => t.status !== 'trash').length;
  const doneTasks = allTasks.filter((t) => t.status === 'done').length + completedIds.size;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  function handleComplete(taskId: string) {
    setCompletedIds((prev) => new Set(prev).add(taskId));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className={cn('glass-card p-6', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-body font-medium text-muted-foreground">
            Active Tasks
          </h3>
          {/* Mini progress ring */}
          <div className="relative w-7 h-7">
            <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 28 28">
              <circle
                cx="14"
                cy="14"
                r="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-obsidian-700/50"
              />
              <circle
                cx="14"
                cy="14"
                r="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 11}
                strokeDashoffset={2 * Math.PI * 11 * (1 - progressPct / 100)}
                strokeLinecap="round"
                className="text-electric-blue"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold text-foreground">
              {progressPct}
            </span>
          </div>
        </div>
        <Link
          href="/startup/tasks"
          className="text-xs font-medium text-electric-blue hover:text-electric-cyan transition-colors flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {displayTasks.map((task, i) => {
            const isCompleted = completedIds.has(task.id);
            const priority = priorityConfig[task.priority] ?? priorityConfig.medium;
            const dueText = formatDueDate(task.due_date);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{
                  opacity: isCompleted ? 0.4 : 1,
                  x: 0,
                }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg transition-colors',
                  isCompleted
                    ? 'bg-obsidian-800/30'
                    : 'bg-obsidian-700/30 hover:bg-obsidian-700/50',
                )}
              >
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={isCompleted}
                  className="shrink-0 touch-target flex items-center justify-center"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-score-excellent" />
                  ) : (
                    <Circle className="w-4.5 h-4.5 text-obsidian-500 hover:text-electric-blue transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'text-sm text-foreground block truncate',
                      isCompleted && 'line-through text-obsidian-400',
                    )}
                  >
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {dueText && (
                    <span
                      className={cn(
                        'text-[10px] font-mono',
                        dueText === 'Overdue' ? 'text-score-poor' : 'text-obsidian-400',
                      )}
                    >
                      {dueText}
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                      priority.style,
                    )}
                  >
                    {priority.icon}
                    <span className="capitalize">{task.priority}</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
