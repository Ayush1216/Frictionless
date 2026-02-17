import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';
import type { ReadinessState } from '@/stores/readiness-store';

/**
 * Single request to load readiness + score history + tasks. Call once on app load
 * (e.g. from layout) so dashboard and tasks pages can render instantly from stores.
 */
export async function fetchBootstrap(token: string): Promise<void> {
  const res = await fetch('/api/startup/bootstrap', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));

  const readiness: ReadinessState | null =
    data.readiness?.status === 'ready' && data.readiness?.score_summary
      ? {
          score_summary: data.readiness.score_summary,
          scored_rubric: data.readiness.scored_rubric,
          updated_at: data.readiness.updated_at ?? null,
        }
      : null;

  const scoreHistory = (data.scoreHistory?.entries ?? []).map(
    (e: { score: number; updated_at: string }) => ({
      score: Number(e.score),
      updated_at: e.updated_at,
    })
  );

  const documentCount = typeof data.document_count === 'number' ? data.document_count : 0;
  useReadinessStore.getState().setBootstrap(readiness, scoreHistory, documentCount);

  const tasks = data.tasks ?? [];
  const taskGroups = data.task_groups ?? [];
  const taskProgress = data.task_progress ?? null;

  useTaskStore.getState().setTasks(tasks);
  useTaskStore.getState().setTaskGroups(taskGroups);
  if (taskProgress) {
    useTaskStore.getState().setTaskProgress(taskProgress);
  }
  useTaskStore.getState().setTasksLoaded(true);
}
