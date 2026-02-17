'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '@/stores/task-store';
import { useTasksSync } from '@/contexts/TasksSyncContext';
import type { Task, TaskStatus } from '@/types/database';

interface Column {
  id: TaskStatus;
  label: string;
  color: string;
  dotColor: string;
}

const columns: Column[] = [
  { id: 'todo', label: 'To Do', color: 'border-obsidian-600/60', dotColor: 'bg-obsidian-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-electric-blue/30', dotColor: 'bg-electric-blue' },
  { id: 'done', label: 'Done', color: 'border-score-excellent/30', dotColor: 'bg-score-excellent' },
];

const nextStatus: Record<string, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

interface TaskBoardProps {
  onTaskClick: (task: Task) => void;
  className?: string;
}

export function TaskBoard({ onTaskClick, className }: TaskBoardProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const taskGroups = useTaskStore((s) => s.taskGroups);
  const storeUpdateTask = useTaskStore((s) => s.updateTask);
  const sync = useTasksSync();
  const updateTask = sync?.updateTask ?? storeUpdateTask;

  // Priority order for sorting: critical, high, medium, low
  const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  // Group tasks by status; exclude trash and done. Sort by impact/priority within each column.
  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks
      .filter((t) => t.status !== 'trash' && t.status !== 'done')
      .forEach((t) => {
        if (map[t.status]) map[t.status].push(t);
      });
    (['todo', 'in_progress', 'done'] as const).forEach((status) => {
      map[status].sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
      );
    });
    return map;
  }, [tasks]);

  // Get category name for a task
  const getCategoryForTask = (task: Task) => {
    const group = taskGroups.find((g) => g.id === task.task_group_id);
    return group?.category;
  };

  const handleMoveTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const ns = nextStatus[task.status];
    if (ns) updateTask(task.id, { status: ns });
  };

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      {columns.map((col) => (
        <div key={col.id} className="flex flex-col">
          {/* Column header */}
          <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-xl bg-obsidian-800/50 border mb-3', col.color)}>
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', col.dotColor)} />
              <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
              <span className="text-xs text-muted-foreground bg-obsidian-700/50 px-1.5 py-0.5 rounded-full font-medium">
                {grouped[col.id]?.length ?? 0}
              </span>
            </div>
            <button className="p-1 rounded-md hover:bg-obsidian-700 text-obsidian-400 hover:text-foreground transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Cards */}
          <div className="flex-1 space-y-3 min-h-[200px]">
            <AnimatePresence initial={false}>
              {grouped[col.id]?.map((task) => (
                <div key={task.id} className="group relative">
                  <TaskCard
                    task={task}
                    category={getCategoryForTask(task)}
                    onClick={() => onTaskClick(task)}
                  />
                  {/* Quick move only to in_progress (not to done – completion must go through AI chat) */}
                  {col.id === 'todo' && nextStatus[task.status] === 'in_progress' && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={(e) => handleMoveTask(task, e)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-obsidian-700/90 border border-obsidian-600/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                      title="Move to In Progress"
                    >
                      &rarr;
                    </motion.button>
                  )}
                </div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
