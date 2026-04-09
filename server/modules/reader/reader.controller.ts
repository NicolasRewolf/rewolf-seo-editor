import type { Context } from 'hono';
import { readUrl } from './reader.service';

export async function readUrlController(c: Context) {
  const url = c.req.query('url');
  if (!url?.trim()) {
    return c.json({ error: 'Paramètre url requis' }, 400);
  }

  const markdown =
    c.req.query('markdown') === '1' || c.req.query('markdown') === 'true';

  const result = await readUrl({ url, markdown });
  if (!result.ok) {
    return c.json({ error: result.error }, result.status);
  }

  return c.text(result.text, 200, {
    'Content-Type': result.contentType,
  });
}
