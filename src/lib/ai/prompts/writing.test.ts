import { describe, expect, it } from 'vitest';

import {
  SEO_ALT_TEXT_PROMPT,
  SEO_FAQ_PROMPT,
  SEO_HEADLINE_VARIANTS_PROMPT,
  SEO_INTRO_PROMPT,
} from '@/lib/ai/prompts/writing';

describe('writing prompts', () => {
  it('FAQ prompt contains expected SEO constraints', () => {
    expect(SEO_FAQ_PROMPT).toContain('People Also Ask');
    expect(SEO_FAQ_PROMPT).toContain('**Q:**');
    expect(SEO_FAQ_PROMPT).toContain('**R:**');
    expect(SEO_FAQ_PROMPT).toContain('mot-clé principal');
  });

  it('Intro prompt enforces two variants and intent', () => {
    expect(SEO_INTRO_PROMPT).toContain('exactement 2 variantes');
    expect(SEO_INTRO_PROMPT).toContain('40 à 60 mots');
    expect(SEO_INTRO_PROMPT).toContain('intention de recherche');
  });

  it('Headline prompt enforces five variant archetypes', () => {
    expect(SEO_HEADLINE_VARIANTS_PROMPT).toContain('exactement 5 variantes');
    expect(SEO_HEADLINE_VARIANTS_PROMPT).toContain('bénéfice');
    expect(SEO_HEADLINE_VARIANTS_PROMPT).toContain('question');
    expect(SEO_HEADLINE_VARIANTS_PROMPT).toContain('année');
  });

  it('ALT prompt enforces length and strict format', () => {
    expect(SEO_ALT_TEXT_PROMPT).toContain('<= 125 caractères');
    expect(SEO_ALT_TEXT_PROMPT).toContain('ALT:');
    expect(SEO_ALT_TEXT_PROMPT).toContain('accessibilité');
  });
});
