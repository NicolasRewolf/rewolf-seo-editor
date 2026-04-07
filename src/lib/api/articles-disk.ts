import { apiUrl } from '@/lib/api/base-url';
import type { ArticleMeta } from '@/types/article';
import type { Value } from 'platejs';

export type DiskArticlePayload = {
  meta: ArticleMeta;
  content: Value;
  exportedAt?: string;
};

export async function listArticlesOnDisk(): Promise<string[]> {
  const res = await fetch(apiUrl('/api/articles'));
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const j: unknown = await res.json();
      if (
        j &&
        typeof j === 'object' &&
        'error' in j &&
        typeof (j as { error: unknown }).error === 'string'
      ) {
        msg = (j as { error: string }).error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { slugs?: string[] };
  return data.slugs ?? [];
}

export async function getArticleFromDisk(slug: string): Promise<DiskArticlePayload> {
  const res = await fetch(apiUrl(`/api/articles/${encodeURIComponent(slug)}`));
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const j: unknown = await res.json();
      if (
        j &&
        typeof j === 'object' &&
        'error' in j &&
        typeof (j as { error: unknown }).error === 'string'
      ) {
        msg = (j as { error: string }).error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<DiskArticlePayload>;
}

export async function saveArticleToDisk(
  payload: DiskArticlePayload
): Promise<void> {
  const slug = payload.meta.slug.trim();
  if (!slug) {
    throw new Error('Definissez un slug avant enregistrement sur le disque.');
  }

  const res = await fetch(apiUrl(`/api/articles/${encodeURIComponent(slug)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meta: payload.meta,
      content: payload.content,
      exportedAt: payload.exportedAt ?? new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const j: unknown = await res.json();
      if (
        j &&
        typeof j === 'object' &&
        'error' in j &&
        typeof (j as { error: unknown }).error === 'string'
      ) {
        msg = (j as { error: string }).error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}
