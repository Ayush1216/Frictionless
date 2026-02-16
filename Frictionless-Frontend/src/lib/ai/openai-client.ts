import OpenAI from 'openai';

const getOpenAIClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-your-openai-key-here') {
    return null;
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
};

export async function* streamChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): AsyncGenerator<string> {
  const client = getOpenAIClient();
  if (!client) {
    // Demo mode: simulate streaming with a delay
    const demoResponse =
      "I'm the AI assistant for Frictionless Intelligence. To enable real AI responses, please add your OpenAI API key to the .env.local file. In the meantime, I can help you explore the platform!";
    for (const word of demoResponse.split(' ')) {
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return;
  }

  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

export async function analyzeFile(
  fileText: string,
  purpose: string,
  context?: string
): Promise<Record<string, unknown>> {
  const client = getOpenAIClient();
  if (!client) {
    // Demo mode: return mock analysis
    return {
      completed: true,
      updates: [
        { field: 'revenue_y1', value: 3400000, confidence: 0.95 },
        { field: 'burn_monthly', value: 180000, confidence: 0.98 },
        { field: 'runway_months', value: 14, confidence: 0.92 },
      ],
      summary:
        'Document analyzed successfully. Key financial metrics extracted.',
      requires_rescore: true,
    };
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an AI analyst for Frictionless Intelligence, an investment readiness platform. ${purpose}. Always respond in valid JSON only. No markdown, no backticks.`,
      },
      {
        role: 'user',
        content: `${context ? `Context: ${context}\n\n` : ''}Document content:\n${fileText}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content || '{}') as Record<
    string,
    unknown
  >;
}

export function isAIEnabled(): boolean {
  const key = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  return !!key && key !== 'sk-your-openai-key-here';
}
