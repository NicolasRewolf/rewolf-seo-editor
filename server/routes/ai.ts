import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  generateObject,
  streamText,
  type UIMessage,
} from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  resolveCommandRouting,
  resolveObjectModelRouting,
  resolveStreamRouting,
} from '../lib/ai-model-routing';
import {
  SEO_EDITOR_PROMPT,
  SEO_JSONLD_BUNDLE_PROMPT,
  SEO_JSONLD_PROMPT,
  SEO_META_PROMPT,
} from '../lib/prompts';

function stringifyCtx(ctx: unknown): string {
  if (ctx == null) return '';
  try {
    const s = JSON.stringify(ctx);
    if (s.length > 12000) return `${s.slice(0, 12000)}…[tronqué]`;
    return s;
  } catch {
    return '';
  }
}

const streamBodySchema = z
  .object({
    provider: z.enum(['anthropic', 'openai']).optional(),
    taskGroup: z.enum(['fast', 'quality']).optional(),
    model: z.string().optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(['system', 'user', 'assistant']),
          content: z.string(),
        })
      )
      .min(1),
  })
  .refine((d) => d.taskGroup != null || d.provider != null, {
    message: 'provider ou taskGroup requis',
    path: ['provider'],
  });

const metaScoredSchema = z.object({
  titleVariants: z
    .array(
      z.object({
        text: z.string(),
        length: z.number(),
        score: z.number().min(0).max(100),
        reason: z.string(),
      })
    )
    .min(3)
    .max(3),
  descriptionVariants: z
    .array(
      z.object({
        text: z.string(),
        length: z.number(),
        score: z.number().min(0).max(100),
        reason: z.string(),
      })
    )
    .min(3)
    .max(3),
});

/** Aligné sur schema.org BlogPosting (types TS via schema-dts côté client). */
const jsonLdBlogSchema = z.object({
  '@context': z.literal('https://schema.org'),
  '@type': z.literal('BlogPosting'),
  headline: z.string(),
  description: z.string(),
  datePublished: z.string().optional(),
  dateModified: z.string().optional(),
  url: z.string().optional(),
  author: z
    .object({
      '@type': z.literal('Person'),
      name: z.string(),
    })
    .optional(),
});

const faqMainEntitySchema = z.object({
  '@type': z.literal('Question'),
  name: z.string(),
  acceptedAnswer: z.object({
    '@type': z.literal('Answer'),
    text: z.string(),
  }),
});

const jsonLdFaqPageSchema = z.object({
  '@context': z.literal('https://schema.org'),
  '@type': z.literal('FAQPage'),
  mainEntity: z.array(faqMainEntitySchema).min(1).max(12),
});

const jsonLdHowToSchema = z.object({
  '@context': z.literal('https://schema.org'),
  '@type': z.literal('HowTo'),
  name: z.string(),
  step: z
    .array(
      z.object({
        '@type': z.literal('HowToStep'),
        name: z.string(),
        text: z.string(),
      })
    )
    .min(1)
    .max(20),
});

const jsonLdBundleSchema = z.object({
  blogPosting: jsonLdBlogSchema,
  faqPage: jsonLdFaqPageSchema.optional(),
  howTo: jsonLdHowToSchema.optional(),
});

export const aiRoutes = new Hono();

/**
 * Endpoint compatible Plate `@platejs/ai` + AI SDK UI (`DefaultChatTransport`).
 * Corps typique : { id, messages, trigger, ctx?, provider?, model? }.
 */
aiRoutes.post('/command', async (c) => {
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
  const providerPref =
    (raw.provider as string | undefined) ?? (mergedBody?.provider as string | undefined);
  const taskGroupRaw =
    (raw.taskGroup as string | undefined) ??
    (mergedBody?.taskGroup as string | undefined);
  const taskGroup =
    taskGroupRaw === 'fast' || taskGroupRaw === 'quality'
      ? taskGroupRaw
      : undefined;
  const modelOverride = raw.model as string | undefined;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const system = `${SEO_EDITOR_PROMPT}

Contexte technique (document Slate + sélection) :
${stringifyCtx(ctx)}`;

  try {
    const withoutIds = messages.map((m) => {
      const msg = { ...(m as UIMessage & { id?: string }) };
      delete (msg as { id?: string }).id;
      return msg;
    }) as Omit<UIMessage, 'id'>[];

    const modelMessages = await convertToModelMessages(withoutIds);

    const resolved = resolveCommandRouting(
      taskGroup,
      providerPref,
      modelOverride,
      { anthropic: !!anthropicKey, openai: !!openaiKey }
    );
    if ('error' in resolved) {
      return c.json({ error: resolved.error }, 503);
    }

    if (resolved.useAnthropic) {
      const anthropic = createAnthropic({ apiKey: anthropicKey! });
      const result = streamText({
        model: anthropic(resolved.modelId),
        system,
        messages: modelMessages,
      });
      return result.toUIMessageStreamResponse();
    }

    const openai = createOpenAI({ apiKey: openaiKey! });
    const result = streamText({
      model: openai(resolved.modelId),
      system,
      messages: modelMessages,
    });
    return result.toUIMessageStreamResponse();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur commande IA';
    return c.json({ error: msg }, 500);
  }
});

/**
 * `generateObject` pour variantes meta scorées et JSON-LD typé (BlogPosting).
 */
aiRoutes.post('/object', async (c) => {
  let raw: Record<string, unknown>;
  try {
    raw = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'JSON invalide' }, 400);
  }

  const mode = raw.mode as string | undefined;
  const context = raw.context as string | undefined;
  const modelOverride = raw.model as string | undefined;

  if (!mode || !context?.trim()) {
    return c.json({ error: 'mode et context requis' }, 400);
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const route = resolveObjectModelRouting({
    anthropic: !!anthropicKey,
    openai: !!openaiKey,
  });
  if ('error' in route) {
    return c.json({ error: route.error }, 503);
  }

  try {
    const model =
      route.kind === 'openai'
        ? createOpenAI({ apiKey: openaiKey! })(modelOverride ?? route.modelId)
        : createAnthropic({ apiKey: anthropicKey! })(
            modelOverride ?? route.modelId
          );

    if (mode === 'meta-scored') {
      const { object } = await generateObject({
        model,
        schema: metaScoredSchema,
        schemaName: 'MetaVariantsScored',
        schemaDescription:
          'Trois titres et trois descriptions meta avec score SEO 0–100 et longueur.',
        system: SEO_META_PROMPT,
        prompt: `Contexte article :\n${context}`,
      });
      return c.json({ object });
    }

    if (mode === 'jsonld-blog') {
      const { object } = await generateObject({
        model,
        schema: jsonLdBlogSchema,
        schemaName: 'BlogPostingJsonLd',
        schemaDescription: 'JSON-LD BlogPosting schema.org',
        system: SEO_JSONLD_PROMPT,
        prompt: `Contexte article :\n${context}`,
      });
      return c.json({ object });
    }

    if (mode === 'jsonld-bundle') {
      const { object } = await generateObject({
        model,
        schema: jsonLdBundleSchema,
        schemaName: 'SeoJsonLdBundle',
        schemaDescription:
          'BlogPosting obligatoire ; FAQPage et HowTo seulement si le contenu le justifie.',
        system: SEO_JSONLD_PROMPT,
        prompt: `${SEO_JSONLD_BUNDLE_PROMPT}\n\nContexte article :\n${context}`,
      });
      return c.json({ object });
    }

    return c.json(
      { error: 'mode inconnu (meta-scored | jsonld-blog | jsonld-bundle)' },
      400
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur generateObject';
    return c.json({ error: msg }, 500);
  }
});

aiRoutes.post('/stream', async (c) => {
  let body: z.infer<typeof streamBodySchema>;
  try {
    body = streamBodySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    const resolved = resolveStreamRouting(
      body.taskGroup,
      body.provider,
      body.model,
      { anthropic: !!anthropicKey, openai: !!openaiKey }
    );
    if ('error' in resolved) {
      return c.json({ error: resolved.error }, 503);
    }

    if (resolved.provider === 'anthropic') {
      const anthropic = createAnthropic({ apiKey: anthropicKey! });
      const result = streamText({
        model: anthropic(resolved.modelId),
        messages: body.messages,
        onError: ({ error }) => {
          console.error('[ai/stream] Anthropic', error);
        },
      });
      return result.toTextStreamResponse();
    }

    const openai = createOpenAI({ apiKey: openaiKey! });
    const result = streamText({
      model: openai(resolved.modelId),
      messages: body.messages,
      onError: ({ error }) => {
        console.error('[ai/stream] OpenAI', error);
      },
    });
    return result.toTextStreamResponse();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur stream IA';
    return c.json({ error: msg }, 500);
  }
});
