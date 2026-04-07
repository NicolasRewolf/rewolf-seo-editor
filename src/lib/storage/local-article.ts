import type { Value } from 'platejs';

import type { ArticleMeta, StoredArticleEnvelope } from '@/types/article';
import type { InternalLinksMap } from '@/types/internal-links';
import type { KnowledgeBase } from '@/types/knowledge-base';

const LEGACY_PLATE_KEY = 'rewolf-seo-editor:plate-value';
const ARTICLE_KEY = 'rewolf-seo-editor:article-v1';

/** Format simplifié (localStorage). */
export type StoredArticle = {
  meta: ArticleMeta;
  content: Value;
  knowledgeBase?: KnowledgeBase;
  internalLinks?: InternalLinksMap | null;
};

/** Convertit un StoredArticle en enveloppe complète pour le disque. */
export function toEnvelope(
  article: StoredArticle,
  prev?: Partial<StoredArticleEnvelope>
): StoredArticleEnvelope {
  const now = new Date().toISOString();
  return {
    id: prev?.id ?? crypto.randomUUID(),
    meta: article.meta,
    content: article.content,
    seoScore: prev?.seoScore ?? null,
    competitorData: prev?.competitorData ?? null,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    knowledgeBase: article.knowledgeBase,
    internalLinks: article.internalLinks ?? undefined,
  };
}

const defaultMeta = (): ArticleMeta => ({
  focusKeyword: '',
  metaTitle: '',
  metaDescription: '',
  slug: '',
  slugLocked: false,
});

export function loadStoredArticle(): StoredArticle | null {
  try {
    const raw = localStorage.getItem(ARTICLE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredArticle;
      if (parsed?.content && parsed.meta) {
        return {
          meta: { ...defaultMeta(), ...parsed.meta },
          content: parsed.content,
          knowledgeBase: parsed.knowledgeBase,
          internalLinks: parsed.internalLinks ?? null,
        };
      }
    }
    const legacy = localStorage.getItem(LEGACY_PLATE_KEY);
    if (legacy) {
      return {
        meta: defaultMeta(),
        content: JSON.parse(legacy) as Value,
        knowledgeBase: { sources: [] },
        internalLinks: null,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveStoredArticle(article: StoredArticle) {
  localStorage.setItem(ARTICLE_KEY, JSON.stringify(article));
}

/** @deprecated Utiliser loadStoredArticle */
export function loadPlateValueFromStorage(): Value | null {
  return loadStoredArticle()?.content ?? null;
}

/** @deprecated Utiliser saveStoredArticle */
export function savePlateValueToStorage(value: Value) {
  const prev = loadStoredArticle();
  saveStoredArticle({
    meta: prev?.meta ?? defaultMeta(),
    content: value,
  });
}

/** Téléchargement JSON (équivalent backup manuel vers ./data/) */
export function downloadArticleJson(
  payload: Record<string, unknown>,
  filename: string
) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
