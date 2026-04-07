import { describe, expect, it } from 'vitest';

import { getKeywordHighlightRanges } from '@/components/editor/plugins/keyword-highlight-kit';

describe('getKeywordHighlightRanges', () => {
  it('matches exact focus keyword occurrences', () => {
    const text = 'Un avocat aide un avocat en entreprise.';
    const ranges = getKeywordHighlightRanges(text, [
      { term: 'avocat', kind: 'focus' },
    ]);

    expect(ranges).toHaveLength(2);
    expect(ranges.every((range) => range.kind === 'focus')).toBe(true);
  });

  it('matches accent-insensitive longtail occurrences', () => {
    const text = 'Guide complet sur le droit du travail en France.';
    const ranges = getKeywordHighlightRanges(text, [
      { term: 'drôit du travaïl', kind: 'longtail' },
    ]);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]?.kind).toBe('longtail');
  });

  it('matches case-insensitive keyword occurrences', () => {
    const text = 'AVOCAT spécialisé en droit social.';
    const ranges = getKeywordHighlightRanges(text, [
      { term: 'avocat', kind: 'focus' },
    ]);

    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0]!.start, ranges[0]!.end)).toBe('AVOCAT');
  });
});
