import {
  articleBodySchema,
  articleSlugRegex,
  type ArticleBody,
} from '@shared/core';

export function isValidSlug(slug: string): boolean {
  return articleSlugRegex.test(slug);
}

export function fileNamesToSortedSlugs(fileNames: string[]): string[] {
  return fileNames
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -5))
    .filter((slug) => isValidSlug(slug))
    .sort((a, b) => a.localeCompare(b));
}

export function parseArticleJson(data: unknown): {
  success: true;
  article: ArticleBody;
} | {
  success: false;
} {
  const parsed = articleBodySchema.safeParse(data);
  if (!parsed.success) return { success: false };
  return { success: true, article: parsed.data };
}

export function buildStoredArticlePayload(
  body: ArticleBody,
  prev: { id?: string; createdAt?: string },
  nowIso: string
): Record<string, unknown> {
  return {
    id: body.id ?? prev.id ?? crypto.randomUUID(),
    meta: body.meta,
    ...(body.brief != null ? { brief: body.brief } : {}),
    content: body.content,
    seoScore: body.seoScore ?? null,
    competitorData: body.competitorData ?? null,
    createdAt: body.createdAt ?? prev.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
}
