'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
  RefreshCw,
  Flame,
  ArrowUp,
  ArrowRight as ArrowRightIcon,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusChip } from '@/components/shared/StatusChip';
import { useTaskStore } from '@/stores/task-store';
import type { Task, TaskGroup } from '@/types/database';
import { format, isPast, parseISO } from 'date-fns';
import { useSwipeable } from 'react-swipeable';

const priorityConfig: Record<string, { color: string; icon: React.ElementType }> = {
  critical: { color: 'text-red-400', icon: Flame },
  high: { color: 'text-orange-400', icon: ArrowUp },
  medium: { color: 'text-yellow-400', icon: ArrowRightIcon },
  low: { color: 'text-green-400', icon: ArrowDown },
};

interface TaskListProps {
  onTaskClick: (task: Task) => void;
  className?: string;
}

export function TaskList({ onTaskClick, className }: TaskListProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const taskGroups = useTaskStore((s) => s.taskGroups);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Group tasks by taskGroup category (use stored taskGroups for ordering)
  const groupedTasks = useMemo(() => {
    const groupMap = new Map<string, { group: TaskGroup; tasks: Task[] }>();
    taskGroups.forEach((g) => {
      const groupTasks = tasks.filter(
        (t) => t.task_group_id === g.id && t.status !== 'trash'
      );
      if (groupTasks.length > 0) {
        groupMap.set(g.id, { group: g, tasks: groupTasks });
      }
    });
    return Array.from(groupMap.values());
  }, [tasks, taskGroups]);

  const toggleCollapse = (groupId: string) => {
    setCollapsed((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className={cn('space-y-4', className)}>
      {groupedTasks.map(({ group, tasks: groupTasks }) => {
        const isCollapsed = collapsed[group.id] ?? false;
        const doneCount = groupTasks.filter((t) => t.status === 'done').length;

        return (
          <div key={group.id}>
            {/* Group header */}
            <button
              onClick={() => toggleCollapse(group.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-obsidian-800/40 transition-colors group/header"
            >
              <motion.div animate={{ rotate: isCollapsed ? 0 : 90 }} transition={{ duration: 0.15 }}>
                <ChevronRight className="w-4 h-4 text-obsidian-400" />
              </motion.div>
              <span className="text-sm font-semibold text-foreground">{group.category}</span>
              <span className="text-xs text-muted-foreground">
                {doneCount}/{groupTasks.length}
              </span>
              {/* Mini progress */}
              <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-obsidian-700/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-score-excellent transition-all duration-500"
                  style={{ width: `${(doneCount / groupTasks.length) * 100}%` }}
                />
              </div>
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                group.impact === 'high' ? 'bg-orange-500/15 text-orange-400' :
                group.impact === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                'bg-green-500/15 text-green-400'
              )}>
                {group.impact} impact
              </span>
            </button>

            {/* Tasks */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-3 border-l border-obsidian-700/40 pl-4 space-y-1 py-1">
                    {groupTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onTaskClick={onTaskClick}
                        onComplete={() =>
                          updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
                        }
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({
  task,
  onTaskClick,
  onComplete,
  onDelete,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const priority = priorityConfig[task.priority];
  const PriorityIcon = priority?.icon ?? ArrowRightIcon;
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  const isAI = task.completion_source === 'ai_file_upload' || task.completion_source === 'ai_chat';

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      setSwipeOffset(0);
      onDelete();
    },
    onSwipedRight: () => {
      setSwipeOffset(0);
      onComplete();
    },
    onSwiping: (e) => setSwipeOffset(e.deltaX),
    onTouchEndOrOnMouseUp: () => setSwipeOffset(0),
    trackMouse: false,
    trackTouch: true,
    delta: 50,
  });

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe backgrounds */}
      <div className="absolute inset-0 flex">
        <div className={cn(
          'flex-1 flex items-center pl-4 bg-score-excellent/20 transition-opacity',
          swipeOffset > 30 ? 'opacity-100' : 'opacity-0'
        )}>
          <CheckCircle2 className="w-5 h-5 text-score-excellent" />
        </div>
        <div className={cn(
          'flex-1 flex items-center justify-end pr-4 bg-destructive/20 transition-opacity',
          swipeOffset < -30 ? 'opacity-100' : 'opacity-0'
        )}>
          <Trash2 className="w-5 h-5 text-destructive" />
        </div>
      </div>

      <motion.div
        {...handlers}
        style={{ x: swipeOffset * 0.3 }}
        onClick={() => onTaskClick(task)}
        className={cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
          'hover:bg-obsidian-800/40 bg-obsidian-900/50'
        )}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="flex-shrink-0"
        >
          {task.status === 'done' ? (
            <CheckCircle2 className="w-5 h-5 text-score-excellent" />
          ) : (
            <Circle className="w-5 h-5 text-obsidian-500 hover:text-electric-blue transition-colors" />
          )}
        </button>

        {/* Title */}
        <span className={cn(
          'flex-1 text-sm text-foreground truncate',
          task.status === 'done' && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </span>

        {/* Badges */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {/* Priority */}
          <PriorityIcon className={cn('w-3.5 h-3.5', priority?.color)} />

          {/* Status */}
          <StatusChip status={task.status} />

          {/* AI badge */}
          {isAI && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-electric-purple/15 text-electric-purple border border-electric-purple/30">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          )}

          {/* Rescore */}
          {task.requires_rescore && (
            <RefreshCw className="w-3.5 h-3.5 text-electric-cyan" />
          )}
        </div>

        {/* Due date */}
        {task.due_date && (
          <span className={cn(
            'text-xs flex-shrink-0 hidden sm:inline',
            isOverdue ? 'text-red-400' : 'text-muted-foreground'
          )}>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(parseISO(task.due_date), 'MMM d')}
            </span>
          </span>
        )}
      </motion.div>
    </div>
  );
}
