import './load-env';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { agentRoutes } from './routes/agent';
import { aiRoutes } from './routes/ai';
import { articlesRoutes } from './routes/articles';
import { readerRoutes } from './routes/reader';
import { serpRoutes } from './routes/serp';

const PORT = Number(process.env.PORT) || 8787;

function envConfigured(name: string): boolean {
  const v = process.env[name];
  return typeof v === 'string' && v.trim().length > 0;
}

const app = new Hono();

/** Racine HTTP : utile pour vérifier que le bon process écoute (sans /api). */
app.get('/', (c) =>
  c.json({
    ok: true,
    service: 'rewolf-seo-editor-api',
    health: '/api/health',
    port: PORT,
  })
);

function isDevBrowserOrigin(origin: string): boolean {
  const isPrivateIpv4 = (hostname: string): boolean => {
    const parts = hostname.split('.');
    if (parts.length !== 4) return false;
    const octets = parts.map((p) => Number(p));
    if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return false;
    }
    const [a, b] = octets;
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  };

  try {
    const u = new URL(origin);
    const isHttp = u.protocol === 'http:' || u.protocol === 'https:';
    if (!isHttp) return false;
    const host = u.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      isPrivateIpv4(host)
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
      return undefined;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'rewolf-seo-editor-api',
    port: PORT,
    /** Indique si une valeur non vide est chargée (sans jamais exposer la clé). */
    env: {
      SERPER_API_KEY: envConfigured('SERPER_API_KEY'),
      ANTHROPIC_API_KEY: envConfigured('ANTHROPIC_API_KEY'),
      OPENAI_API_KEY: envConfigured('OPENAI_API_KEY'),
    },
  })
);

app.route('/api/agent', agentRoutes);
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
    console.log(
      `[rewolf-api] écoute sur http://127.0.0.1:${info.port} — test : curl -s http://127.0.0.1:${info.port}/api/health`
    );
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
