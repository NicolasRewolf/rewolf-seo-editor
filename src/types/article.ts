import type { InternalLinksMap } from '@/types/internal-links';
import type { KnowledgeBase } from '@/types/knowledge-base';

/** Intention de recherche (brief stratégique). */
export type SearchIntent =
  | 'informational'
  | 'transactional'
  | 'navigational'
  | 'commercial';

/** Phase funnel (brief). */
export type FunnelStage = 'awareness' | 'consideration' | 'decision';

/** Brief éditorial — mot-clé et cibles ; saisi avant le plan. */
export type ArticleBrief = {
  focusKeyword: string;
  longTailKeywords: string[];
  searchIntent: SearchIntent | null;
  funnelStage: FunnelStage | null;
  targetAudience: string;
  destinationUrl: string;
  brandVoice: string;
  businessGoal: string;
};

export type ArticleMeta = {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  /** Si false, le slug est régénéré depuis le title tag */
  slugLocked: boolean;
};

export function defaultArticleBrief(): ArticleBrief {
  return {
    focusKeyword: '',
    longTailKeywords: [],
    searchIntent: null,
    funnelStage: null,
    targetAudience: '',
    destinationUrl: '',
    brandVoice: '',
    businessGoal: '',
  };
}

/** Type legacy pour migration depuis localStorage / JSON disque. */
export type LegacyArticleMeta = ArticleMeta & { focusKeyword?: string };

/**
 * Migre un meta chargé depuis l’ancien format (focusKeyword dans meta).
 */
export function splitLegacyMeta(raw: LegacyArticleMeta): {
  meta: ArticleMeta;
  briefPatch: Partial<ArticleBrief>;
} {
  const { focusKeyword, ...rest } = raw;
  const meta = rest as ArticleMeta;
  const kw =
    typeof focusKeyword === 'string' && focusKeyword.trim()
      ? focusKeyword.trim()
      : '';
  return {
    meta,
    briefPatch: kw ? { focusKeyword: kw } : {},
  };
}

export type StoredArticleEnvelope = {
  id: string;
  meta: ArticleMeta;
  brief?: ArticleBrief;
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
