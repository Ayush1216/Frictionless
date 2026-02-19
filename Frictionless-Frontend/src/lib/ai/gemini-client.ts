'use client';

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

let _client: GoogleGenerativeAI | null = null;
let _model: GenerativeModel | null = null;

function getGeminiClient(): GoogleGenerativeAI | null {
  if (_client) return _client;
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-key-here') return null;
  _client = new GoogleGenerativeAI(apiKey);
  return _client;
}

function getModel(): GenerativeModel | null {
  if (_model) return _model;
  const client = getGeminiClient();
  if (!client) return null;
  // Use env var for the model; default to a stable flash model
  const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL ?? 'gemini-2.0-flash';
  _model = client.getGenerativeModel({ model: modelName });
  return _model;
}

export function isGeminiEnabled(): boolean {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  return !!key && key !== 'your-gemini-key-here';
}

/**
 * Lightweight summarisation using gemini-2.5-flash-lite.
 * Returns a 1–2 sentence summary of the supplied text.
 */
const _summaryCache = new Map<string, string>();
export async function geminiSummarize(
  text: string,
  hint?: string
): Promise<string> {
  const cacheKey = `${hint ?? ''}::${text}`;
  if (_summaryCache.has(cacheKey)) return _summaryCache.get(cacheKey)!;

  const client = getGeminiClient();
  if (!client) return text; // fallback to raw text

  const liteModel = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const prompt = `You are a startup expert. Summarize the following${hint ? ` (${hint})` : ''} into exactly 1-2 clear, investor-friendly sentences. Output ONLY the summary, no quotes, no preamble.\n\n${text}`;

  try {
    const result = await liteModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 120 },
    });
    const summary = result.response.text().trim();
    _summaryCache.set(cacheKey, summary);
    return summary;
  } catch {
    return text;
  }
}

/**
 * Non-streaming Gemini call for structured JSON analysis.
 */
export async function geminiAnalyze(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const model = getModel();
  if (!model) {
    return JSON.stringify({ error: 'Gemini not configured', demo: true });
  }

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.4,
      maxOutputTokens: options?.maxTokens ?? 4096,
    },
  });

  return result.response.text();
}

/**
 * Streaming Gemini call — yields text chunks for long-form generation.
 * Returns nothing if Gemini is not configured (callers should check isGeminiEnabled first).
 */
export async function* geminiStream(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<string> {
  const model = getModel();
  if (!model) {
    // Gemini not configured — yield nothing; callers should handle empty stream.
    return;
  }

  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.5,
      maxOutputTokens: options?.maxTokens ?? 4096,
    },
  });

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

/**
 * Streaming Gemini call with Google Search grounding.
 * Uses gemini-2.0-flash with googleSearch tool.
 * Yields text chunks, then appends a Sources section from grounding metadata.
 */
export async function* geminiWebStream(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<string> {
  const client = getGeminiClient();
  if (!client) {
    yield 'Web search requires a configured Gemini API key. Please add your `NEXT_PUBLIC_GEMINI_API_KEY` to enable real-time web search.';
    return;
  }

  // Use the same configurable model for web search with grounding
  const webModelName = process.env.NEXT_PUBLIC_GEMINI_MODEL ?? 'gemini-2.0-flash';
  const webModel = client.getGenerativeModel({
    model: webModelName,
    tools: [{ googleSearch: {} } as never],
  });

  const result = await webModel.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.4,
      maxOutputTokens: options?.maxTokens ?? 4096,
    },
  });

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }

  // Extract grounding metadata (sources) from the aggregated response
  try {
    const response = await result.response;
    const metadata = response.candidates?.[0]?.groundingMetadata;
    if (metadata?.groundingChunks?.length) {
      const sources = metadata.groundingChunks
        .filter((c) => c.web?.uri && c.web?.title)
        .map((c) => c.web!);

      if (sources.length > 0) {
        // Deduplicate by URI
        const seen = new Set<string>();
        const unique = sources.filter((s) => {
          if (seen.has(s.uri!)) return false;
          seen.add(s.uri!);
          return true;
        });

        yield '\n\n---\n\n### Sources\n\n';
        for (const src of unique) {
          yield `- [${src.title}](${src.uri})\n`;
        }
      }
    }
  } catch {
    // Grounding metadata may not be available
  }
}
