import { describe, expect, it } from 'vitest';
import { keywordDensityPercent, lixScoreFr } from './seo';

describe('lixScoreFr', () => {
  it('returns bad with zero score for empty text', () => {
    expect(lixScoreFr('')).toEqual({ score: 0, grade: 'bad' });
  });

  it('handles very short text', () => {
    const result = lixScoreFr('Bonjour.');
    expect(result.score).toBeGreaterThan(0);
    expect(['ok', 'warn', 'bad']).toContain(result.grade);
  });

  it('handles text with special/accented characters', () => {
    const result = lixScoreFr(
      "C'est déjà l'été. Où sont les naïfs? Très bientôt, sûrement!"
    );
    expect(result.score).toBeGreaterThan(0);
    expect(['ok', 'warn', 'bad']).toContain(result.grade);
  });
});

describe('keywordDensityPercent', () => {
  it('returns 0 for empty text', () => {
    expect(keywordDensityPercent('', 3)).toBe(0);
  });

  it('returns 0 for non-positive hits', () => {
    expect(keywordDensityPercent('mot cle mot cle', 0)).toBe(0);
    expect(keywordDensityPercent('mot cle mot cle', -2)).toBe(0);
  });

  it('computes expected density on regular text', () => {
    // 4 words total, 2 hits => 50%
    expect(keywordDensityPercent('alpha beta gamma delta', 2)).toBe(50);
  });

  it('handles text with special characters and spacing', () => {
    // countWords still sees 4 words
    expect(keywordDensityPercent('  alpha,  beta!  gamma? delta. ', 1)).toBe(25);
  });
});
