import { apiUrl } from '@/lib/api/base-url';

/** Flux HTTP 200 mais aucun octet (ex. erreur Anthropic non exposée en JSON). */
export class AiStreamEmptyError extends Error {
  constructor() {
    super(
      'Réponse vide du modèle (flux IA). Vérifiez crédits et clés API, ou changez de fournisseur.'
    );
    this.name = 'AiStreamEmptyError';
  }
}

export type AiProvider = 'anthropic' | 'openai';

export type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * Routage serveur : `fast` → gpt-4.1-mini ; `quality` → Claude Sonnet (ignore le
 * choix utilisateur). Sans `taskGroup`, le serveur suit `provider` (Sonnet vs mini).
 */
export type AiTaskGroup = 'fast' | 'quality';

export type StreamAiOptions = {
  provider: AiProvider;
  /** Si défini, prioritaire sur `provider` (fast = mini, quality = Sonnet). */
  taskGroup?: AiTaskGroup;
  model?: string;
  messages: AiMessage[];
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
};

/**
 * Consomme le flux texte renvoyé par `POST /api/ai/stream` (toTextStreamResponse).
 */
export async function streamAiChat(options: StreamAiOptions): Promise<void> {
  const { provider, taskGroup, model, messages, signal, onDelta } = options;

  const res = await fetch(apiUrl('/api/ai/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, taskGroup, model, messages }),
    signal,
  });

  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const j: unknown = await res.json();
      if (
        j &&
        typeof j === 'object' &&
        'error' in j &&
        typeof (j as { error: unknown }).error === 'string'
      ) {
        msg = (j as { error: string }).error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Réponse vide');
  }

  const decoder = new TextDecoder();
  let totalChars = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.byteLength) {
      const chunk = decoder.decode(value, { stream: true });
      totalChars += chunk.length;
      onDelta(chunk);
    }
  }
  const tail = decoder.decode();
  if (tail) {
    totalChars += tail.length;
    onDelta(tail);
  }
  if (totalChars === 0) {
    throw new AiStreamEmptyError();
  }
}

type FallbackOptions = StreamAiOptions & {
  /** Appelé juste avant le second appel (OpenAI, sans taskGroup). Ex. réinitialiser l’UI / basculer le fournisseur. */
  onFallback?: () => void;
};

/**
 * Si le premier flux est vide alors que la route serveur passait par Anthropic
 * (`provider: anthropic` ou `taskGroup: quality`), retente avec OpenAI + mini.
 * @returns `true` si le second appel a réussi après flux vide sur Anthropic.
 */
export async function streamAiChatWithFallback(
  options: FallbackOptions
): Promise<boolean> {
  const { onFallback, ...opts } = options;
  try {
    await streamAiChat(opts);
    return false;
  } catch (e) {
    if (!(e instanceof AiStreamEmptyError)) throw e;
    const routedViaAnthropic =
      opts.provider === 'anthropic' || opts.taskGroup === 'quality';
    if (!routedViaAnthropic) throw e;
    onFallback?.();
    try {
      await streamAiChat({
        ...opts,
        provider: 'openai',
        taskGroup: undefined,
      });
      return true;
    } catch (e2) {
      if (e2 instanceof AiStreamEmptyError) {
        throw new Error(
          'Réponse vide avec OpenAI aussi. Vérifiez OPENAI_API_KEY et les crédits.'
        );
      }
      throw e2;
    }
  }
}
