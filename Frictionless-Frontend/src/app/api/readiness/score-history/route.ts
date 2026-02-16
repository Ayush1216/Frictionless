import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

export interface ScoreHistoryEntry {
  id: string;
  score: number;
  updated_at: string;
  update_source?: string;
  note?: string;
}

/**
 * GET /api/readiness/score-history
 * Returns readiness_score_history for the current user's startup org.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = await getCurrentUserOrgId(supabase);
    if (!orgId) {
      return NextResponse.json({ entries: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('readiness_score_history')
      .select('id, score, updated_at, update_source, note')
      .eq('startup_org_id', orgId)
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('[score-history]', error);
      return NextResponse.json(
        { error: error.message, entries: [] },
        { status: 200 }
      );
    }

    const entries: ScoreHistoryEntry[] = (data ?? [])
      .filter((r) => r.score != null && !Number.isNaN(Number(r.score)))
      .map((r) => ({
        id: r.id,
        score: Math.min(100, Math.max(0, Number(r.score))),
        updated_at: r.updated_at,
        update_source: r.update_source ?? undefined,
        note: r.note ?? undefined,
      }));

    return NextResponse.json({ entries });
  } catch (err) {
    console.error('[score-history]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error', entries: [] },
      { status: 200 }
    );
  }
}
