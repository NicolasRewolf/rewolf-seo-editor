import { apiUrl } from '@/lib/api/base-url';

export type CompetitorCorpusPage = {
  url: string;
  wordCount: number;
  ok: boolean;
  error?: string;
  text?: string;
};

export type CompetitorCorpusResponse = {
  query: string;
  organicUrls: string[];
  fetched: number;
  pages: CompetitorCorpusPage[];
};

export type FetchCompetitorCorpusOptions = {
  signal?: AbortSignal;
  num?: number;
  maxFetch?: number;
  gl?: string;
  hl?: string;
};

/**
 * SERP (Serper) → URLs organiques → texte via Reader (Jina), côté serveur.
 */
export async function fetchCompetitorCorpus(
  q: string,
  options?: FetchCompetitorCorpusOptions
): Promise<CompetitorCorpusResponse> {
  const res = await fetch(apiUrl('/api/serp/competitor-corpus'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: q.trim(),
      num: options?.num,
      maxFetch: options?.maxFetch,
      gl: options?.gl,
      hl: options?.hl,
    }),
    signal: options?.signal,
  });

  const data = (await res.json()) as { error?: string } & Partial<CompetitorCorpusResponse>;
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  if (!data.pages || !Array.isArray(data.organicUrls)) {
    throw new Error('Réponse competitor-corpus invalide');
  }
  return data as CompetitorCorpusResponse;
}
