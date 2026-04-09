import { z } from 'zod';

export const articleSlugRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,126}$/;

export const searchIntentSchema = z.enum([
  'informational',
  'transactional',
  'navigational',
  'commercial',
]);

export const funnelStageSchema = z.enum([
  'awareness',
  'consideration',
  'decision',
]);

export const articleBriefSchema = z.object({
  focusKeyword: z.string(),
  longTailKeywords: z.array(z.string()),
  searchIntent: searchIntentSchema.nullable(),
  funnelStage: funnelStageSchema.nullable(),
  targetAudience: z.string(),
  destinationUrl: z.string(),
  brandVoice: z.string(),
  businessGoal: z.string(),
});

export const articleMetaSchema = z.object({
  metaTitle: z.string(),
  metaDescription: z.string(),
  slug: z.string(),
  slugLocked: z.boolean(),
});

/**
 * Legacy compatibility: older persisted payloads may include `focusKeyword` in meta.
 */
export const legacyArticleMetaSchema = articleMetaSchema.extend({
  focusKeyword: z.string().optional(),
});

export const competitorResultSchema = z.object({
  url: z.string(),
  title: z.string(),
  wordCount: z.number(),
  keywordDensity: z.number(),
});

export const competitorSnapshotSchema = z.object({
  keyword: z.string(),
  fetchedAt: z.string(),
  avgWordCount: z.number(),
  results: z.array(competitorResultSchema),
});

export const articleBodySchema = z.object({
  id: z.string().optional(),
  meta: legacyArticleMetaSchema,
  brief: articleBriefSchema.optional(),
  content: z.array(z.unknown()),
  seoScore: z.number().nullable().optional(),
  competitorData: competitorSnapshotSchema.nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  exportedAt: z.string().optional(),
});

export const storedArticleEnvelopeSchema = z.object({
  id: z.string(),
  meta: articleMetaSchema,
  brief: articleBriefSchema.optional(),
  content: z.unknown(),
  seoScore: z.number().nullable(),
  competitorData: competitorSnapshotSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  knowledgeBase: z.unknown().optional(),
  internalLinks: z.unknown().optional(),
});

export type SearchIntent = z.infer<typeof searchIntentSchema>;
export type FunnelStage = z.infer<typeof funnelStageSchema>;
export type ArticleBrief = z.infer<typeof articleBriefSchema>;
export type ArticleMeta = z.infer<typeof articleMetaSchema>;
export type LegacyArticleMeta = z.infer<typeof legacyArticleMetaSchema>;
export type CompetitorResult = z.infer<typeof competitorResultSchema>;
export type CompetitorSnapshot = z.infer<typeof competitorSnapshotSchema>;
export type ArticleBody = z.infer<typeof articleBodySchema>;
export type StoredArticleEnvelope = z.infer<typeof storedArticleEnvelopeSchema>;
