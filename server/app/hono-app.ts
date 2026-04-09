import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleError, notFoundHandler } from './error-handler';
import { env } from '../lib/env';

import { agentRoutes } from '../modules/agent/agent.route';
import { aiRoutes } from '../modules/ai/ai.route';
import { articlesRoutes } from '../modules/articles/articles.route';
import { readerRoutes } from '../modules/reader/reader.route';
import { serpRoutes } from '../modules/serp/serp.route';

type CreateAppOptions = {
  port: number;
};

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
  app.onError(handleError);

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
        SERPER_API_KEY: Boolean(env.SERPER_API_KEY),
        ANTHROPIC_API_KEY: Boolean(env.ANTHROPIC_API_KEY),
        OPENAI_API_KEY: Boolean(env.OPENAI_API_KEY),
      },
    })
  );

  app.route('/api/agent', agentRoutes);
  app.route('/api/ai', aiRoutes);
  app.route('/api/articles', articlesRoutes);
  app.route('/api/serp', serpRoutes);
  app.route('/api/reader', readerRoutes);

  app.notFound(notFoundHandler);

  return app;
}
