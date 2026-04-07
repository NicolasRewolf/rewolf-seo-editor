import { apiUrl } from '@/lib/api/base-url';

export type SerpOrganicItem = {
  title?: string;
  link?: string;
  snippet?: string;
};

export type SerpSearchResponse = {
  organic?: SerpOrganicItem[];
};

export async function searchSerp(
  q: string,
  options?: { num?: number; gl?: string; hl?: string }
): Promise<SerpSearchResponse> {
  const res = await fetch(apiUrl('/api/serp/search'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q,
      num: options?.num ?? 8,
      gl: options?.gl ?? 'fr',
      hl: options?.hl ?? 'fr',
    }),
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

  return res.json() as Promise<SerpSearchResponse>;
}
