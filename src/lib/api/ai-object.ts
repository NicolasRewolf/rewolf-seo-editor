import type { AiProvider } from '@/lib/api/stream-ai';

export type AiObjectMode = 'meta-scored' | 'jsonld-blog' | 'jsonld-bundle';

export async function aiGenerateObject(
  mode: AiObjectMode,
  context: string,
  provider: AiProvider,
  model?: string
): Promise<unknown> {
  const res = await fetch('/api/ai/object', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, context, provider, model }),
  });
  const data = (await res.json()) as { object?: unknown; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data.object;
}
