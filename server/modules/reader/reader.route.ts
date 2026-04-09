import { Hono } from 'hono';
import { readUrlController } from './reader.controller';

export const readerRoutes = new Hono();

readerRoutes.get('/', readUrlController);
