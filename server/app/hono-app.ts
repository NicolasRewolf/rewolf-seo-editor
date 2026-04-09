import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { agentRoutes } from '../routes/agent';
import { aiRoutes } from '../routes/ai';
import { articlesRoutes } from '../routes/articles';
import { readerRoutes } from '../routes/reader';
import { serpRoutes } from '../routes/serp';

type CreateAppOptions = {
  port: number;
};

function envConfigured(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

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
    const url = new URL(origin);
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
    if (!isHttp) return false;
    const host = url.hostname.toLowerCase();
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

export function createApp({ port }: CreateAppOptions): Hono {
  const app = new Hono();

  app.get('/', (c) =>
    c.json({
      ok: true,
      service: 'rewolf-seo-editor-api',
      health: '/api/health',
      port,
    })
  );

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
      port,
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

  return app;
}
