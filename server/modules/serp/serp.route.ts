import { Hono } from 'hono';
import {
  competitorCorpusController,
  searchSerpController,
} from './serp.controller';

export const serpRoutes = new Hono();

serpRoutes.post('/search', searchSerpController);
serpRoutes.post('/competitor-corpus', competitorCorpusController);
