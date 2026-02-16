'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { useTaskStore } from '@/stores/task-store';
import { dummyTaskGroups } from '@/lib/dummy-data/tasks';
import type { Task, TaskGroup, TaskStatus, TaskPriority } from '@/types/database';

export default function TasksPage() {
  const {
    tasks,
    viewMode,
    selectedTask,
    setViewMode,
    selectTask,
  } = useTaskStore();

  const setTasks = useTaskStore((s) => s.setTasks);
  const setTaskGroups = useTaskStore((s) => s.setTaskGroups);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Populate store with dummy data on mount
  useEffect(() => {
    if (tasks.length === 0) {
      const allTasks: Task[] = dummyTaskGroups.flatMap((g) =>
        g.tasks.map((t) => ({
          ...t,
          comments: [],
          events: [],
        }))
      );
      const groups: TaskGroup[] = dummyTaskGroups.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => ({ ...t, comments: [], events: [] })),
      }));
      setTasks(allTasks);
      setTaskGroups(groups);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stats (calculated from all tasks, not filtered)
  const stats = useMemo(() => {
    const nonTrash = tasks.filter((t) => t.status !== 'trash');
    const done = nonTrash.filter((t) => t.status === 'done').length;
    const total = nonTrash.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }, [tasks]);

  const handleTaskClick = (task: Task) => {
    selectTask(task);
  };

  const categories = dummyTaskGroups.map((g) => ({
    id: g.id,
    label: g.category,
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Page header */}
      <PageHeader
        title="Tasks"
        subtitle={`${stats.done}/${stats.total} tasks completed (${stats.pct}%)`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tasks' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg bg-obsidian-800/50 border border-obsidian-700/50 p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-electric-blue/15 text-electric-blue'
                    : 'text-obsidian-400 hover:text-foreground'
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-electric-blue/15 text-electric-blue'
                    : 'text-obsidian-400 hover:text-foreground'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-electric-blue text-white text-sm font-medium hover:bg-electric-blue/90 transition-colors shadow-glow">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Task</span>
            </button>
          </div>
        }
      />

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-score-excellent" />
            <span className="text-sm font-medium text-foreground">
              Overall Progress
            </span>
          </div>
          <span className="text-sm font-bold text-foreground">{stats.pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-obsidian-700/50 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-electric-blue to-score-excellent"
            initial={{ width: 0 }}
            animate={{ width: `${stats.pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
      >
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-obsidian-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-obsidian-800/50 border border-obsidian-700/50 text-sm text-foreground placeholder:text-obsidian-500 focus:outline-none focus:border-electric-blue/50 transition-colors"
          />
        </div>

        {/* Filter toggles */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border flex-shrink-0',
              showFilters
                ? 'bg-electric-blue/10 text-electric-blue border-electric-blue/20'
                : 'bg-obsidian-800/50 text-muted-foreground border-obsidian-700/50 hover:text-foreground'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>

          {/* Status chips */}
          {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border flex-shrink-0',
                filterStatus === status
                  ? 'bg-electric-blue/15 text-electric-blue border-electric-blue/30'
                  : 'bg-obsidian-800/30 text-muted-foreground border-obsidian-700/50 hover:text-foreground'
              )}
            >
              {status === 'all' ? 'All' : status === 'todo' ? 'To Do' : status === 'in_progress' ? 'In Progress' : 'Done'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Expanded filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-obsidian-800/30 border border-obsidian-700/30">
              {/* Priority filter */}
              <div>
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">
                  Priority
                </label>
                <div className="flex gap-1.5">
                  {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFilterPriority(p)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border',
                        filterPriority === p
                          ? 'bg-electric-blue/15 text-electric-blue border-electric-blue/30'
                          : 'bg-obsidian-800/50 text-muted-foreground border-obsidian-700/50 hover:text-foreground'
                      )}
                    >
                      {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category filter */}
              <div>
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={cn(
                      'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border',
                      filterCategory === 'all'
                        ? 'bg-electric-blue/15 text-electric-blue border-electric-blue/30'
                        : 'bg-obsidian-800/50 text-muted-foreground border-obsidian-700/50 hover:text-foreground'
                    )}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border',
                        filterCategory === cat.id
                          ? 'bg-electric-blue/15 text-electric-blue border-electric-blue/30'
                          : 'bg-obsidian-800/50 text-muted-foreground border-obsidian-700/50 hover:text-foreground'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {viewMode === 'kanban' ? (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <TaskBoard onTaskClick={handleTaskClick} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <TaskList onTaskClick={handleTaskClick} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        onClose={() => selectTask(null)}
      />
    </div>
  );
}
