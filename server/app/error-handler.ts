import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

function normalizeStatus(status: number): 400 | 401 | 403 | 404 | 422 | 500 | 502 | 503 {
  switch (status) {
    case 400:
    case 401:
    case 403:
    case 404:
    case 422:
    case 500:
    case 502:
    case 503:
      return status;
    default:
      return 500;
  }
}

export function handleError(err: Error, c: Context) {
  if (err instanceof AppError) {
    const status = normalizeStatus(err.statusCode);
    console.error('[api:error]', c.req.method, c.req.path, {
      code: err.code,
      status,
      message: err.message,
      details: err.details,
    });
    return c.json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    }, status);
  }

  if (err instanceof ZodError) {
    console.error('[api:error]', c.req.method, c.req.path, {
      code: 'VALIDATION_ERROR',
      status: 400,
      issues: err.issues,
    });
    return c.json({
      error: 'Corps JSON invalide',
      code: 'VALIDATION_ERROR',
      details: err.issues,
    }, 400);
  }

  console.error('[api:error]', c.req.method, c.req.path, err);
  return c.json({
    error: 'Erreur interne',
    code: 'INTERNAL_ERROR',
  }, 500);
}

export function notFoundHandler(c: Context) {
  return c.json(
    {
      error: 'Not found',
      code: 'NOT_FOUND',
    },
    404
  );
}
