import { describe, expect, it } from 'vitest';

import { analyzeReadability, lixScoreFr } from '@/lib/seo/readability';
import type { SeoAnalysisPayload } from '@/types/seo';

const TEXT_EASY =
  'Le guide explique les bases. Les phrases sont simples et courtes. Chaque idee est claire. Vous avancez vite.';
const TEXT_STANDARD =
  'Ce guide presente les etapes pour choisir un avocat. Il compare les options utiles, explique les risques et propose une methode claire pour decider sereinement.';
const TEXT_TECHNICAL =
  'La contractualisation operationnelle implique une structuration methodologique, des obligations procedurales et une harmonisation documentaire interfonctionnelle afin de reduire les asymetries d information.';
const TEXT_LEGAL =
  'L interpretation jurisprudentielle de la responsabilite contractuelle exige une appreciation circonstanciee des obligations essentielles, ainsi qu une qualification precise des manquements allegues au regard des clauses limitatives.';

function payload(plainText: string): SeoAnalysisPayload {
  return {
    plainText,
    focusKeyword: 'avocat',
    metaTitle: 'Guide avocat',
    metaDescription: 'meta',
    slug: 'guide-avocat',
    titlePx: 300,
    metaDescPx: 500,
    headings: [{ level: 1, text: 'Guide avocat' }],
    headingsWithWordOffsets: [{ level: 1, text: 'Guide avocat', wordOffset: 0 }],
    firstParagraph: plainText,
    wordCount: plainText.split(/\s+/).filter(Boolean).length,
    internalLinks: 0,
    externalLinks: 0,
    imagesTotal: 0,
    imagesMissingAlt: 0,
  };
}

describe('lixScoreFr', () => {
  it('scores increasing complexity across 4 text types', () => {
    const easy = lixScoreFr(TEXT_EASY);
    const standard = lixScoreFr(TEXT_STANDARD);
    const technical = lixScoreFr(TEXT_TECHNICAL);
    const legal = lixScoreFr(TEXT_LEGAL);

    expect(easy.score).toBeLessThan(technical.score);
    expect(standard.score).toBeLessThan(legal.score);
    expect(technical.grade === 'warn' || technical.grade === 'bad').toBe(true);
  });
});

describe('analyzeReadability', () => {
  it('exposes combined FK and LIX detail', () => {
    const result = analyzeReadability(payload(TEXT_STANDARD));
    const criterion = result.criteria.find((c) => c.id === 'readability-grade');

    expect(criterion).toBeDefined();
    expect(criterion?.detail).toContain('FK :');
    expect(criterion?.detail).toContain('LIX :');
    expect(criterion?.detail).toContain('cible 30–45');
  });
});
