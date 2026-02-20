'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { featureFlags } from '@/lib/feature-flags';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  CheckCircle2,
  Plus,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { CompletedTasksSection } from '@/components/tasks/CompletedTasksSection';
import { TaskSimulator } from '@/components/tasks/TaskSimulator';
import { useTaskStore } from '@/stores/task-store';
import { TasksSyncProvider } from '@/contexts/TasksSyncContext';
import { fetchBootstrap } from '@/lib/api/bootstrap';
import { supabase } from '@/lib/supabase/client';
import type { Task, TaskGroup, TaskStatus, TaskPriority } from '@/types/database';

export default function TasksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Redirect to Frictionless tasks tab when enabled (backward compat)
  useEffect(() => {
    if (featureFlags.focusMode) {
      const taskId = searchParams.get('task');
      router.replace(`/startup/readiness?tab=tasks${taskId ? `&task=${taskId}` : ''}`);
    }
  }, [router, searchParams]);
  const {
    tasks,
    taskGroups,
    taskProgress,
    tasksLoaded,
    viewMode,
    selectedTask,
    setViewMode,
    selectTask,
  } = useTaskStore();

  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>(() =>
    (searchParams.get('status') as TaskStatus | null) || 'all'
  );
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>(() =>
    (searchParams.get('priority') as TaskPriority | null) || 'all'
  );
  const [filterCategory, setFilterCategory] = useState<string>(() =>
    searchParams.get('category') || 'all'
  );
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);

  // Sync filters to URL for sharable views — merge current filter state with updates
  const updateUrlFilters = (updates: { status?: string; priority?: string; category?: string; q?: string }) => {
    const current = {
      status: filterStatus,
      priority: filterPriority,
      category: filterCategory,
      q: searchQuery,
    };
    const merged = { ...current, ...updates };
    const params = new URLSearchParams();
    (['status', 'priority', 'category', 'q'] as const).forEach((key) => {
      const v = merged[key as keyof typeof merged];
      if (v && v !== 'all' && v !== '') params.set(key, String(v));
    });
    const qs = params.toString();
    router.replace(`/startup/tasks${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  // Tasks come from layout bootstrap. If store not populated yet (e.g. direct nav or refresh), fetch once.
  useEffect(() => {
    if (tasksLoaded) return;
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token ?? null;
      if (!token || cancelled) return;
      try {
        await fetchBootstrap(token);
      } catch {
        useTaskStore.getState().setTasksLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [tasksLoaded]);

  const loading = !tasksLoaded;

  // When the selected task is completed, clear selection so the detail panel closes (task is removed from view)
  useEffect(() => {
    if (selectedTask?.status === 'done') {
      selectTask(null);
    }
  }, [selectedTask?.id, selectedTask?.status, selectTask]);

  // Open task from dashboard link: /startup/tasks?task=<id>
  useEffect(() => {
    if (!tasksLoaded || !tasks.length) return;
    const taskId = searchParams.get('task');
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      selectTask(task);
      router.replace('/startup/tasks', { scroll: false });
    }
  }, [tasksLoaded, tasks, searchParams, selectTask, router]);

  // Prefer allotted progress from backend (initial pending only); else derive from groups + tasks
  const stats = useMemo(() => {
    if (
      taskProgress &&
      typeof taskProgress.allotted_total === 'number' &&
      taskProgress.allotted_total > 0 &&
      typeof taskProgress.current_pending === 'number'
    ) {
      const total = taskProgress.allotted_total;
      const done = Math.max(0, total - taskProgress.current_pending);
      const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
      return { done, total, pct };
    }
    const done = taskGroups.reduce((s, g) => s + (g.done_count ?? 0), 0);
    const pending = tasks.length;
    const total = pending + done;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct };
  }, [taskProgress, taskGroups, tasks]);

  const handleTaskClick = (task: Task) => {
    selectTask(task);
  };

  const handleRefresh = async () => {
    useTaskStore.getState().setTasksLoaded(false);
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token ?? null;
    if (token) {
      try {
        await fetchBootstrap(token, true); // force=true to bypass cooldown
      } catch {
        useTaskStore.getState().setTasksLoaded(true);
      }
    } else {
      useTaskStore.getState().setTasksLoaded(true);
    }
  };

  const categories = taskGroups.map((g) => ({
    id: g.id,
    label: g.category,
  }));

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      </div>
    );
  }

  return (
    <TasksSyncProvider>
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
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Refresh tasks"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {/* View toggle */}
            <div className="flex items-center rounded-lg bg-muted border border-border p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-glow">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Task</span>
            </button>
          </div>
        }
      />

      {/* Simulator (E3) */}
      <TaskSimulator />

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
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-score-excellent"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => {
              const v = e.target.value;
              setSearchQuery(v);
              updateUrlFilters({ q: v || undefined });
            }}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Filter toggles */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border flex-shrink-0',
              showFilters
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-muted text-muted-foreground border-border hover:text-foreground'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>

          {/* Status chips */}
          {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                updateUrlFilters({ status: status === 'all' ? undefined : status });
              }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border flex-shrink-0',
                filterStatus === status
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-muted/30 text-muted-foreground border-border hover:text-foreground'
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
            <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-muted/30 border border-border">
              {/* Priority filter */}
              <div>
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 block">
                  Priority
                </label>
                <div className="flex gap-1.5">
                  {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setFilterPriority(p);
                        updateUrlFilters({ priority: p === 'all' ? undefined : p });
                      }}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border',
                        filterPriority === p
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
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
                    onClick={() => {
                      setFilterCategory('all');
                      updateUrlFilters({ category: undefined });
                    }}
                    className={cn(
                      'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border',
                      filterCategory === 'all'
? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-muted/30 text-muted-foreground border-border hover:text-foreground'
                    )}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setFilterCategory(cat.id);
                        updateUrlFilters({ category: cat.id });
                      }}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors border',
                        filterCategory === cat.id
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
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
            <TaskBoard
              onTaskClick={handleTaskClick}
              filterStatus={filterStatus}
              filterPriority={filterPriority}
              filterCategory={filterCategory}
              searchQuery={searchQuery}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <TaskList
              onTaskClick={handleTaskClick}
              filterStatus={filterStatus}
              filterPriority={filterPriority}
              filterCategory={filterCategory}
              searchQuery={searchQuery}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed tasks section (E5) */}
      <CompletedTasksSection onTaskClick={handleTaskClick} />

      {/* Task detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        onClose={() => selectTask(null)}
      />
      </div>
    </TasksSyncProvider>
  );
}
