import { apiUrl } from '@/lib/api/base-url';

export type FetchReaderOptions = {
  signal?: AbortSignal;
  /** Si true, Jina renvoie du Markdown (titres # conservés pour analyse). */
  markdown?: boolean;
};

/**
 * Texte plain ou Markdown extrait via le proxy Jina (`GET /api/reader?url=`).
 */
export async function fetchReaderContent(
  url: string,
  options?: FetchReaderOptions
): Promise<string> {
  const u = url.trim();
  if (!u) {
    throw new Error('URL vide');
  }

  const params = new URLSearchParams({ url: u });
  if (options?.markdown) params.set('markdown', '1');

  const res = await fetch(`${apiUrl('/api/reader')}?${params}`, {
    signal: options?.signal,
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

  return res.text();
}
