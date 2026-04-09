import { Hono } from 'hono';
import {
  getArticleController,
  listArticlesController,
  putArticleController,
} from './articles.controller';

export const articlesRoutes = new Hono();

articlesRoutes.get('/', listArticlesController);
articlesRoutes.get('/:slug', getArticleController);
articlesRoutes.put('/:slug', putArticleController);
