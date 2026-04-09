import { z } from 'zod';

export const aiProviderSchema = z.enum(['anthropic', 'openai']);
export const aiTaskGroupSchema = z.enum(['fast', 'quality']);
export const aiMessageRoleSchema = z.enum(['system', 'user', 'assistant']);

export const aiMessageSchema = z.object({
  role: aiMessageRoleSchema,
  content: z.string(),
});

/**
 * Payload utilisé par /api/ai/stream.
 * Le serveur exige taskGroup ou provider.
 */
export const aiStreamBodySchema = z
  .object({
    provider: aiProviderSchema.optional(),
    taskGroup: aiTaskGroupSchema.optional(),
    model: z.string().optional(),
    messages: z.array(aiMessageSchema).min(1),
  })
  .refine((d) => d.taskGroup != null || d.provider != null, {
    message: 'provider ou taskGroup requis',
    path: ['provider'],
  });

/**
 * Payload compatible /api/ai/command (transport Plate + AI SDK UI).
 * Les champs provider/taskGroup peuvent être au niveau racine ou body.
 */
export const aiCommandBodySchema = z.object({
  id: z.string().optional(),
  trigger: z.string().optional(),
  ctx: z.unknown().optional(),
  provider: aiProviderSchema.optional(),
  taskGroup: aiTaskGroupSchema.optional(),
  model: z.string().optional(),
  body: z
    .object({
      provider: aiProviderSchema.optional(),
      taskGroup: aiTaskGroupSchema.optional(),
    })
    .passthrough()
    .optional(),
  messages: z.array(z.record(z.string(), z.unknown())).min(1),
});

export const aiObjectModeSchema = z.enum([
  'meta-scored',
  'jsonld-blog',
  'jsonld-bundle',
]);

/**
 * Payload utilisé par /api/ai/object.
 */
export const aiObjectBodySchema = z.object({
  mode: aiObjectModeSchema,
  context: z.string().min(1),
  model: z.string().optional(),
});

export const aiMetaVariantSchema = z.object({
  text: z.string(),
  length: z.number(),
  score: z.number().min(0).max(100),
  reason: z.string(),
});

export const aiMetaScoredObjectSchema = z.object({
  titleVariants: z.array(aiMetaVariantSchema).min(3).max(3),
  descriptionVariants: z.array(aiMetaVariantSchema).min(3).max(3),
});

export const aiJsonLdBlogSchema = z.object({
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

export const aiJsonLdFaqMainEntitySchema = z.object({
  '@type': z.literal('Question'),
  name: z.string(),
  acceptedAnswer: z.object({
    '@type': z.literal('Answer'),
    text: z.string(),
  }),
});

export const aiJsonLdFaqPageSchema = z.object({
  '@context': z.literal('https://schema.org'),
  '@type': z.literal('FAQPage'),
  mainEntity: z.array(aiJsonLdFaqMainEntitySchema).min(1).max(12),
});

export const aiJsonLdHowToSchema = z.object({
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

export const aiJsonLdBundleSchema = z.object({
  blogPosting: aiJsonLdBlogSchema,
  faqPage: aiJsonLdFaqPageSchema.optional(),
  howTo: aiJsonLdHowToSchema.optional(),
});

export const aiObjectResponseSchema = z.object({
  object: z.unknown(),
});

export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiTaskGroup = z.infer<typeof aiTaskGroupSchema>;
export type AiMessageRole = z.infer<typeof aiMessageRoleSchema>;
export type AiMessage = z.infer<typeof aiMessageSchema>;
export type AiStreamBody = z.infer<typeof aiStreamBodySchema>;
export type AiCommandBody = z.infer<typeof aiCommandBodySchema>;
export type AiObjectMode = z.infer<typeof aiObjectModeSchema>;
export type AiObjectBody = z.infer<typeof aiObjectBodySchema>;
export type AiMetaVariant = z.infer<typeof aiMetaVariantSchema>;
export type AiMetaScoredObject = z.infer<typeof aiMetaScoredObjectSchema>;
export type AiJsonLdBlog = z.infer<typeof aiJsonLdBlogSchema>;
export type AiJsonLdFaqPage = z.infer<typeof aiJsonLdFaqPageSchema>;
export type AiJsonLdHowTo = z.infer<typeof aiJsonLdHowToSchema>;
export type AiJsonLdBundle = z.infer<typeof aiJsonLdBundleSchema>;
export type AiObjectResponse = z.infer<typeof aiObjectResponseSchema>;
