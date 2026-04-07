import { Hono } from 'hono';
import { z } from 'zod';

import { fetchJinaPlainText } from '../lib/jina';

const bodySchema = z.object({
  q: z.string().min(1),
  num: z.number().int().min(1).max(20).optional(),
  gl: z.string().optional(),
  hl: z.string().optional(),
});

const competitorBodySchema = z.object({
  q: z.string().min(1),
  num: z.number().int().min(1).max(20).optional(),
  /** Nombre max d'URLs organiques à extraire puis à fetch via Reader (Jina). */
  maxFetch: z.number().int().min(1).max(10).optional(),
  gl: z.string().optional(),
  hl: z.string().optional(),
});

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

export const serpRoutes = new Hono();

serpRoutes.post('/search', async (c) => {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    return c.json({ error: 'SERPER_API_KEY manquante' }, 503);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': key,
      },
      body: JSON.stringify({
        q: body.q,
        num: body.num ?? 10,
        gl: body.gl ?? 'fr',
        hl: body.hl ?? 'fr',
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return c.json(
        { error: `Serper ${res.status}`, detail: text.slice(0, 500) },
        502
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return c.json({ error: 'Réponse Serper non JSON' }, 502);
    }

    return c.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau Serper';
    return c.json({ error: msg }, 500);
  }
});

/**
 * SERP → URLs organiques → texte Reader (Jina) pour analyse concurrentielle (Phase 3).
 */
serpRoutes.post('/competitor-corpus', async (c) => {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    return c.json({ error: 'SERPER_API_KEY manquante' }, 503);
  }

  let body: z.infer<typeof competitorBodySchema>;
  try {
    body = competitorBodySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  const num = body.num ?? 10;
  const maxFetch = body.maxFetch ?? 5;

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': key,
      },
      body: JSON.stringify({
        q: body.q,
        num,
        gl: body.gl ?? 'fr',
        hl: body.hl ?? 'fr',
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return c.json(
        { error: `Serper ${res.status}`, detail: text.slice(0, 500) },
        502
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return c.json({ error: 'Réponse Serper non JSON' }, 502);
    }

    const organicUrls = extractOrganicLinks(data);
    const toFetch = organicUrls.slice(0, maxFetch);

    const pages: {
      url: string;
      wordCount: number;
      ok: boolean;
      error?: string;
      text?: string;
    }[] = [];

    for (const url of toFetch) {
      const r = await fetchJinaPlainText(url);
      if (!r.ok) {
        pages.push({
          url,
          wordCount: 0,
          ok: false,
          error: r.error,
        });
        continue;
      }
      const wc = r.text.trim().split(/\s+/).filter(Boolean).length;
      pages.push({
        url,
        wordCount: wc,
        ok: true,
        text: r.text,
      });
    }

    return c.json({
      query: body.q,
      organicUrls,
      fetched: toFetch.length,
      pages,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur competitor-corpus';
    return c.json({ error: msg }, 500);
  }
});
