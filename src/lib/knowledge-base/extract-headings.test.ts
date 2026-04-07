import { describe, expect, it } from 'vitest';

import { extractHeadingsFromMarkdown } from './extract-headings';

describe('extractHeadingsFromMarkdown', () => {
  it('extrait H1, H2 et H3', () => {
    const md = '# T1\n## T2\n### T3';
    expect(extractHeadingsFromMarkdown(md)).toEqual([
      { level: 1, text: 'T1' },
      { level: 2, text: 'T2' },
      { level: 3, text: 'T3' },
    ]);
  });

  it('ignore H4 et au-delà', () => {
    expect(extractHeadingsFromMarkdown('#### Pas pris')).toEqual([]);
  });

  it('ignore les # dans les blocs de code', () => {
    const md = '```\n# faux titre\n```\n## Réel';
    expect(extractHeadingsFromMarkdown(md)).toEqual([{ level: 2, text: 'Réel' }]);
  });

  it('retourne [] sur markdown vide', () => {
    expect(extractHeadingsFromMarkdown('')).toEqual([]);
  });
});
