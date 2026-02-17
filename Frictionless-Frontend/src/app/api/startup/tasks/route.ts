import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import type { Task, TaskGroup } from '@/types/database';
import { toFrontendGroup } from '@/lib/api/startup-tasks-server';

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
        tasks: groups.flatMap((g) => g.tasks),
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
