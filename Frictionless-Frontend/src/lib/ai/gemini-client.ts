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
  const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
  _model = client.getGenerativeModel({ model: modelName });
  return _model;
}

export function isGeminiEnabled(): boolean {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  return !!key && key !== 'your-gemini-key-here';
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
 */
export async function* geminiStream(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<string> {
  const model = getModel();
  if (!model) {
    const demo = "I'm the AI assistant for Frictionless Intelligence. To enable real AI analysis, please add your Gemini API key. In the meantime, here's a sample analysis based on your current data.";
    for (const word of demo.split(' ')) {
      yield word + ' ';
      await new Promise((r) => setTimeout(r, 30));
    }
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
