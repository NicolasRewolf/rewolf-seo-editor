import { convertToModelMessages, type UIMessage } from 'ai';

import {
  resolveCommandRouting,
  resolveObjectModelRouting,
  resolveStreamRouting,
} from '../../../shared/ai';
import {
  SEO_EDITOR_PROMPT,
  SEO_JSONLD_BUNDLE_PROMPT,
  SEO_JSONLD_PROMPT,
  SEO_META_PROMPT,
} from '../../../shared/ai';
import {
  aiJsonLdBlogSchema,
  aiJsonLdBundleSchema,
  aiMetaScoredObjectSchema,
  type AiProvider,
  type AiStreamBody,
  type AiTaskGroup,
} from '../../../shared/contracts';
import { generateObjectWithProvider, streamWithProvider } from './ai.repository';

/** Garde-fou : évite requêtes trop massives (502 gateway, erreurs fournisseur). */
const STREAM_MESSAGE_MAX_CHARS = 110_000;

type AiKeys = {
  anthropicKey: string | undefined;
  openaiKey: string | undefined;
};

function stringifyCtx(ctx: unknown): string {
  if (ctx == null) return '';
  try {
    const value = JSON.stringify(ctx);
    if (value.length > 12000) return `${value.slice(0, 12000)}…[tronqué]`;
    return value;
  } catch {
    return '';
  }
}

function clampStreamMessages(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return messages.map((m) => {
    if (m.content.length <= STREAM_MESSAGE_MAX_CHARS) return m;
    return {
      ...m,
      content: `${m.content.slice(0, STREAM_MESSAGE_MAX_CHARS)}\n\n[… tronqué côté serveur (${m.content.length} car.) …]`,
    };
  });
}

export async function runCommandStream(params: {
  messages: unknown[];
  ctx: unknown;
  providerPref: AiProvider | undefined;
  taskGroup: AiTaskGroup | undefined;
  modelOverride: string | undefined;
  keys: AiKeys;
}) {
  const { messages, ctx, providerPref, taskGroup, modelOverride, keys } = params;
  const system = `${SEO_EDITOR_PROMPT}

Contexte technique (document Slate + sélection) :
${stringifyCtx(ctx)}`;

  const withoutIds = messages.map((m) => {
    const msg = { ...(m as UIMessage & { id?: string }) };
    delete (msg as { id?: string }).id;
    return msg;
  }) as Omit<UIMessage, 'id'>[];

  const modelMessages = await convertToModelMessages(withoutIds);
  const resolved = resolveCommandRouting(taskGroup, providerPref, modelOverride, {
    anthropic: !!keys.anthropicKey,
    openai: !!keys.openaiKey,
  });
  if ('error' in resolved) return resolved;

  const provider = resolved.useAnthropic ? 'anthropic' : 'openai';
  const apiKey = resolved.useAnthropic ? keys.anthropicKey : keys.openaiKey;
  if (!apiKey) {
    return {
      error: resolved.useAnthropic
        ? 'ANTHROPIC_API_KEY manquante'
        : 'OPENAI_API_KEY manquante',
    };
  }

  const result = streamWithProvider({
    provider,
    apiKey,
    modelId: resolved.modelId,
    system,
    messages: modelMessages as Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>,
  });
  return { result };
}

export async function runObjectGeneration(params: {
  mode: 'meta-scored' | 'jsonld-blog' | 'jsonld-bundle';
  context: string;
  modelOverride: string | undefined;
  keys: AiKeys;
}) {
  const { mode, context, modelOverride, keys } = params;
  const route = resolveObjectModelRouting({
    anthropic: !!keys.anthropicKey,
    openai: !!keys.openaiKey,
  });
  if ('error' in route) return route;

  const provider = route.kind;
  const apiKey = provider === 'openai' ? keys.openaiKey : keys.anthropicKey;
  if (!apiKey) {
    return {
      error: provider === 'openai' ? 'OPENAI_API_KEY manquante' : 'ANTHROPIC_API_KEY manquante',
    };
  }

  const modelId = modelOverride ?? route.modelId;
  if (mode === 'meta-scored') {
    const { object } = await generateObjectWithProvider({
      provider,
      apiKey,
      modelId,
      schema: aiMetaScoredObjectSchema,
      schemaName: 'MetaVariantsScored',
      schemaDescription:
        'Trois titres et trois descriptions meta avec score SEO 0–100 et longueur.',
      system: SEO_META_PROMPT,
      prompt: `Contexte article :\n${context}`,
    });
    return { object };
  }

  if (mode === 'jsonld-blog') {
    const { object } = await generateObjectWithProvider({
      provider,
      apiKey,
      modelId,
      schema: aiJsonLdBlogSchema,
      schemaName: 'BlogPostingJsonLd',
      schemaDescription: 'JSON-LD BlogPosting schema.org',
      system: SEO_JSONLD_PROMPT,
      prompt: `Contexte article :\n${context}`,
    });
    return { object };
  }

  const { object } = await generateObjectWithProvider({
    provider,
    apiKey,
    modelId,
    schema: aiJsonLdBundleSchema,
    schemaName: 'SeoJsonLdBundle',
    schemaDescription:
      'BlogPosting obligatoire ; FAQPage et HowTo seulement si le contenu le justifie.',
    system: SEO_JSONLD_PROMPT,
    prompt: `${SEO_JSONLD_BUNDLE_PROMPT}\n\nContexte article :\n${context}`,
  });
  return { object };
}

export function runTextStream(params: { body: AiStreamBody; keys: AiKeys }) {
  const { body, keys } = params;
  const resolved = resolveStreamRouting(body.taskGroup, body.provider, body.model, {
    anthropic: !!keys.anthropicKey,
    openai: !!keys.openaiKey,
  });
  if ('error' in resolved) return resolved;

  const apiKey = resolved.provider === 'anthropic' ? keys.anthropicKey : keys.openaiKey;
  if (!apiKey) {
    return {
      error:
        resolved.provider === 'anthropic'
          ? 'ANTHROPIC_API_KEY manquante'
          : 'OPENAI_API_KEY manquante',
    };
  }

  const messages = clampStreamMessages(body.messages);
  const result = streamWithProvider({
    provider: resolved.provider,
    apiKey,
    modelId: resolved.modelId,
    messages,
    onError: (error) => {
      if (resolved.provider === 'anthropic') {
        console.error('[ai/stream] Anthropic', error);
      } else {
        console.error('[ai/stream] OpenAI', error);
      }
    },
  });
  return { result };
}
