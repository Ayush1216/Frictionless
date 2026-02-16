'use client';

import { createContext, useCallback, useContext } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { apiUpdateTask, completeTask } from '@/lib/api/tasks';
import type { Task } from '@/types/database';

type UpdateTaskFn = (id: string, updates: Partial<Task>) => void | Promise<void>;

const TasksSyncContext = createContext<{
  updateTask: UpdateTaskFn;
  completeTaskViaApi: (taskId: string) => Promise<boolean>;
} | null>(null);

export function useTasksSync() {
  const ctx = useContext(TasksSyncContext);
  return ctx;
}

export function TasksSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeUpdateTask = useTaskStore((s) => s.updateTask);

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
        storeUpdateTask(id, updates);
      }
    },
    [storeUpdateTask]
  );

  const completeTaskViaApi = useCallback(
    async (taskId: string): Promise<boolean> => {
      try {
        const res = await completeTask(taskId);
        if (res.ok) {
          storeUpdateTask(taskId, {
            status: 'done',
            completion_source: 'ai_chat',
            requires_rescore: true,
          });
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    },
    [storeUpdateTask]
  );

  return (
    <TasksSyncContext.Provider value={{ updateTask, completeTaskViaApi }}>
      {children}
    </TasksSyncContext.Provider>
  );
}
