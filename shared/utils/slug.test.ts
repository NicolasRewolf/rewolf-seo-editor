import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('removes accents and lowercases', () => {
    expect(slugify('Éditeur SEO Français')).toBe('editeur-seo-francais');
  });

  it('collapses multiple spaces and punctuation into dashes', () => {
    expect(slugify('  Hello,   World!!!  ')).toBe('hello-world');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('---Titre test---')).toBe('titre-test');
  });

  it('returns empty string for non alphanumeric input', () => {
    expect(slugify('***___***')).toBe('');
  });
});
