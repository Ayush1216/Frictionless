'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/stores/task-store';
import type { Task } from '@/types/database';
import { format, parseISO } from 'date-fns';

interface CompletedTasksSectionProps {
  onTaskClick?: (task: Task) => void;
  className?: string;
}

export function CompletedTasksSection({ onTaskClick, className }: CompletedTasksSectionProps) {
  const completedTasks = useTaskStore((s) => s.completedTasks);
  const taskGroups = useTaskStore((s) => s.taskGroups);
  const selectTask = useTaskStore((s) => s.selectTask);
  const [expanded, setExpanded] = useState(false);

  const handleTaskClick = (task: Task) => {
    selectTask(task);
    onTaskClick?.(task);
  };

  const getCategoryForTask = (task: Task) => {
    const group = taskGroups.find((g) => g.id === task.task_group_id);
    return group?.category ?? '';
  };

  const totalPoints = useMemo(
    () => completedTasks.reduce((s, t) => s + (t.potential_points ?? 0), 0),
    [completedTasks]
  );

  const sortedByDate = useMemo(
    () =>
      [...completedTasks].sort((a, b) => {
        const aTime = a.completed_at || a.updated_at;
        const bTime = b.completed_at || b.updated_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }),
    [completedTasks]
  );

  const displayTasks = expanded ? sortedByDate : sortedByDate.slice(0, 5);

  if (completedTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      <div className="fi-card p-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--fi-score-excellent)' }} />
            <h3 className="text-sm font-display font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
              Completed Tasks ({completedTasks.length})
            </h3>
            {totalPoints > 0 && (
              <span className="text-xs font-medium" style={{ color: 'var(--fi-text-muted)' }}>
                +{totalPoints} pts earned
              </span>
            )}
          </div>
          {completedTasks.length > 5 && (
            <span className="p-1 rounded hover:bg-muted text-muted-foreground">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          )}
        </button>

        <div className="mt-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {displayTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => handleTaskClick(task)}
                className={cn(
                  'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg',
                  'bg-muted border border-border',
                  'cursor-pointer hover:bg-muted hover:border-border transition-colors'
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {getCategoryForTask(task) && (
                      <span className="truncate">{getCategoryForTask(task)}</span>
                    )}
                    {(task.completed_at || task.updated_at) && (
                      <span>
                        {format(parseISO(task.completed_at || task.updated_at || ''), 'MMM d')}
                      </span>
                    )}
                    {typeof task.potential_points === 'number' && task.potential_points > 0 && (
                      <span className="text-score-excellent font-medium">+{task.potential_points} pts</span>
                    )}
                  </div>
                  {task.submitted_value && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                      {task.submitted_value}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="w-4 h-4 text-score-excellent flex-shrink-0" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
