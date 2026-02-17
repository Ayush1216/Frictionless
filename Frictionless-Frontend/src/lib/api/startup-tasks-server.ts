import type { Task, TaskGroup } from '@/types/database';

export function parsePotentialPoints(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return undefined;
}

export function impactFromPotentialPoints(pts: number | undefined): Task['priority'] {
  if (pts == null || pts <= 0) return 'medium';
  if (pts >= 4) return 'high';
  if (pts >= 3) return 'medium';
  return 'low';
}

export function toFrontendTask(raw: Record<string, unknown>): Task {
  const potential_points = parsePotentialPoints(raw.potential_points);
  const priority = impactFromPotentialPoints(potential_points);
  return {
    id: raw.id as string,
    task_group_id: (raw.group_id as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.description as string) ?? '',
    status: (raw.status as Task['status']) ?? 'todo',
    priority,
    due_date: (raw.due_at as string | null) ?? null,
    assigned_to: null,
    requires_rescore: Boolean(raw.requires_rescore),
    potential_points,
    submitted_value: (raw.submitted_value as string | null) ?? null,
    completion_source: undefined,
    ai_extractions: [],
    created_at: (raw.created_at as string) ?? new Date().toISOString(),
    updated_at: (raw.updated_at as string) ?? new Date().toISOString(),
    comments: [],
    events: [],
  };
}

const IMPACT_ORDER: TaskGroup['impact'][] = ['low', 'medium', 'high'];

export function toFrontendGroup(raw: Record<string, unknown>): TaskGroup {
  const tasks = ((raw.tasks as Record<string, unknown>[]) ?? []).map((t) =>
    toFrontendTask(t)
  );
  const groupImpact: TaskGroup['impact'] =
    tasks.length === 0
      ? 'medium'
      : (IMPACT_ORDER[
          Math.max(
            ...tasks.map((t) => IMPACT_ORDER.indexOf(t.priority as TaskGroup['impact']))
          )
        ] ?? 'medium');
  return {
    id: raw.id as string,
    category: (raw.category as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.how_to_approach as string) ?? '',
    impact: groupImpact,
    tasks,
    total_in_category:
      typeof raw.total_in_category === 'number' ? raw.total_in_category : undefined,
    done_count: typeof raw.done_count === 'number' ? raw.done_count : undefined,
  };
}
