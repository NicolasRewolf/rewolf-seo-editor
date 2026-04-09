import { apiUrl } from '@/lib/api/base-url';
import type { AiMessage, AiProvider, AiTaskGroup } from '@/lib/api/stream-ai';

export type GenerateAiOptions = {
  provider: AiProvider;
  taskGroup?: AiTaskGroup;
  model?: string;
  messages: AiMessage[];
  signal?: AbortSignal;
};

/**
 * Génère du texte via POST /api/ai/stream et retourne le texte complet accumulé.
 * Contrairement à streamAiChat, cette fonction attend la fin du stream avant de retourner.
 */
export async function generateAiText(
  options: GenerateAiOptions
): Promise<{ text: string }> {
  const { provider, taskGroup, model, messages, signal } = options;

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
  if (!reader) throw new Error('Réponse vide');

  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.byteLength) {
      text += decoder.decode(value, { stream: true });
    }
  }
  text += decoder.decode();

  if (!text) throw new Error('Réponse vide du modèle');
  return { text };
}
