import type { Context } from 'hono';
import { articleBodySchema, type ArticleBody } from '../../../shared/contracts';
import { AppError } from '../../lib/errors';
import {
  getArticleBySlug,
  listArticles,
  saveArticleBySlug,
} from './articles.service';

export async function listArticlesController(c: Context) {
  const result = await listArticles();
  if (!result.ok) {
    throw new AppError(result.error, result.status, 'INTERNAL_ERROR');
  }
  return c.json({ slugs: result.slugs });
}

export async function getArticleController(c: Context) {
  const slug = c.req.param('slug') ?? '';
  const result = await getArticleBySlug(slug);
  if (!result.ok) {
    const code =
      result.status === 404
        ? 'NOT_FOUND'
        : result.status === 422
          ? 'VALIDATION_ERROR'
          : 'BAD_REQUEST';
    throw new AppError(
      result.error,
      result.status,
      code
    );
  }
  return c.json(result.article);
}

export async function putArticleController(c: Context) {
  const slug = c.req.param('slug') ?? '';

  const body: ArticleBody = articleBodySchema.parse(await c.req.json());

  const result = await saveArticleBySlug(slug, body);
  if (!result.ok) {
    throw new AppError(
      result.error,
      result.status,
      result.status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'
    );
  }
  return c.json({ ok: true, slug: result.slug });
}
