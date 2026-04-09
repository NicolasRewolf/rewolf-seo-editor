import type { Context } from 'hono';
import { z } from 'zod';
import { env, isProd } from '../../lib/env';
import {
  createManagedAgentSession,
  getSessionStatus,
  getSessionStream,
} from './agent.service';

const sessionCreateSchema = z.object({
  task: z.string().min(1).max(4000),
  context: z
    .object({
      keyword: z.string().optional(),
      title: z.string().optional(),
      outline: z.string().optional(),
      targetLength: z.number().optional(),
    })
    .optional(),
  systemOverride: z.string().max(8000).optional(),
});

export async function createSessionController(c: Context) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY non configurée' }, 503);
  }

  let body: z.infer<typeof sessionCreateSchema>;
  try {
    body = sessionCreateSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  try {
    const result = await createManagedAgentSession({
      apiKey,
      task: body.task,
      context: body.context,
      systemOverride: body.systemOverride,
    });
    if (!result.ok) {
      if (isProd) {
        console.error(result.log[0], result.log[1]);
      } else {
        console.error(...result.log);
      }
      return c.json({ error: result.error }, result.status);
    }
    return c.json(result.payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[agent] Erreur :', msg);
    return c.json({ error: msg }, 500);
  }
}

export async function sessionStreamController(c: Context) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY non configurée' }, 503);
  }

  const sessionId = c.req.param('id') ?? '';

  try {
    const upstream = await getSessionStream({ apiKey, sessionId });
    if (!upstream.ok) {
      const text = await upstream.text();
      return c.json({ error: `Session introuvable : ${upstream.status} — ${text}` }, 404);
    }

    return new Response(upstream.body, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'x-accel-buffering': 'no',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur stream';
    return c.json({ error: msg }, 500);
  }
}

export async function sessionStatusController(c: Context) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY non configurée' }, 503);
  }

  const sessionId = c.req.param('id') ?? '';

  try {
    const res = await getSessionStatus({ apiKey, sessionId });
    if (!res.ok) {
      return c.json({ error: `Session introuvable : ${res.status}` }, 404);
    }
    return c.json(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    return c.json({ error: msg }, 500);
  }
}
