import { describe, expect, it } from 'vitest';

import { stemFr } from '@/lib/seo/stem-fr';

describe('stemFr', () => {
  it('stems frequent French variants (30+ cases)', () => {
    const cases: Array<[string, string]> = [
      ['avocats', 'avocat'],
      ['avocate', 'avocat'],
      ['avocates', 'avocat'],
      ['dossiers', 'dossier'],
      ['guides', 'guid'],
      ['cas', 'cas'],
      ['juridique', 'juridiqu'],
      ['juridiques', 'juridiqu'],
      ['travaux', 'traval'],
      ['chevaux', 'cheval'],
      ['nation', 'na'],
      ['nations', 'na'],
      ['formation', 'forma'],
      ['formations', 'forma'],
      ['raisonnement', 'raisonn'],
      ['raisonnements', 'raisonn'],
      ['rapidement', 'rapid'],
      ['mouvements', 'mouv'],
      ['parlaient', 'parl'],
      ['parlait', 'parl'],
      ['marchent', 'march'],
      ['mangent', 'mang'],
      ['calculer', 'calcul'],
      ['finir', 'fin'],
      ['réglée', 'regl'],
      ['réglées', 'regl'],
      ['réglés', 'regl'],
      ['réglé', 'regl'],
      ['SEO', 'seo'],
      ['URL', 'url'],
      ['à', 'a'],
      ['été', 'ete'],
      ['contentieux', 'contentieu'],
      ['social', 'social'],
    ];

    for (const [input, expected] of cases) {
      expect(stemFr(input)).toBe(expected);
    }
  });
});
