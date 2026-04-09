import type { Context } from 'hono';
import { z } from 'zod';
import { buildCompetitorCorpus, runSerperSearch } from './serp.service';

const bodySchema = z.object({
  q: z.string().min(1),
  num: z.number().int().min(1).max(20).optional(),
  gl: z.string().optional(),
  hl: z.string().optional(),
});

const competitorBodySchema = z.object({
  q: z.string().min(1),
  num: z.number().int().min(1).max(20).optional(),
  maxFetch: z.number().int().min(1).max(10).optional(),
  gl: z.string().optional(),
  hl: z.string().optional(),
});

export async function searchSerpController(c: Context) {
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
    const result = await runSerperSearch({
      apiKey: key,
      q: body.q,
      num: body.num,
      gl: body.gl,
      hl: body.hl,
    });
    if (!result.ok) return c.json(result.body, result.status);
    return c.json(result.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau Serper';
    return c.json({ error: msg }, 500);
  }
}

export async function competitorCorpusController(c: Context) {
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

  try {
    const result = await buildCompetitorCorpus({
      apiKey: key,
      q: body.q,
      num: body.num,
      maxFetch: body.maxFetch,
      gl: body.gl,
      hl: body.hl,
    });
    if (!result.ok) return c.json(result.body, result.status);
    return c.json(result.body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur competitor-corpus';
    return c.json({ error: msg }, 500);
  }
}
