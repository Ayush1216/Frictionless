import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/readiness/analysis?org_id=&data_hash=
 * C2: Returns cached AI readiness analysis or triggers generation.
 * Cache key: org_id + readiness_insight + data_hash + model_version
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
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('org_id');
    const dataHash = searchParams.get('data_hash') || 'default';

    const effectiveOrgId = orgIdParam || orgId;

    // Check cache first
    const { data: cached } = await supabase
      .from('ai_analysis_cache')
      .select('result_jsonb, created_at')
      .eq('org_id', effectiveOrgId)
      .eq('analysis_type', 'readiness_insight')
      .eq('input_hash', dataHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.result_jsonb) {
      const result = cached.result_jsonb as Record<string, unknown>;
      return NextResponse.json({
        status: 'cached',
        analysis: result,
        cached_at: cached.created_at,
      });
    }

    // Fallback: generate placeholder until backend integration
    const placeholder = {
      insights: 'Complete your company profile and run a Frictionless assessment to get personalized AI insights.',
      strengths: ['Profile setup in progress'],
      risks: ['Add more company details for better analysis'],
      recommendations: ['Fill in key profile sections', 'Upload your pitch deck', 'Complete the Frictionless questionnaire'],
    };

    // Cache placeholder so subsequent requests are served from DB
    const modelVersion = 'placeholder-v1';
    const { error: cacheErr } = await supabase.from('ai_analysis_cache').insert({
      org_id: effectiveOrgId,
      analysis_type: 'readiness_insight',
      input_hash: dataHash,
      model_version: modelVersion,
      result_jsonb: placeholder,
    });
    if (cacheErr) {
      // Non-critical: duplicate key or RLS issue — safe to ignore
    }

    return NextResponse.json({
      status: 'generated',
      analysis: placeholder,
      cached_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[readiness/analysis]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}
