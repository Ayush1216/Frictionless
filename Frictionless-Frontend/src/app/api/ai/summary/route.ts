import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import OpenAI from 'openai';

/**
 * POST /api/ai/summary
 * Generates an AI summary of the company profile context.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const context = body.context ?? {};
    const systemPrompt = body.systemPrompt || 'You are an investment readiness advisor. Given startup company profile data (extraction from pitch deck, questionnaire answers), write a concise 3-5 sentence executive summary. Highlight strengths, key metrics, stage, sector, and notable traction. Be professional and encouraging.';

    const openAiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!openAiKey || openAiKey === 'sk-your-openai-key-here') {
      return NextResponse.json({
        summary: 'AI summary is available when OpenAI API key is configured in your environment.',
      });
    }

    const client = new OpenAI({ apiKey: openAiKey });
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context, null, 2);

    const response = await client.chat.completions.create({
      model: openAiModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Company profile data:\n${contextStr.slice(0, 6000)}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const summary = response.choices[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[ai/summary]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
