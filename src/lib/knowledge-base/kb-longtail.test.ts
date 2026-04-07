import { describe, expect, it } from 'vitest';

import type { KnowledgeBase } from '@/types/knowledge-base';

import { suggestLongTailFromKb } from './kb-longtail';

const iso = new Date().toISOString();

function src(
  id: string,
  content: string,
  overrides: Partial<{ label: string }> = {}
) {
  return {
    id,
    type: 'text' as const,
    label: overrides.label ?? id,
    content,
    wordCount: content.split(/\s+/).filter(Boolean).length,
    addedAt: iso,
  };
}

describe('suggestLongTailFromKb', () => {
  it('retourne [] sur KB vide', () => {
    const kb: KnowledgeBase = { sources: [] };
    expect(suggestLongTailFromKb(kb, 'avocat', 10)).toEqual([]);
  });

  it('exclut les n-grams contenant un stopword', () => {
    const kb: KnowledgeBase = {
      sources: [
        src(
          'a',
          'le droit du travail à Paris tribunal avocat cabinet contentieux'
        ),
      ],
    };
    const out = suggestLongTailFromKb(kb, 'travail', 20);
    expect(out.some((p) => p.startsWith('le ') || p.includes(' le '))).toBe(
      false
    );
  });

  it('favorise une phrase présente dans plusieurs sources', () => {
    const phrase = 'contentieux prudhommes paris';
    const kb: KnowledgeBase = {
      sources: [
        src('1', `avocat ${phrase} expertise`),
        src('2', `droit ${phrase} procédure`),
      ],
    };
    const out = suggestLongTailFromKb(kb, 'paris', 15);
    expect(out.some((p) => p.includes('prudhommes'))).toBe(true);
  });

  it('respecte max', () => {
    const kb: KnowledgeBase = {
      sources: [
        src(
          '1',
          'avocat droit travail paris lyon marseille tribunal conseil prudhommes'
        ),
      ],
    };
    expect(suggestLongTailFromKb(kb, 'avocat', 3).length).toBeLessThanOrEqual(3);
  });
});
