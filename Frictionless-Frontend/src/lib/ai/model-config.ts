/**
 * AI Model Routing Configuration — Frictionless Intelligence
 *
 * Centralized config mapping each AI feature to its provider, model,
 * temperature, and max tokens. Consumed by openai-client.ts, gemini-client.ts,
 * and component-level AI calls.
 */

export type AIProvider = 'openai' | 'gemini';

export interface ModelConfig {
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Feature-to-model routing map.
 *
 * Naming convention:
 *   - `chat_*`      → streaming conversational features
 *   - `analyze_*`   → structured / JSON extraction features
 *   - `generate_*`  → long-form content generation
 */
export const MODEL_ROUTES = {
  // ── Streaming chat ──────────────────────────────────────────────
  chat_general: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    temperature: 0.7,
    maxTokens: 4096,
  },
  chat_task_copilot: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 4096,
  },
  chat_task_explainer: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 2048,
  },
  chat_helper_panel: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    temperature: 0.5,
    maxTokens: 1024,
  },

  // ── Structured analysis ─────────────────────────────────────────
  analyze_document: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4096,
  },
  analyze_profile: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4096,
  },
  analyze_sentiment: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    temperature: 0.2,
    maxTokens: 2048,
  },

  // ── Long-form generation ────────────────────────────────────────
  generate_score_deep_dive: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    temperature: 0.4,
    maxTokens: 4096,
  },
  generate_summary: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 2048,
  },
  generate_action_plan: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    temperature: 0.4,
    maxTokens: 4096,
  },
  generate_investor_lens: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    temperature: 0.4,
    maxTokens: 2048,
  },
  generate_benchmark: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    temperature: 0.3,
    maxTokens: 2048,
  },
  generate_whatif: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    temperature: 0.4,
    maxTokens: 1024,
  },
  generate_completion_analysis: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    temperature: 0.5,
    maxTokens: 1024,
  },

  // ── Intelligence chat ────────────────────────────────────────
  intelligence_chat: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    temperature: 0.5,
    maxTokens: 4096,
  },
  intelligence_web: {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    temperature: 0.4,
    maxTokens: 4096,
  },
} as const satisfies Record<string, ModelConfig>;

export type AIFeature = keyof typeof MODEL_ROUTES;

/**
 * Get config for a specific AI feature.
 */
export function getModelConfig(feature: AIFeature): ModelConfig {
  return MODEL_ROUTES[feature];
}
