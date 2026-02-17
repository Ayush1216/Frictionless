import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import OpenAI from 'openai';

/**
 * POST /api/ai/fill-profile
 * Body: { context: { extraction?, apollo?: { short_description?, name?, industry? } } }
 * Returns structured fields for Business & Product: problem, solution, unique_value_proposition, why_now, traction.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = createSupabaseClientForRequest(token);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getCurrentUserOrgId(supabase);

    const body = await request.json().catch(() => ({}));
    const context = body.context ?? {};
    const apollo = context.apollo ?? {};
    const shortDescription = apollo.short_description || apollo.short_description_trimmed || '';

    const openAiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!openAiKey || openAiKey === 'sk-your-openai-key-here') {
      return NextResponse.json({
        error: 'OpenAI API key is not configured.',
      }, { status: 400 });
    }

    if (!shortDescription && !context.extraction) {
      return NextResponse.json({
        error: 'Provide apollo.short_description or extraction context to fill profile.',
      }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: openAiKey });
    const systemPrompt = `You are an investment analyst. Given a company description (and optionally pitch deck extraction), output a JSON object with exactly these keys (use empty string if unclear):
- problem: 1-3 sentences on the problem the company solves
- solution: 1-3 sentences on the solution/product
- unique_value_proposition: 1-2 sentences on what makes them unique
- why_now: 1-2 sentences on market timing
- traction: 1-3 sentences on milestones, revenue, or proof points

Return only valid JSON, no markdown or extra text.`;

    const userContent = shortDescription
      ? `Company: ${context.apollo?.name || 'Unknown'}. Industry: ${context.apollo?.industry || 'N/A'}.\n\nCompany description:\n${shortDescription.slice(0, 5000)}`
      : `Extraction summary:\n${JSON.stringify(context.extraction || {}, null, 2).slice(0, 5000)}`;

    const response = await client.chat.completions.create({
      model: openAiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '{}';
    const parsed = (() => {
      try {
        const cleaned = raw.replace(/^```json\s*|\s*```$/g, '').trim();
        return JSON.parse(cleaned);
      } catch {
        return {};
      }
    })();

    const result = {
      problem: typeof parsed.problem === 'string' ? parsed.problem : '',
      solution: typeof parsed.solution === 'string' ? parsed.solution : '',
      unique_value_proposition: typeof parsed.unique_value_proposition === 'string' ? parsed.unique_value_proposition : '',
      why_now: typeof parsed.why_now === 'string' ? parsed.why_now : '',
      traction: typeof parsed.traction === 'string' ? parsed.traction : '',
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[ai/fill-profile]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fill profile' },
      { status: 500 }
    );
  }
}
