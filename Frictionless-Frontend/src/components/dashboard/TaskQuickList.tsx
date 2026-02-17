'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { TaskGroup } from '@/types/database';

interface TaskQuickListProps {
  taskGroups: TaskGroup[];
  maxItems?: number;
  className?: string;
}

// Standardized across dashboard: red = high/critical, yellow/orange = medium, green = low
const priorityConfig: Record<string, { icon: React.ReactNode; style: string }> = {
  critical: {
    icon: <AlertCircle className="w-3 h-3" />,
    style: 'text-score-poor bg-score-poor/15',
  },
  high: {
    icon: <AlertCircle className="w-3 h-3" />,
    style: 'text-score-poor bg-score-poor/15',
  },
  medium: {
    icon: <Clock className="w-3 h-3" />,
    style: 'text-score-fair bg-score-fair/15',
  },
  low: {
    icon: <Clock className="w-3 h-3" />,
    style: 'text-score-excellent bg-score-excellent/15',
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
  // Flatten all tasks, filter to in-progress only, sort by priority
  const allTasks = taskGroups.flatMap((g) => g.tasks);
  const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress');
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...inProgressTasks].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
  );
  const displayTasks = sorted.slice(0, maxItems);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className={cn('glass-card p-6', className)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-body font-medium text-muted-foreground">
          Active Tasks
        </h3>
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
            const priority = priorityConfig[task.priority] ?? priorityConfig.medium;
            const dueText = formatDueDate(task.due_date);
            return (
              <Link key={task.id} href={`/startup/tasks?task=${encodeURIComponent(task.id)}`}>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg transition-colors bg-obsidian-700/30 hover:bg-obsidian-700/50 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground block truncate">
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
              </Link>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
