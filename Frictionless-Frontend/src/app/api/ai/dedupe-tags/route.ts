import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import OpenAI from 'openai';

/**
 * POST /api/ai/dedupe-tags
 * AI-assisted normalization and deduplication of keywords or industries.
 * Returns a cleaned list (semantic duplicates merged; display-only, never saved to DB).
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
    const items = Array.isArray(body.items) ? (body.items as string[]).map((s) => String(s).trim()).filter(Boolean) : [];
    const type = body.type === 'industries' ? 'industries' : 'keywords';

    if (items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const openAiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!openAiKey || openAiKey === 'sk-your-openai-key-here') {
      return NextResponse.json({ error: 'OpenAI not configured', items });
    }

    const client = new OpenAI({ apiKey: openAiKey });
    const systemPrompt = `You are a data cleanup assistant. You receive a list of ${type} (tags/labels) that may contain duplicates or near-duplicates.

Rules:
- Normalize: fix casing (use Title Case for display), trim spaces, remove redundant punctuation.
- Merge semantic duplicates: e.g. "health & wellness" and "health, wellness" and "Health and Wellness" => one "Health & Wellness". "SaaS" and "Software as a Service" => one (pick the more common form).
- Do not add new items; only merge/dedupe from the input list.
- Preserve the first or most canonical form when merging.
- Return a JSON array of strings only. No explanation. Example: ["Item One", "Item Two"]`;

    const response = await client.chat.completions.create({
      model: openAiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Input ${type}:\n${JSON.stringify(items)}` },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '[]';
    let parsed: string[];
    try {
      const cleaned = raw.replace(/^```\w*\s*|\s*```$/g, '').trim();
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) parsed = [];
      parsed = parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      parsed = items;
    }

    return NextResponse.json({ items: parsed });
  } catch (err) {
    console.error('[ai/dedupe-tags]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Dedupe failed', items: [] },
      { status: 500 }
    );
  }
}
