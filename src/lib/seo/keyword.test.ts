import { describe, expect, it } from 'vitest';

import { analyzeOnPage, countPhraseInTextStemmed } from '@/lib/seo/keyword';
import type { SeoAnalysisPayload } from '@/types/seo';

function payload(partial?: Partial<SeoAnalysisPayload>): SeoAnalysisPayload {
  return {
    plainText:
      'Un avocat accompagne des avocats et une avocate en droit du travail.',
    focusKeyword: 'avocat',
    metaTitle: 'Guide avocat droit du travail',
    metaDescription: 'Description',
    slug: 'guide-avocat-droit-travail',
    titlePx: 420,
    metaDescPx: 820,
    headings: [
      { level: 1, text: 'Avocat droit du travail' },
      { level: 2, text: 'Choisir un avocat spécialisé' },
    ],
    headingsWithWordOffsets: [
      { level: 1, text: 'Avocat droit du travail', wordOffset: 0 },
      { level: 2, text: 'Choisir un avocat spécialisé', wordOffset: 50 },
    ],
    firstParagraph: 'Un avocat vous aide à sécuriser vos démarches.',
    wordCount: 80,
    internalLinks: 0,
    externalLinks: 0,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    ...partial,
  };
}

describe('keyword stemming density', () => {
  it('counts stemmed variants for single keyword', () => {
    const text = 'avocat avocats avocate AVOCATS';
    expect(countPhraseInTextStemmed(text, 'avocat')).toBe(4);
  });

  it('counts stemmed variants for multi-word phrase', () => {
    const text =
      'Un avocat du travail conseille. Deux avocats du travail répondent.';
    expect(countPhraseInTextStemmed(text, 'avocat du travail')).toBe(2);
  });

  it('uses stemmed counting for kw-density criterion', () => {
    const result = analyzeOnPage(
      payload({
        plainText: "Cette section parle des avocats et d'une avocate en detail.",
        focusKeyword: 'avocat',
        wordCount: 20,
      })
    );

    const densityCriterion = result.criteria.find((c) => c.id === 'kw-density');
    expect(densityCriterion).toBeDefined();
    expect(densityCriterion?.detail).toContain('Environ');
    const match = densityCriterion?.detail.match(/Environ\s+([0-9]+(?:\.[0-9]+)?)\s*%/);
    expect(match).not.toBeNull();
    expect(Number(match?.[1] ?? '0')).toBeGreaterThan(0);
  });
});
