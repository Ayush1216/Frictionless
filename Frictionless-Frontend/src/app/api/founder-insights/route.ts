import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import OpenAI from 'openai';

/**
 * POST /api/founder-insights
 * Returns AI-generated executive snapshot, career arc, strategic fit chips, and "what they've built" from founder profile.
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
    const person = body.person ?? {};

    const openAiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!openAiKey || openAiKey === 'sk-your-openai-key-here') {
      return NextResponse.json({
        executiveSnapshot: null,
        careerArc: null,
        strategicFitChips: [],
        whatTheyBuilt: null,
      });
    }

    const client = new OpenAI({ apiKey: openAiKey });
    const context = JSON.stringify(person, null, 2).slice(0, 5000);

    const systemPrompt = `You are an investor-grade analyst. Given a founder/executive profile (name, title, summary, education, work_experience), respond with valid JSON only (no markdown, no backticks) with these exact keys:
- executiveSnapshot: 2-3 sentence concise executive summary (string)
- careerArc: 2-3 sentence narrative on founder/operator/investor progression signals (string)
- strategicFitChips: array of 4-8 short tags (e.g. "Health-tech", "Optical retail", "Telemedicine", "Multi-sector") - strings only
- whatTheyBuilt: object with optional keys: venturesCount (number), sectors (array of strings), yearsExperience (number), notableCompanies (array of strings). Use null for unknown.`;

    const response = await client.chat.completions.create({
      model: openAiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Profile:\n${context}` },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '{}';
    const parsed = (() => {
      try {
        return JSON.parse(raw.replace(/^```\w*\n?|\n?```$/g, ''));
      } catch {
        return {};
      }
    })();

    return NextResponse.json({
      executiveSnapshot: parsed.executiveSnapshot ?? null,
      careerArc: parsed.careerArc ?? null,
      strategicFitChips: Array.isArray(parsed.strategicFitChips) ? parsed.strategicFitChips : [],
      whatTheyBuilt: parsed.whatTheyBuilt ?? null,
    });
  } catch (err) {
    console.error('[founder-insights]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
