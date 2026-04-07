/** Modèles LLM utilisés par l'éditeur REWOLF. */
export const MODELS = {
  /** Rédaction long-form, réécriture SEO (Claude Sonnet 4.5) */
  quality: 'claude-sonnet-4-5-20250514',
  /** Outlines, meta tags, JSON-LD, scoring rapide (GPT-4.1-mini) */
  fast: 'gpt-4.1-mini',
} as const;

export type AiTaskGroup = 'fast' | 'quality';
