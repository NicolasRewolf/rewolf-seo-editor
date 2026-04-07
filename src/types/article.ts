import type { InternalLinksMap } from '@/types/internal-links';
import type { KnowledgeBase } from '@/types/knowledge-base';

export type ArticleMeta = {
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  /** Si false, le slug est régénéré depuis le title tag */
  slugLocked: boolean;
};

export type StoredArticleEnvelope = {
  id: string;
  meta: ArticleMeta;
  content: unknown; // Plate JSON (Value)
  seoScore: number | null;
  competitorData: CompetitorSnapshot | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  knowledgeBase?: KnowledgeBase;
  internalLinks?: InternalLinksMap;
};

export type CompetitorSnapshot = {
  keyword: string;
  fetchedAt: string; // ISO 8601
  avgWordCount: number;
  results: Array<{
    url: string;
    title: string;
    wordCount: number;
    keywordDensity: number;
  }>;
};
