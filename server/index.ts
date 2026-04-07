import 'dotenv/config';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { aiRoutes } from './routes/ai';
import { articlesRoutes } from './routes/articles';
import { readerRoutes } from './routes/reader';
import { serpRoutes } from './routes/serp';

const PORT = Number(process.env.PORT) || 8787;

const app = new Hono();

function isDevBrowserOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
      (u.protocol === 'http:' || u.protocol === 'https:')
    );
  } catch {
    return false;
  }
}

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (isDevBrowserOrigin(origin)) return origin;
      return false;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'rewolf-seo-editor-api', port: PORT })
);

app.route('/api/ai', aiRoutes);
app.route('/api/articles', articlesRoutes);
app.route('/api/serp', serpRoutes);
app.route('/api/reader', readerRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`[rewolf-api] http://127.0.0.1:${info.port}`);
  }
);

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[rewolf-api] Le port ${PORT} est déjà utilisé. Arrêtez l'autre processus (ex. ancien \`npm run server\`) ou définissez PORT=8788.`
    );
  } else {
    console.error('[rewolf-api]', err);
  }
  process.exit(1);
});
