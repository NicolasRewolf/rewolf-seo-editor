import { Hono } from 'hono';

import { fetchJinaContent } from '../lib/jina';

export const readerRoutes = new Hono();

readerRoutes.get('/', async (c) => {
  const url = c.req.query('url');
  if (!url?.trim()) {
    return c.json({ error: 'Paramètre url requis' }, 400);
  }

  const md =
    c.req.query('markdown') === '1' || c.req.query('markdown') === 'true';
  const result = await fetchJinaContent(url, md ? 'markdown' : 'plain');
  if (!result.ok) {
    const isClient = result.error.startsWith('Jina ');
    return c.json(
      { error: result.error },
      isClient ? 502 : 400
    );
  }

  return c.text(result.text, 200, {
    'Content-Type': md
      ? 'text/markdown; charset=utf-8'
      : 'text/plain; charset=utf-8',
  });
});
