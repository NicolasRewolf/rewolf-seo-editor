import type { Context } from 'hono';
import { articleBodySchema, type ArticleBody } from '../../../shared/contracts';
import {
  getArticleBySlug,
  listArticles,
  saveArticleBySlug,
} from './articles.service';

export async function listArticlesController(c: Context) {
  const result = await listArticles();
  if (!result.ok) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json({ slugs: result.slugs });
}

export async function getArticleController(c: Context) {
  const slug = c.req.param('slug') ?? '';
  const result = await getArticleBySlug(slug);
  if (!result.ok) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.article);
}

export async function putArticleController(c: Context) {
  const slug = c.req.param('slug') ?? '';

  let body: ArticleBody;
  try {
    body = articleBodySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  const result = await saveArticleBySlug(slug, body);
  if (!result.ok) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json({ ok: true, slug: result.slug });
}
