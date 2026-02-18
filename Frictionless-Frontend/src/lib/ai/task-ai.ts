import { streamChat, analyzeFile } from './openai-client';
import { extractTextFromFile } from './file-parser';
import { AI_PROMPTS } from './prompts';

export interface TaskAIResult {
  completed: boolean;
  updates: Array<{ field: string; value: unknown; confidence: number }>;
  summary: string;
  follow_up_questions?: string[];
  requires_rescore: boolean;
}

export async function completeTaskWithFile(
  file: File,
  task: { title: string; description: string },
  taskGroup: { category: string },
  startupContext: unknown
): Promise<TaskAIResult> {
  const fileText = await extractTextFromFile(file);

  const result = await analyzeFile(
    fileText,
    `${AI_PROMPTS.DOCUMENT_ANALYZER}

    TASK: "${task.title}"
    DESCRIPTION: "${task.description}"
    CATEGORY: "${taskGroup.category}"

    Analyze the uploaded document and determine:
    1. Does this document satisfy the task requirements?
    2. What specific data can be extracted from it?
    3. Provide a summary of what was found
    4. Any follow-up questions if the task isn't fully completed
    5. Should this trigger a rescore?

    Return JSON: {
      "completed": boolean,
      "updates": [{ "field": "string", "value": "any", "confidence": 0-1 }],
      "summary": "string",
      "follow_up_questions": ["string"],
      "requires_rescore": boolean
    }`,
    `Startup: ${JSON.stringify(startupContext)}`
  );

  return result as unknown as TaskAIResult;
}

export async function* chatToCompleteTask(
  messages: { role: string; content: string }[],
  task: { title: string; description: string },
  taskGroup: { category: string; impact?: string },
  startupContext: unknown
): AsyncGenerator<string> {
  const systemPrompt = `${AI_PROMPTS.TASK_COPILOT}

CURRENT TASK: "${task.title}"
DESCRIPTION: "${task.description}"
CATEGORY: "${taskGroup.category}"
${taskGroup.impact ? `IMPACT: ${taskGroup.impact}` : ''}

The startup's current data:
${JSON.stringify(startupContext, null, 2)}`;

  yield* streamChat([
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    })),
  ]);
}
