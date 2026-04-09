import '../load-env';

import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    SERPER_API_KEY: z.string().min(1, 'SERPER_API_KEY manquante'),
    ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY manquante'),
    OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY manquante'),
    DATABASE_URL: z.string().url('DATABASE_URL doit être une URL valide').optional(),
    ANTHROPIC_MANAGED_AGENT_ID: z.string().min(1).optional(),
    ANTHROPIC_MANAGED_ENVIRONMENT_ID: z.string().min(1).optional(),
  })
  .transform((values) => ({
    ...values,
    DATABASE_URL: values.DATABASE_URL?.trim() || undefined,
    ANTHROPIC_MANAGED_AGENT_ID: values.ANTHROPIC_MANAGED_AGENT_ID?.trim() || undefined,
    ANTHROPIC_MANAGED_ENVIRONMENT_ID:
      values.ANTHROPIC_MANAGED_ENVIRONMENT_ID?.trim() || undefined,
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
  throw new Error(`[env] Configuration invalide.\n${formatted}`);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
