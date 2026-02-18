import { useReadinessStore } from '@/stores/readiness-store';
import { useTaskStore } from '@/stores/task-store';
import type { ReadinessState } from '@/stores/readiness-store';

/**
 * Deduplication: prevent concurrent bootstrap fetches.
 * Layout and Tasks page both may call fetchBootstrap; only the first in-flight wins.
 */
let inflightBootstrap: Promise<void> | null = null;
let lastBootstrapAt = 0;
const BOOTSTRAP_COOLDOWN_MS = 10_000; // 10s minimum between fetches

/**
 * Single request to load readiness + score history + tasks. Call once on app load
 * (e.g. from layout) so dashboard and tasks pages can render instantly from stores.
 * Deduplicates concurrent calls and enforces a cooldown to avoid hammering the API.
 */
export async function fetchBootstrap(token: string, force = false): Promise<void> {
  const now = Date.now();

  // If stores already loaded and within cooldown, skip (unless forced)
  if (
    !force &&
    useReadinessStore.getState().bootstrapLoaded &&
    useTaskStore.getState().tasksLoaded &&
    now - lastBootstrapAt < BOOTSTRAP_COOLDOWN_MS
  ) {
    return;
  }

  // Deduplicate: if already fetching, return the existing promise
  if (inflightBootstrap) {
    return inflightBootstrap;
  }

  inflightBootstrap = _doFetchBootstrap(token);
  try {
    await inflightBootstrap;
  } finally {
    inflightBootstrap = null;
  }
}

async function _doFetchBootstrap(token: string): Promise<void> {
  const res = await fetch('/api/startup/bootstrap', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));

  lastBootstrapAt = Date.now();

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
  const completedTasks = data.completed_tasks ?? [];
  const taskGroups = data.task_groups ?? [];
  const taskProgress = data.task_progress ?? null;

  useTaskStore.getState().setTasks(tasks);
  useTaskStore.getState().setCompletedTasks(completedTasks);
  useTaskStore.getState().setTaskGroups(taskGroups);
  if (taskProgress) {
    useTaskStore.getState().setTaskProgress(taskProgress);
  }
  useTaskStore.getState().setTasksLoaded(true);
}
