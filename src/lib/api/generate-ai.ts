import { apiUrl } from '@/lib/api/base-url';
import type { AiMessage, AiProvider, AiTaskGroup } from '@/lib/api/stream-ai';

export async function generateAiText(options: {
  provider?: AiProvider;
  taskGroup?: AiTaskGroup;
  model?: string;
  messages: AiMessage[];
}): Promise<{ text: string }> {
  const res = await fetch(apiUrl('/api/ai/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
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
      // ignore parse errors and keep status-based message
    }
    throw new Error(msg);
  }

  const data = (await res.json()) as { text?: string };
  if (typeof data.text !== 'string') {
    throw new Error('Réponse IA invalide (texte manquant)');
  }
  return { text: data.text };
}
