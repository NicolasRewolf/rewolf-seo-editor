import { apiUrl } from '@/lib/api/base-url';
import { ApiError } from '@/lib/error-utils';
import type { AiProvider } from '@/lib/api/stream-ai';
import type { AiObjectMode as SharedAiObjectMode } from '@shared/core';

export type AiObjectMode = SharedAiObjectMode;

export async function aiGenerateObject(
  mode: AiObjectMode,
  context: string,
  provider: AiProvider,
  model?: string
): Promise<unknown> {
  const res = await fetch(apiUrl('/api/ai/object'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, context, provider, model }),
  });
  const data = (await res.json()) as { object?: unknown; error?: string };
  if (!res.ok) {
    throw new ApiError(data.error ?? `HTTP ${res.status}`, { status: res.status });
  }
  return data.object;
}
