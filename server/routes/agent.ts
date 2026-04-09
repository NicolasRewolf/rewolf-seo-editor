import { Hono } from 'hono';
import { z } from 'zod';

/**
 * Routes pour Claude Managed Agents (Axe 3).
 *
 * Permet de déléguer des tâches longues (> 2 min) à un agent autonome
 * qui s'exécute dans l'infrastructure Anthropic.
 *
 * Endpoints :
 *   POST /api/agent/session   Crée une session et retourne son ID
 *   GET  /api/agent/session/:id/stream   SSE — streame les événements de la session
 *   GET  /api/agent/session/:id          Statut de la session
 */

const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const BETA_HEADER = 'managed-agents-2026-04-01';
const MODEL = 'claude-sonnet-4-6';

/** Prompt système injecté pour les sessions créées depuis l'éditeur. */
const AGENT_SYSTEM_PROMPT = `Tu es un assistant SEO expert pour REWOLF SEO Editor.
Tu aides à rédiger, optimiser et enrichir des articles SEO en français.
Respecte toujours les consignes de l'utilisateur et produis du contenu optimisé
pour les moteurs de recherche français.`;

const sessionCreateSchema = z.object({
  /** Description de la tâche à confier à l'agent */
  task: z.string().min(1).max(4000),
  /** Contexte optionnel (brief, mots-clés, plan d'article...) */
  context: z
    .object({
      keyword: z.string().optional(),
      title: z.string().optional(),
      outline: z.string().optional(),
      targetLength: z.number().optional(),
    })
    .optional(),
  /** Prompt système personnalisé (remplace le défaut) */
  systemOverride: z.string().max(8000).optional(),
});

function getAnthropicHeaders(apiKey: string): Record<string, string> {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': BETA_HEADER,
    'content-type': 'application/json',
  };
}

export const agentRoutes = new Hono();

/**
 * Crée une session Managed Agents et retourne son ID.
 * Le client peut ensuite streamer les résultats via GET /stream.
 */
agentRoutes.post('/session', async (c) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY non configurée' }, 503);
  }

  let body: z.infer<typeof sessionCreateSchema>;
  try {
    body = sessionCreateSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  const systemPrompt = body.systemOverride ?? AGENT_SYSTEM_PROMPT;

  // Construire le prompt utilisateur avec le contexte si fourni
  let userContent = body.task;
  if (body.context) {
    const ctx = body.context;
    const parts: string[] = [];
    if (ctx.keyword) parts.push(`Mot-clé principal : ${ctx.keyword}`);
    if (ctx.title) parts.push(`Titre : ${ctx.title}`);
    if (ctx.outline) parts.push(`Plan :\n${ctx.outline}`);
    if (ctx.targetLength) parts.push(`Longueur cible : ~${ctx.targetLength} mots`);
    if (parts.length > 0) {
      userContent = `${parts.join('\n')}\n\nTâche : ${body.task}`;
    }
  }

  try {
    // 1. Créer la session
    const createRes = await fetch(`${ANTHROPIC_API_BASE}/v1/sessions`, {
      method: 'POST',
      headers: getAnthropicHeaders(apiKey),
      body: JSON.stringify({
        model: MODEL,
        system: systemPrompt,
        max_turns: 20,
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      console.error('[agent] Erreur création session :', createRes.status, text);
      return c.json({ error: `Erreur API Anthropic : ${createRes.status}` }, 502);
    }

    const session = (await createRes.json()) as { id: string };

    // 2. Envoyer l'événement utilisateur initial
    const eventRes = await fetch(
      `${ANTHROPIC_API_BASE}/v1/sessions/${session.id}/events`,
      {
        method: 'POST',
        headers: getAnthropicHeaders(apiKey),
        body: JSON.stringify({ type: 'user', content: userContent }),
      }
    );

    if (!eventRes.ok) {
      const text = await eventRes.text();
      console.error('[agent] Erreur envoi événement :', eventRes.status, text);
      return c.json({ error: `Erreur envoi tâche : ${eventRes.status}` }, 502);
    }

    return c.json({ sessionId: session.id, status: 'running' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[agent] Erreur :', msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * Proxy SSE — relaie le flux d'événements Anthropic au client frontend.
 * Le client frontend connecte une EventSource à cet endpoint.
 */
agentRoutes.get('/session/:id/stream', async (c) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY non configurée' }, 503);
  }

  const sessionId = c.req.param('id');

  try {
    const upstream = await fetch(
      `${ANTHROPIC_API_BASE}/v1/sessions/${sessionId}/events/stream`,
      {
        method: 'GET',
        headers: {
          ...getAnthropicHeaders(apiKey),
          accept: 'text/event-stream',
        },
      }
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      return c.json({ error: `Session introuvable : ${upstream.status} — ${text}` }, 404);
    }

    // Relayer le flux SSE directement
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
});

/**
 * Retourne le statut d'une session.
 */
agentRoutes.get('/session/:id', async (c) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY non configurée' }, 503);
  }

  const sessionId = c.req.param('id');

  try {
    const res = await fetch(`${ANTHROPIC_API_BASE}/v1/sessions/${sessionId}`, {
      headers: getAnthropicHeaders(apiKey),
    });

    if (!res.ok) {
      return c.json({ error: `Session introuvable : ${res.status}` }, 404);
    }

    return c.json(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    return c.json({ error: msg }, 500);
  }
});
