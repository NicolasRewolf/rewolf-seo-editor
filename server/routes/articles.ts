import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Hono } from 'hono';
import {
  articleBodySchema,
  articleSlugRegex,
  type ArticleBody,
} from '../../shared/contracts';

function dataDir(): string {
  return join(process.cwd(), 'data', 'articles');
}

function pathForSlug(slug: string): string {
  return join(dataDir(), `${slug}.json`);
}

function isValidSlug(slug: string): boolean {
  return articleSlugRegex.test(slug);
}

export const articlesRoutes = new Hono();

articlesRoutes.get('/', async (c) => {
  try {
    await mkdir(dataDir(), { recursive: true });
    const names = await readdir(dataDir());
    const slugs = names
      .filter((n) => n.endsWith('.json'))
      .map((n) => n.slice(0, -5))
      .filter((s) => isValidSlug(s))
      .sort((a, b) => a.localeCompare(b));
    return c.json({ slugs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur lecture data/articles';
    return c.json({ error: msg }, 500);
  }
});

articlesRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!slug || !isValidSlug(slug)) {
    return c.json({ error: 'Slug invalide' }, 400);
  }
  try {
    const raw = await readFile(pathForSlug(slug), 'utf8');
    const data: unknown = JSON.parse(raw);
    const parsed = articleBodySchema.safeParse(data);
    if (!parsed.success) {
      return c.json({ error: 'JSON article invalide' }, 422);
    }
    return c.json(parsed.data);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return c.json({ error: 'Article introuvable' }, 404);
    }
    const msg = e instanceof Error ? e.message : 'Erreur lecture';
    return c.json({ error: msg }, 500);
  }
});

articlesRoutes.put('/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!slug || !isValidSlug(slug)) {
    return c.json({ error: 'Slug invalide' }, 400);
  }

  let body: ArticleBody;
  try {
    body = articleBodySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Corps JSON invalide' }, 400);
  }

  if (body.meta.slug !== slug) {
    return c.json(
      { error: "Le slug d'URL et meta.slug doivent etre identiques." },
      400
    );
  }

  try {
    await mkdir(dataDir(), { recursive: true });

    // Lire l'article existant pour préserver id + createdAt
    let prevId: string | undefined;
    let prevCreatedAt: string | undefined;
    try {
      const existing = JSON.parse(
        await readFile(pathForSlug(slug), 'utf8')
      ) as Record<string, unknown>;
      prevId = existing.id as string | undefined;
      prevCreatedAt = existing.createdAt as string | undefined;
    } catch {
      /* fichier inexistant — première sauvegarde */
    }

    const now = new Date().toISOString();
    const payload = {
      id: body.id ?? prevId ?? crypto.randomUUID(),
      meta: body.meta,
      ...(body.brief != null ? { brief: body.brief } : {}),
      content: body.content,
      seoScore: body.seoScore ?? null,
      competitorData: body.competitorData ?? null,
      createdAt: body.createdAt ?? prevCreatedAt ?? now,
      updatedAt: now,
    };
    await writeFile(
      pathForSlug(slug),
      `${JSON.stringify(payload, null, 2)}\n`,
      'utf8'
    );
    return c.json({ ok: true, slug });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur écriture';
    return c.json({ error: msg }, 500);
  }
});
