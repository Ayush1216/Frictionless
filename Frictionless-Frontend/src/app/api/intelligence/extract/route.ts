import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientForRequest, getCurrentUserOrgId } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const BACKEND_URL = process.env.FRICTIONLESS_BACKEND_URL || 'http://localhost:8000';

const EXTRACTION_PROMPT = `Analyze the following user message from a startup founder. Determine if it contains company information worth saving to their profile.

Look for:
- Financial metrics (revenue, ARR, MRR, burn rate, runway, margins, valuation)
- Team information (new hires, headcount, key team members, roles)
- Product updates (launch dates, features, tech stack, product milestones)
- Traction data (customers, users, growth rates, partnerships, contracts)
- Fundraising info (round size, valuation, investors, term sheet details)
- Business model details (pricing, unit economics, CAC, LTV)

If extractable data is found, return ONLY valid JSON:
{ "extract": true, "data": { "field_name": "value" }, "summary": "Brief 1-line description of what was extracted" }

Use standard field names: company_name, industry, stage, business_model, description, arr, mrr, revenue_ttm, burn_monthly, runway_months, headcount, customer_count, cac, ltv, churn_rate_pct, gross_margin_pct, founded_year, hq_city, website, funding_raised, valuation

If no extractable data, return ONLY:
{ "extract": false }

USER MESSAGE:
`;

/**
 * POST /api/intelligence/extract
 * Detect company information in a chat message and save to extraction_data.
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
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const body = await request.json();
    const { message, thread_id } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Quick heuristic: skip if message is too short or is just a question
    if (message.length < 20 || (message.trim().endsWith('?') && message.length < 80)) {
      return NextResponse.json({ extracted: false });
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-key-here') {
      return NextResponse.json({ extracted: false });
    }

    const client = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = client.getGenerativeModel({
      model: process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash-lite',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: EXTRACTION_PROMPT + message }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    });

    const responseText = result.response.text().trim();

    // Parse JSON from response (handle markdown code blocks)
    let parsed: { extract: boolean; data?: Record<string, unknown>; summary?: string };
    try {
      const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ extracted: false });
    }

    if (!parsed.extract || !parsed.data || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ extracted: false });
    }

    // Patch extraction data via backend
    try {
      const patchUrl = `${BACKEND_URL.replace(/\/$/, '')}/api/extraction-data`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          extraction_data_patch: parsed.data,
        }),
      });
    } catch (e) {
      console.warn('[extract] Failed to patch extraction data:', e);
    }

    // Insert system-card message into thread
    if (thread_id) {
      const fields = Object.entries(parsed.data).map(([k, v]) => ({ field: k, value: String(v) }));
      await supabase.from('intelligence_messages').insert({
        thread_id,
        role: 'system-card',
        content: parsed.summary || `Saved ${fields.length} data point${fields.length > 1 ? 's' : ''} to your company profile`,
        attachments: [],
        metadata: { extracted_fields: fields },
      });
    }

    return NextResponse.json({
      extracted: true,
      fields: Object.entries(parsed.data).map(([k, v]) => ({ field: k, value: String(v) })),
      summary: parsed.summary,
    });
  } catch (err) {
    console.error('[extract]', err);
    return NextResponse.json({ extracted: false });
  }
}
