import { Hono } from 'hono';

import {
  commandController,
  objectController,
  streamController,
} from './ai.controller';

export const aiRoutes = new Hono();

aiRoutes.post('/command', commandController);
aiRoutes.post('/object', objectController);
aiRoutes.post('/stream', streamController);
