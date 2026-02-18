'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReadinessTaskCard } from './ReadinessTaskCard';
import type { Task, TaskGroup } from '@/types/database';

interface RecommendedActionsSectionProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
  filterCategory: string;
  onFilterChange: (category: string) => void;
  onAskTask: (task: Task) => void;
  completedCount: number;
}

export function RecommendedActionsSection({
  tasks,
  taskGroups,
  filterCategory,
  onFilterChange,
  onAskTask,
  completedCount,
}: RecommendedActionsSectionProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Build category -> tasks mapping from task groups
  const categoryMap = useMemo(() => {
    const map = new Map<string, { tasks: Task[]; categoryName: string }>();
    for (const group of taskGroups) {
      const groupTasks = tasks.filter((t) => t.task_group_id === group.id);
      if (groupTasks.length > 0) {
        const existing = map.get(group.category);
        if (existing) {
          existing.tasks.push(...groupTasks);
        } else {
          map.set(group.category, { tasks: groupTasks, categoryName: group.category });
        }
      }
    }
    // Include ungrouped tasks
    const groupedIds = new Set(taskGroups.flatMap((g) => g.tasks.map((t) => t.id)));
    const ungrouped = tasks.filter((t) => !groupedIds.has(t.id));
    if (ungrouped.length > 0) {
      const existing = map.get('Other');
      if (existing) {
        existing.tasks.push(...ungrouped);
      } else {
        map.set('Other', { tasks: ungrouped, categoryName: 'Other' });
      }
    }
    return map;
  }, [tasks, taskGroups]);

  // Unique category names for filter chips
  const categories = useMemo(() => {
    const cats: { key: string; label: string; count: number }[] = [];
    categoryMap.forEach((value, key) => {
      cats.push({ key, label: key, count: value.tasks.length });
    });
    return cats.sort((a, b) => b.count - a.count);
  }, [categoryMap]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (filterCategory === 'all') return tasks;
    const entry = categoryMap.get(filterCategory);
    return entry?.tasks ?? [];
  }, [filterCategory, tasks, categoryMap]);

  // Get category name for a task
  const getCategoryForTask = (task: Task): string => {
    const group = taskGroups.find((g) => g.id === task.task_group_id);
    return group?.category ?? 'Other';
  };

  // Sort by priority: critical > high > medium > low, then by potential_points
  const sortedTasks = useMemo(() => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...filteredTasks].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 3;
      const pb = priorityOrder[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return (b.potential_points ?? 0) - (a.potential_points ?? 0);
    });
  }, [filteredTasks]);

  const totalTasks = tasks.length + completedCount;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Auto-expand first task when the currently expanded task disappears (completed)
  useEffect(() => {
    if (expandedTaskId && !sortedTasks.some((t) => t.id === expandedTaskId)) {
      setExpandedTaskId(sortedTasks[0]?.id ?? null);
    }
  }, [sortedTasks, expandedTaskId]);

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => prev === taskId ? null : taskId);
  };

  return (
    <div id="recommended-actions">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-base font-display font-semibold text-foreground">
            Recommended Actions
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Informed by founders, operators, investors — with AI guidance
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm font-medium text-foreground tabular-nums">
            {completedCount} of {totalTasks} tasks
          </span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-score-excellent"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">{progressPct}%</span>
        </div>
      </motion.div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1">
        <button
          onClick={() => onFilterChange('all')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors shrink-0',
            filterCategory === 'all'
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-muted/30 text-muted-foreground border-border hover:text-foreground'
          )}
        >
          All {totalTasks - completedCount}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onFilterChange(cat.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors shrink-0',
              filterCategory === cat.key
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted/30 text-muted-foreground border-border hover:text-foreground'
            )}
          >
            {cat.label} {cat.count}
          </button>
        ))}
      </div>

      {/* Task cards — single column, blur non-expanded */}
      <div className="space-y-2">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const hasExpanded = !!expandedTaskId;
            return (
              <div
                key={task.id}
                className={cn(
                  'transition-all duration-300',
                  hasExpanded && !isExpanded && 'opacity-30 blur-[1px] pointer-events-none'
                )}
              >
                <ReadinessTaskCard
                  task={task}
                  categoryName={getCategoryForTask(task)}
                  onAsk={onAskTask}
                  isExpanded={isExpanded}
                  onToggleExpand={handleToggleExpand}
                />
              </div>
            );
          })
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-xs text-muted-foreground">
              {filterCategory === 'all'
                ? 'No tasks available. Run an assessment to generate tasks.'
                : `No tasks in "${filterCategory}".`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
