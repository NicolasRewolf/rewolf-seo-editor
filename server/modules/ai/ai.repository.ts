import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, streamText } from 'ai';
import type { z } from 'zod';

type Provider = 'anthropic' | 'openai';

export function streamWithProvider(params: {
  provider: Provider;
  apiKey: string;
  modelId: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  system?: string;
  onError?: (error: unknown) => void;
}) {
  const { provider, apiKey, modelId, messages, system, onError } = params;
  const model =
    provider === 'anthropic'
      ? createAnthropic({ apiKey })(modelId)
      : createOpenAI({ apiKey })(modelId);

  return streamText({
    model,
    system,
    messages,
    onError: onError
      ? ({ error }) => {
          onError(error);
        }
      : undefined,
  });
}

export async function generateObjectWithProvider<TSchema extends z.ZodTypeAny>(params: {
  provider: Provider;
  apiKey: string;
  modelId: string;
  schema: TSchema;
  schemaName: string;
  schemaDescription: string;
  system: string;
  prompt: string;
}) {
  const {
    provider,
    apiKey,
    modelId,
    schema,
    schemaName,
    schemaDescription,
    system,
    prompt,
  } = params;
  const model =
    provider === 'anthropic'
      ? createAnthropic({ apiKey })(modelId)
      : createOpenAI({ apiKey })(modelId);

  return generateObject({
    model,
    schema,
    schemaName,
    schemaDescription,
    system,
    prompt,
  });
}
