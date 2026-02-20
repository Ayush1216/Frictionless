'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AskButton } from '@/components/ui/AskButton';
import { ReadinessTaskCard } from './ReadinessTaskCard';
import type { Task, TaskGroup } from '@/types/database';

interface RecommendedActionsSectionProps {
  tasks: Task[];
  taskGroups: TaskGroup[];
  filterCategory: string;
  onFilterChange: (category: string) => void;
  onAskTask: (task: Task) => void;
  completedCount: number;
  onAskAI?: (prompt: string) => void;
  aiDescriptions?: Record<string, string>;
  aiDescriptionsLoading?: boolean;
}

export function RecommendedActionsSection({
  tasks,
  taskGroups,
  filterCategory,
  onFilterChange,
  onAskTask,
  completedCount,
  onAskAI,
  aiDescriptions,
  aiDescriptionsLoading,
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
    return cats;
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

  // Sort by priority then potential_points
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

  // Auto-expand first task when the currently expanded task disappears
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
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--fi-primary)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
              Recommended actions to improve your Frictionless
            </h2>
          </div>
          <AskButton onClick={() => onAskAI?.(`Analyze my recommended Frictionless tasks and help me prioritize. I have ${tasks.length} tasks with ${completedCount} completed. Which tasks should I focus on first for maximum impact on my fundraising Frictionless?`)} size="sm" variant="outline" />
        </div>
        <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
          Informed by experienced founders, operators, and investors — with AI guidance on every task.
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--fi-text-primary)' }}>
            <span style={{ color: 'var(--fi-score-excellent)' }}>{completedCount}</span>
            {' '}of {totalTasks} tasks completed
          </span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--fi-bg-tertiary)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--fi-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--fi-text-muted)' }}>
            {progressPct}%
          </span>
        </div>
      </motion.div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1">
        <button
          onClick={() => onFilterChange('all')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors"
          style={{
            background: filterCategory === 'all' ? 'rgba(16,185,129,0.1)' : 'var(--fi-bg-secondary)',
            color: filterCategory === 'all' ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
            border: `1px solid ${filterCategory === 'all' ? 'var(--fi-primary)' : 'var(--fi-border)'}`,
          }}
        >
          All
          <span className="tabular-nums">{totalTasks - completedCount}</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onFilterChange(cat.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors"
            style={{
              background: filterCategory === cat.key ? 'rgba(16,185,129,0.1)' : 'var(--fi-bg-secondary)',
              color: filterCategory === cat.key ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
              border: `1px solid ${filterCategory === cat.key ? 'var(--fi-primary)' : 'var(--fi-border)'}`,
            }}
          >
            {cat.label}
            <span className="tabular-nums">{cat.count}</span>
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div className="space-y-2 relative">
        {/* Click-outside overlay to close expanded task */}
        {expandedTaskId && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setExpandedTaskId(null)}
          />
        )}
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const hasExpanded = !!expandedTaskId;
            return (
              <div
                key={task.id}
                className="transition-all duration-300"
                style={{
                  opacity: hasExpanded && !isExpanded ? 0.35 : 1,
                  filter: hasExpanded && !isExpanded ? 'blur(1px)' : 'none',
                  position: 'relative',
                  zIndex: isExpanded ? 20 : 1,
                }}
                onClick={hasExpanded && !isExpanded ? () => setExpandedTaskId(null) : undefined}
              >
                <ReadinessTaskCard
                  task={task}
                  categoryName={getCategoryForTask(task)}
                  onAsk={onAskTask}
                  isExpanded={isExpanded}
                  onToggleExpand={handleToggleExpand}
                  aiDescription={aiDescriptions?.[task.id]}
                  aiDescriptionLoading={aiDescriptionsLoading && !aiDescriptions?.[task.id]}
                />
              </div>
            );
          })
        ) : (
          <div className="fi-card p-8 text-center">
            <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
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
