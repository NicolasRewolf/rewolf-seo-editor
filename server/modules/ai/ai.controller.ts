import type { Context } from 'hono';

import { aiObjectModeSchema, aiStreamBodySchema, type AiProvider } from '@shared/core';
import { env } from '../../lib/env';
import { runCommandStream, runObjectGeneration, runTextStream } from './ai.service';

function getAiKeys() {
  return {
    anthropicKey: env.ANTHROPIC_API_KEY,
    openaiKey: env.OPENAI_API_KEY,
  };
}

export async function commandController(c: Context) {
  let raw: Record<string, unknown>;
  try {
    raw = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'JSON invalide' }, 400);
  }

  const messages = raw.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: 'messages requis' }, 400);
  }

  const ctx = raw.ctx;
  const mergedBody =
    typeof raw.body === 'object' && raw.body
      ? (raw.body as Record<string, unknown>)
      : null;
  const providerRaw =
    (raw.provider as string | undefined) ?? (mergedBody?.provider as string | undefined);
  const providerPref: AiProvider | undefined =
    providerRaw === 'anthropic' || providerRaw === 'openai' ? providerRaw : undefined;
  const taskGroupRaw =
    (raw.taskGroup as string | undefined) ??
    (mergedBody?.taskGroup as string | undefined);
  const taskGroup =
    taskGroupRaw === 'fast' || taskGroupRaw === 'quality'
      ? taskGroupRaw
      : undefined;
  const modelOverride = raw.model as string | undefined;

  try {
    const result = await runCommandStream({
      messages,
      ctx,
      providerPref,
      taskGroup,
      modelOverride,
      keys: getAiKeys(),
    });
    if ('error' in result) {
      return c.json({ error: result.error }, 503);
    }
    return result.result.toUIMessageStreamResponse();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur commande IA';
    return c.json({ error: msg }, 500);
  }
}

export async function objectController(c: Context) {
  let raw: Record<string, unknown>;
  try {
    raw = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'JSON invalide' }, 400);
  }

  const modeRaw = raw.mode as string | undefined;
  const modeParse = aiObjectModeSchema.safeParse(modeRaw);
  const mode = modeParse.success ? modeParse.data : undefined;
  const context = raw.context as string | undefined;
  const modelOverride = raw.model as string | undefined;

  if (!mode || !context?.trim()) {
    return c.json({ error: 'mode et context requis' }, 400);
  }

  try {
    const result = await runObjectGeneration({
      mode,
      context,
      modelOverride,
      keys: getAiKeys(),
    });
    if ('error' in result) {
      return c.json({ error: result.error }, 503);
    }
    return c.json({ object: result.object });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur generateObject';
    return c.json({ error: msg }, 500);
  }
}

export async function streamController(c: Context) {
  let body: ReturnType<typeof aiStreamBodySchema.parse>;
  try {
    body = aiStreamBodySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  try {
    const result = runTextStream({ body, keys: getAiKeys() });
    if ('error' in result) {
      return c.json({ error: result.error }, 503);
    }
    return result.result.toTextStreamResponse();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur stream IA';
    return c.json({ error: msg }, 500);
  }
}
