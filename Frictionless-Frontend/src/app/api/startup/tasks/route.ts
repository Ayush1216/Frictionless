import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import type { Task, TaskGroup } from '@/types/database';

export const dynamic = 'force-dynamic';

function parsePotentialPoints(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return undefined;
}

/** Impact = point increase to reach 5/5: high = 4–5 pts left, medium = 3, low = 1–2 (per rubric). */
function impactFromPotentialPoints(pts: number | undefined): Task['priority'] {
  if (pts == null || pts <= 0) return 'medium';
  if (pts >= 4) return 'high';
  if (pts >= 3) return 'medium';
  return 'low';
}

function toFrontendTask(raw: Record<string, unknown>): Task {
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

function toFrontendGroup(raw: Record<string, unknown>): TaskGroup {
  const tasks = ((raw.tasks as Record<string, unknown>[]) ?? []).map((t) =>
    toFrontendTask(t)
  );
  // Group impact = max impact of tasks in the group, so list header matches task detail
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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token || null);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await getCurrentUserOrgId(supabase);
    if (!orgId) {
      // Backend is never called: user has no org (no active org_memberships row).
      // Ensure the user is in an org and has completed onboarding so org_memberships exists.
      console.warn('[startup/tasks] No org_id for user – skipping backend GET /api/startup-tasks');
      return NextResponse.json({ task_groups: [], tasks: [] }, { status: 200 });
    }

    const backendUrl = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';
    let result = { taskGroups: [] as TaskGroup[], tasks: [] as Task[] };

    try {
      const url = `${backendUrl.replace(/\/$/, '')}/api/startup-tasks?org_id=${encodeURIComponent(orgId)}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      const groups = (data.task_groups ?? []).map((g: Record<string, unknown>) => toFrontendGroup(g));
      result = {
        taskGroups: groups,
        tasks: groups.flatMap((g: TaskGroup) => g.tasks),
      };
      const progress = data.task_progress;
      const pendingCount = result.tasks.length;
      const doneFromGroups = result.taskGroups.reduce((s, g) => s + (g.done_count ?? 0), 0);
      const taskProgress =
        progress && typeof progress.allotted_total === 'number' && typeof progress.current_pending === 'number'
          ? { allotted_total: progress.allotted_total, current_pending: progress.current_pending }
          : pendingCount > 0 || doneFromGroups > 0
            ? { allotted_total: pendingCount + doneFromGroups, current_pending: pendingCount }
            : { allotted_total: 0, current_pending: 0 };
      return NextResponse.json({
        task_groups: result.taskGroups,
        tasks: result.tasks,
        task_progress: taskProgress,
      });
    } catch (e) {
      console.warn('[startup/tasks] backend fetch failed:', e);
    }

    return NextResponse.json({
      task_groups: result.taskGroups,
      tasks: result.tasks,
      task_progress: null,
    });
  } catch (err) {
    console.error('[startup/tasks]', err);
    return NextResponse.json({ task_groups: [], tasks: [] }, { status: 200 });
  }
}
