import { describe, expect, it } from 'vitest';

import { analyzeStructure } from '@/lib/seo/structure';
import type { SeoAnalysisPayload } from '@/types/seo';

function payload(
  overrides?: Partial<SeoAnalysisPayload>
): SeoAnalysisPayload {
  return {
    plainText: 'Texte',
    focusKeyword: 'avocat',
    metaTitle: 'Guide avocat',
    metaDescription: 'description',
    slug: 'guide-avocat',
    titlePx: 100,
    metaDescPx: 200,
    headings: [
      { level: 1, text: 'H1' },
      { level: 2, text: 'Section A' },
      { level: 2, text: 'Section B' },
    ],
    headingsWithWordOffsets: [
      { level: 1, text: 'H1', wordOffset: 0 },
      { level: 2, text: 'Section A', wordOffset: 10 },
      { level: 2, text: 'Section B', wordOffset: 190 },
    ],
    firstParagraph: 'Intro',
    wordCount: 420,
    internalLinks: 2,
    externalLinks: 2,
    imagesTotal: 0,
    imagesMissingAlt: 0,
    ...overrides,
  };
}

describe('analyzeStructure heading intervals', () => {
  it('returns ok for ideal intervals', () => {
    const result = analyzeStructure(
      payload({
        headingsWithWordOffsets: [
          { level: 1, text: 'H1', wordOffset: 0 },
          { level: 2, text: 'Section A', wordOffset: 40 },
          { level: 2, text: 'Section B', wordOffset: 220 },
          { level: 2, text: 'Section C', wordOffset: 410 },
        ],
        wordCount: 620,
      })
    );

    const criterion = result.criteria.find((c) => c.id === 'heading-interval');
    expect(criterion?.status).toBe('ok');
  });

  it('flags very long section when heading is missing', () => {
    const result = analyzeStructure(
      payload({
        headingsWithWordOffsets: [
          { level: 1, text: 'H1', wordOffset: 0 },
          { level: 2, text: 'Bloc unique', wordOffset: 30 },
          { level: 2, text: 'Conclusion', wordOffset: 480 },
        ],
        wordCount: 620,
      })
    );
    const criterion = result.criteria.find((c) => c.id === 'heading-interval');
    expect(criterion?.status).toBe('bad');
    expect(criterion?.detail).toContain('trop longue');
  });

  it('warns when headings are too dense', () => {
    const result = analyzeStructure(
      payload({
        headingsWithWordOffsets: [
          { level: 1, text: 'H1', wordOffset: 0 },
          { level: 2, text: 'A', wordOffset: 20 },
          { level: 2, text: 'B', wordOffset: 110 },
          { level: 2, text: 'C', wordOffset: 210 },
          { level: 2, text: 'D', wordOffset: 300 },
        ],
        wordCount: 400,
      })
    );
    const criterion = result.criteria.find((c) => c.id === 'heading-interval');
    expect(criterion?.status === 'warn' || criterion?.status === 'bad').toBe(true);
    expect(criterion?.detail).toContain('trop courte');
  });
});
