import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import OpenAI from 'openai';

/**
 * POST /api/ai/consolidate-profile
 * Merges extraction + Apollo into one display object. Uses AI to avoid showing the same info twice
 * (e.g. raw_address only if different from city/state/country). Result is meant to be cached in localStorage.
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
    const extraction = body.extraction ?? {};
    const apollo = body.apollo ?? {};

    const openAiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!openAiKey || openAiKey === 'sk-your-openai-key-here') {
      return NextResponse.json({
        error: 'OpenAI API key is not configured.',
      }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: openAiKey });
    const systemPrompt = `You are a data merge assistant. You receive two JSON objects: extraction (from pitch deck) and apollo (from Apollo enrichment). Your job is to produce ONE merged JSON for display on a company profile page.

Rules:
- Do NOT show the same information twice. If raw_address (full street address) is redundant with location_display (e.g. "Austin, Texas, US"), set raw_address to null. Only include raw_address if it adds real value (e.g. street + suite).
- Prefer apollo for: name, logo_url, linkedin_url, website_url, phone, industry, short_description, founded_year, city, state, country, raw_address, total_funding, organization_revenue, estimated_num_employees, keywords, industries, blog_url, twitter_url, facebook_url, primary_phone, sanitized_phone, funding_events. Prefer extraction for: problem, solution, unique_value_proposition, why_now, traction, financial_data, initial_details (if present).
- Output a single JSON object with these keys (use null or empty string if not available): company_name, logo_url, location_display (single string e.g. "Austin, TX, US"), raw_address (full address ONLY if different from location_display; otherwise null), phone (one phone string), website_url, blog_url, twitter_url, facebook_url, linkedin_url, industry, industries (array of strings), keywords (array of strings), founded_year, estimated_num_employees, total_funding, organization_revenue, total_funding_printed, organization_revenue_printed, short_description, problem, solution, unique_value_proposition, why_now, traction, primary_domain, street_address, postal_code.
- Merge intelligently: e.g. if extraction has problem/solution and apollo has short_description, keep both but do not duplicate the same sentence in two fields.
- Return ONLY valid JSON, no markdown or explanation. Use snake_case for all keys.`;

    const userContent = `Extraction (pitch deck):\n${JSON.stringify(extraction, null, 2).slice(0, 6000)}\n\nApollo enrichment:\n${JSON.stringify(apollo, null, 2).slice(0, 6000)}`;

    const response = await client.chat.completions.create({
      model: openAiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '{}';
    let parsed: Record<string, unknown>;
    try {
      const cleaned = raw.replace(/^```json\s*|\s*```$/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[ai/consolidate-profile]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to consolidate profile' },
      { status: 500 }
    );
  }
}
