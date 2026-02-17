import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import type { Task, TaskGroup } from '@/types/database';
import { toFrontendGroup } from '@/lib/api/startup-tasks-server';

/**
 * GET /api/startup/bootstrap
 * Single request for dashboard + tasks: readiness status, score history, and tasks.
 * Use this once on app load so dashboard and tasks pages can render instantly from cache.
 */
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
      return NextResponse.json({
        readiness: { status: 'pending', error: 'No organization' },
        scoreHistory: { entries: [] },
        task_groups: [],
        tasks: [],
        task_progress: null,
        document_count: 0,
      }, { status: 200 });
    }

    const backendUrl = (process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

    // Backend dashboard + score history + data room document count
    const [dashboardRes, scoreHistoryQuery, documentCountRes] = await Promise.all([
      fetch(`${backendUrl}/api/startup-dashboard?org_id=${encodeURIComponent(orgId)}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
      supabase
        .from('readiness_score_history')
        .select('id, score, updated_at, update_source, note')
        .eq('startup_org_id', orgId)
        .order('updated_at', { ascending: true }),
      supabase
        .from('org_assets')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('category', ['pitch_deck', 'data_room_doc']),
    ]);

    const dashboardData = await dashboardRes.json().catch(() => ({}));
    const readiness =
      dashboardRes.ok && dashboardData?.readiness
        ? dashboardData.readiness
        : { status: 'pending', error: dashboardData?.detail || 'Backend error' };

    const { data: scoreRows } = scoreHistoryQuery;
    const entries = (scoreRows ?? [])
      .filter((r: { score: unknown }) => r.score != null && !Number.isNaN(Number(r.score)))
      .map((r: { id: string; score: number; updated_at: string; update_source?: string; note?: string }) => ({
        id: r.id,
        score: Math.min(100, Math.max(0, Number(r.score))),
        updated_at: r.updated_at,
        update_source: r.update_source ?? undefined,
        note: r.note ?? undefined,
      }));

    let taskGroups: TaskGroup[] = [];
    let tasks: Task[] = [];
    let task_progress: { allotted_total: number; current_pending: number } | null = null;

    if (dashboardData?.task_groups) {
      taskGroups = (dashboardData.task_groups as Record<string, unknown>[]).map((g) => toFrontendGroup(g));
      tasks = taskGroups.flatMap((g) => g.tasks);
      const progress = dashboardData.task_progress;
      if (progress?.allotted_total != null && progress?.current_pending != null) {
        task_progress = {
          allotted_total: progress.allotted_total,
          current_pending: progress.current_pending,
        };
      } else if (tasks.length > 0) {
        const doneFromGroups = taskGroups.reduce((s, g) => s + (g.done_count ?? 0), 0);
        task_progress = {
          allotted_total: tasks.length + doneFromGroups,
          current_pending: tasks.length,
        };
      }
    }

    const document_count =
      typeof (documentCountRes as { count?: number })?.count === 'number'
        ? (documentCountRes as { count: number }).count
        : 0;

    return NextResponse.json(
      {
        readiness,
        scoreHistory: { entries },
        task_groups: taskGroups,
        tasks,
        task_progress,
        document_count,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=15',
        },
      }
    );
  } catch (err) {
    console.error('[startup/bootstrap]', err);
    return NextResponse.json(
      {
        readiness: { status: 'pending', error: err instanceof Error ? err.message : 'Server error' },
        scoreHistory: { entries: [] },
        task_groups: [],
        tasks: [],
        task_progress: null,
        document_count: 0,
      },
      { status: 200 }
    );
  }
}
