import { Hono } from 'hono';
import {
  createSessionController,
  sessionStatusController,
  sessionStreamController,
} from './agent.controller';

export const agentRoutes = new Hono();

agentRoutes.post('/session', createSessionController);
agentRoutes.get('/session/:id/stream', sessionStreamController);
agentRoutes.get('/session/:id', sessionStatusController);
