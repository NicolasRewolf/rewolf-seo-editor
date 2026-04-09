import { fetchCompetitorText, searchSerper } from './serp.repository';
import { countWords } from '@shared/core';

function extractOrganicLinks(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const org = (data as { organic?: unknown }).organic;
  if (!Array.isArray(org)) return [];
  const links: string[] = [];
  for (const item of org) {
    if (
      item &&
      typeof item === 'object' &&
      'link' in item &&
      typeof (item as { link: unknown }).link === 'string'
    ) {
      links.push((item as { link: string }).link);
    }
  }
  return links;
}

function parseSerperJson(text: string):
  | { ok: true; data: unknown }
  | { ok: false } {
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export async function runSerperSearch(params: {
  apiKey: string;
  q: string;
  num?: number;
  gl?: string;
  hl?: string;
}) {
  const result = await searchSerper({
    apiKey: params.apiKey,
    q: params.q,
    num: params.num ?? 10,
    gl: params.gl ?? 'fr',
    hl: params.hl ?? 'fr',
  });
  if (!result.ok) {
    return {
      ok: false as const,
      status: 502 as const,
      body: { error: `Serper ${result.status}`, detail: result.detail },
    };
  }
  const parsed = parseSerperJson(result.text);
  if (!parsed.ok) {
    return {
      ok: false as const,
      status: 502 as const,
      body: { error: 'Réponse Serper non JSON' },
    };
  }
  return { ok: true as const, data: parsed.data };
}

export async function buildCompetitorCorpus(params: {
  apiKey: string;
  q: string;
  num?: number;
  maxFetch?: number;
  gl?: string;
  hl?: string;
}) {
  const num = params.num ?? 10;
  const maxFetch = params.maxFetch ?? 5;
  const search = await searchSerper({
    apiKey: params.apiKey,
    q: params.q,
    num,
    gl: params.gl ?? 'fr',
    hl: params.hl ?? 'fr',
  });
  if (!search.ok) {
    return {
      ok: false as const,
      status: 502 as const,
      body: { error: `Serper ${search.status}`, detail: search.detail },
    };
  }

  const parsed = parseSerperJson(search.text);
  if (!parsed.ok) {
    return {
      ok: false as const,
      status: 502 as const,
      body: { error: 'Réponse Serper non JSON' },
    };
  }

  const organicUrls = extractOrganicLinks(parsed.data);
  const toFetch = organicUrls.slice(0, maxFetch);
  const pages: {
    url: string;
    wordCount: number;
    ok: boolean;
    error?: string;
    text?: string;
  }[] = [];

  for (const url of toFetch) {
    const r = await fetchCompetitorText(url);
    if (!r.ok) {
      pages.push({ url, wordCount: 0, ok: false, error: r.error });
      continue;
    }
    const wc = countWords(r.text);
    pages.push({ url, wordCount: wc, ok: true, text: r.text });
  }

  return {
    ok: true as const,
    body: {
      query: params.q,
      organicUrls,
      fetched: toFetch.length,
      pages,
    },
  };
}
