import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import type { Task, TaskGroup } from '@/types/database';

function toFrontendTask(raw: Record<string, unknown>): Task {
  return {
    id: raw.id as string,
    task_group_id: (raw.group_id as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.description as string) ?? '',
    status: (raw.status as Task['status']) ?? 'todo',
    priority: 'medium',
    due_date: (raw.due_at as string | null) ?? null,
    assigned_to: null,
    requires_rescore: Boolean(raw.requires_rescore),
    potential_points: typeof raw.potential_points === 'number' ? raw.potential_points : undefined,
    completion_source: undefined,
    ai_extractions: [],
    created_at: (raw.created_at as string) ?? new Date().toISOString(),
    updated_at: (raw.updated_at as string) ?? new Date().toISOString(),
    comments: [],
    events: [],
  };
}

function toFrontendGroup(raw: Record<string, unknown>): TaskGroup {
  const tasks = ((raw.tasks as Record<string, unknown>[]) ?? []).map(toFrontendTask);
  return {
    id: raw.id as string,
    category: (raw.category as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.how_to_approach as string) ?? '',
    impact: ((raw.impact as string) ?? 'medium') as TaskGroup['impact'],
    tasks,
  };
}

async function fetchFromSupabase(
  supabase: ReturnType<typeof createSupabaseClientForRequest>,
  orgId: string
): Promise<{ taskGroups: TaskGroup[]; tasks: Task[] }> {
  let groupsRes = await supabase!
    .from('task_groups')
    .select('id, title, category, impact, how_to_approach, source, sort_order, created_at, updated_at')
    .eq('startup_org_id', orgId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if ((groupsRes.data?.length ?? 0) === 0 && !groupsRes.error) {
    const altRes = await supabase!
      .from('task_groups')
      .select('id, title, category, impact, how_to_approach, source, sort_order, created_at, updated_at')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });
    if (altRes.data?.length) groupsRes = altRes;
  }

  const groups = groupsRes.data ?? [];
  if (groups.length === 0) return { taskGroups: [], tasks: [] };

  const groupIds = groups.map((g: { id: string }) => g.id);
  const tasksRes = await supabase!
    .from('tasks')
    .select('id, group_id, title, description, status, due_at, sort_order, requires_rescore, potential_points, completed_at, completed_by, created_at, updated_at')
    .in('group_id', groupIds)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  const tasksData = tasksRes.data ?? [];
  const taskMap: Record<string, unknown[]> = {};
  for (const g of groups) {
    taskMap[g.id] = [];
  }
  for (const t of tasksData) {
    const gid = t.group_id;
    if (gid && taskMap[gid]) {
      taskMap[gid].push(t);
    }
  }

  const taskGroups: TaskGroup[] = groups.map((g: Record<string, unknown>) =>
    toFrontendGroup({ ...g, tasks: taskMap[g.id as string] ?? [] })
  );
  const tasks = taskGroups.flatMap((g) => g.tasks);
  return { taskGroups, tasks };
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
      return NextResponse.json({ task_groups: [], tasks: [] }, { status: 200 });
    }

    const backendUrl = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8001';
    let result = { taskGroups: [] as TaskGroup[], tasks: [] as Task[] };

    // Try backend first (service role, bypasses RLS - reliable when tasks exist in DB)
    try {
      const res = await fetch(
        `${backendUrl.replace(/\/$/, '')}/api/startup-tasks?org_id=${encodeURIComponent(orgId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json().catch(() => ({}));
      if (data.task_groups?.length) {
        const groups = (data.task_groups ?? []).map((g: Record<string, unknown>) => toFrontendGroup(g));
        result = {
          taskGroups: groups,
          tasks: groups.flatMap((g) => g.tasks),
        };
      }
    } catch (e) {
      console.warn('[startup/tasks] backend fetch failed:', e);
    }

    // Fallback to Supabase (user token, RLS applies) if backend returned nothing
    if (result.taskGroups.length === 0) {
      result = await fetchFromSupabase(supabase, orgId);
    }

    return NextResponse.json({
      task_groups: result.taskGroups,
      tasks: result.tasks,
    });
  } catch (err) {
    console.error('[startup/tasks]', err);
    return NextResponse.json({ task_groups: [], tasks: [] }, { status: 200 });
  }
}
