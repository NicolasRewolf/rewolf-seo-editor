import { apiUrl } from '@/lib/api/base-url';

export type FetchReaderOptions = {
  signal?: AbortSignal;
};

/**
 * Texte Markdown/plain extrait via le proxy Jina (`GET /api/reader?url=`).
 */
export async function fetchReaderContent(
  url: string,
  options?: FetchReaderOptions
): Promise<string> {
  const u = url.trim();
  if (!u) {
    throw new Error('URL vide');
  }

  const res = await fetch(
    `${apiUrl('/api/reader')}?${new URLSearchParams({ url: u })}`,
    { signal: options?.signal }
  );

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
