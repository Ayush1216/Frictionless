'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { updateTask as apiUpdateTask, completeTask } from '@/lib/api/tasks';
import type { Task } from '@/types/database';

type UpdateTaskFn = (id: string, updates: Partial<Task>) => void | Promise<void>;

interface TasksSyncContextValue {
  updateTask: UpdateTaskFn;
  completeTaskViaApi: (taskId: string, submittedValue?: string) => Promise<boolean>;
}

const TasksSyncContext = createContext<TasksSyncContextValue | null>(null);

export function useTasksSync() {
  return useContext(TasksSyncContext);
}

/**
 * Provides synced updateTask and completeTaskViaApi that fire API calls
 * and optimistically update the Zustand store.
 *
 * PERF FIX: Uses useTaskStore.getState() inside callbacks to avoid
 * depending on `tasks`/`completedTasks`/`taskProgress` in deps,
 * which previously caused re-renders on every task change.
 */
export function TasksSyncProvider({ children }: { children: React.ReactNode }) {
  const storeUpdateTask = useTaskStore((s) => s.updateTask);
  const incrementGroupDoneCount = useTaskStore((s) => s.incrementGroupDoneCount);

  const updateTask = useCallback<UpdateTaskFn>(
    async (id: string, updates: Partial<Task>) => {
      const payload: { status?: string; description?: string; due_at?: string } = {};
      if (updates.status) payload.status = updates.status;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.due_date !== undefined) payload.due_at = updates.due_date ?? undefined;
      if (Object.keys(payload).length === 0) {
        storeUpdateTask(id, updates);
        return;
      }
      try {
        const res = await apiUpdateTask(id, payload);
        if (res.ok) storeUpdateTask(id, updates);
      } catch {
        // Optimistic update even on error so UI doesn't freeze
        storeUpdateTask(id, updates);
      }
    },
    [storeUpdateTask]
  );

  const completeTaskViaApi = useCallback(
    async (taskId: string, submittedValue?: string): Promise<boolean> => {
      try {
        const res = await completeTask(taskId, { submitted_value: submittedValue });
        if (res.ok) {
          // Read latest state at call time — not at render time
          const store = useTaskStore.getState();
          const tasks = store.tasks;
          const completedTasks = store.completedTasks;
          const taskProgress = store.taskProgress;

          const task = tasks.find((t) => t.id === taskId);
          if (task?.task_group_id) incrementGroupDoneCount(task.task_group_id);

          storeUpdateTask(taskId, {
            status: 'done',
            completion_source: 'ai_chat',
            requires_rescore: true,
          });

          store.setTasks(tasks.filter((t) => t.id !== taskId));

          if (task) {
            const completedTask = {
              ...task,
              status: 'done' as const,
              completion_source: 'ai_chat' as const,
              requires_rescore: true,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            store.setCompletedTasks([completedTask, ...completedTasks]);
          }

          if (taskProgress && taskProgress.current_pending > 0) {
            store.setTaskProgress({
              allotted_total: taskProgress.allotted_total,
              current_pending: taskProgress.current_pending - 1,
            });
          }
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    },
    [storeUpdateTask, incrementGroupDoneCount]
  );

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value = useMemo<TasksSyncContextValue>(
    () => ({ updateTask, completeTaskViaApi }),
    [updateTask, completeTaskViaApi]
  );

  return (
    <TasksSyncContext.Provider value={value}>
      {children}
    </TasksSyncContext.Provider>
  );
}
