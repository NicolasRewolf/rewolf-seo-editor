import './load-env';

import { serve } from '@hono/node-server';
import { createApp } from './app/hono-app';

const PORT = Number(process.env.PORT) || 8787;
const app = createApp({ port: PORT });

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
