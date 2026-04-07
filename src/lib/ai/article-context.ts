import type { ArticleBrief, ArticleMeta } from '@/types/article';
import type { KnowledgeBase } from '@/types/knowledge-base';

import { buildKbContextBlock } from '@/lib/knowledge-base/kb-text';

export const CONTEXT_MAX_CHARS = 14_000;
export const KB_INJECTION_MAX_CHARS = 6000;

export function buildArticleContextBlock(
  meta: ArticleMeta,
  brief: ArticleBrief,
  markdown: string
): string {
  const md =
    markdown.length > CONTEXT_MAX_CHARS
      ? `${markdown.slice(0, CONTEXT_MAX_CHARS)}\n\n[… contenu tronqué …]`
      : markdown;
  return [
    `Mot-clé principal : ${brief.focusKeyword || '(non défini)'}`,
    `Slug : ${meta.slug || '(non défini)'}`,
    `Meta title : ${meta.metaTitle || '(vide)'}`,
    `Meta description : ${meta.metaDescription || '(vide)'}`,
    '',
    '--- Contenu (Markdown) ---',
    md,
  ].join('\n');
}

export function buildArticleContextWithKb(
  meta: ArticleMeta,
  markdown: string,
  kb: KnowledgeBase,
  brief: ArticleBrief
): string {
  const base = buildArticleContextBlock(meta, brief, markdown);
  const kbBlock = buildKbContextBlock(kb, KB_INJECTION_MAX_CHARS);
  return kbBlock ? `${base}\n\n${kbBlock}` : base;
}
