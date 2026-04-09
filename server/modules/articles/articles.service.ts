import { type ArticleBody } from '@shared/core';
import { nowIso } from '@shared/core';
import {
  buildStoredArticlePayload,
  fileNamesToSortedSlugs,
  isValidSlug,
  parseArticleJson,
} from './articles.mapper';
import {
  ensureArticlesDir,
  listArticleFileNames,
  readArticleRaw,
  tryReadExistingArticleRecord,
  writeArticleRaw,
} from './articles.repository';

export async function listArticles(): Promise<
  | { ok: true; slugs: string[] }
  | { ok: false; status: 500; error: string }
> {
  try {
    await ensureArticlesDir();
    const names = await listArticleFileNames();
    return { ok: true, slugs: fileNamesToSortedSlugs(names) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur lecture data/articles';
    return { ok: false, status: 500, error: msg };
  }
}

export async function getArticleBySlug(slug: string): Promise<
  | { ok: true; article: ArticleBody }
  | { ok: false; status: 400 | 404 | 422 | 500; error: string }
> {
  if (!slug || !isValidSlug(slug)) {
    return { ok: false, status: 400, error: 'Slug invalide' };
  }
  try {
    const raw = await readArticleRaw(slug);
    const data: unknown = JSON.parse(raw);
    const parsed = parseArticleJson(data);
    if (!parsed.success) {
      return { ok: false, status: 422, error: 'JSON article invalide' };
    }
    return { ok: true, article: parsed.article };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return { ok: false, status: 404, error: 'Article introuvable' };
    }
    const msg = e instanceof Error ? e.message : 'Erreur lecture';
    return { ok: false, status: 500, error: msg };
  }
}

export async function saveArticleBySlug(
  slug: string,
  body: ArticleBody
): Promise<
  | { ok: true; slug: string }
  | { ok: false; status: 400 | 500; error: string }
> {
  if (!slug || !isValidSlug(slug)) {
    return { ok: false, status: 400, error: 'Slug invalide' };
  }
  if (body.meta.slug !== slug) {
    return {
      ok: false,
      status: 400,
      error: "Le slug d'URL et meta.slug doivent etre identiques.",
    };
  }
  try {
    await ensureArticlesDir();
    const existing = await tryReadExistingArticleRecord(slug);
    const prev = {
      id: existing?.id as string | undefined,
      createdAt: existing?.createdAt as string | undefined,
    };
    const now = nowIso();
    const payload = buildStoredArticlePayload(body, prev, now);
    await writeArticleRaw(slug, payload);
    return { ok: true, slug };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur écriture';
    return { ok: false, status: 500, error: msg };
  }
}
