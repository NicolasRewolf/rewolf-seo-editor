import type { InternalLinksMap } from '@/types/internal-links';
import type { KnowledgeBase } from '@/types/knowledge-base';
import type {
  ArticleBrief as SharedArticleBrief,
  ArticleMeta as SharedArticleMeta,
  CompetitorSnapshot as SharedCompetitorSnapshot,
  FunnelStage as SharedFunnelStage,
  LegacyArticleMeta as SharedLegacyArticleMeta,
  SearchIntent as SharedSearchIntent,
  StoredArticleEnvelope as SharedStoredArticleEnvelope,
} from '../../shared/contracts';

/** Intention de recherche (brief stratégique). */
export type SearchIntent = SharedSearchIntent;

/** Phase funnel (brief). */
export type FunnelStage = SharedFunnelStage;

/** Brief éditorial — mot-clé et cibles ; saisi avant le plan. */
export type ArticleBrief = SharedArticleBrief;

export type ArticleMeta = SharedArticleMeta;

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
export type LegacyArticleMeta = SharedLegacyArticleMeta;

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

export type CompetitorSnapshot = SharedCompetitorSnapshot;

export type StoredArticleEnvelope = Omit<
  SharedStoredArticleEnvelope,
  'knowledgeBase' | 'internalLinks'
> & {
  knowledgeBase?: KnowledgeBase;
  internalLinks?: InternalLinksMap;
};
