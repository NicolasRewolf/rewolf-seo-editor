import { describe, expect, it } from 'vitest';

import { defaultArticleBrief } from '@/types/article';

import { scorePlan } from './plan-scorer';

function brief(partial: Partial<ReturnType<typeof defaultArticleBrief>>) {
  return { ...defaultArticleBrief(), ...partial };
}

describe('scorePlan', () => {
  it('retourne un score 0–100 et une liste de critères', () => {
    const r = scorePlan('', brief({ focusKeyword: '', longTailKeywords: [] }), []);
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(100);
    expect(r.checks.length).toBeGreaterThan(0);
  });

  it('check kw-h2 passe avec 2 H2 contenant le mot-clé', () => {
    const md = `# SEO test\n## test section un\n## test section deux\n→ Points clés : a`;
    const r = scorePlan(md, brief({ focusKeyword: 'test' }), []);
    const c = r.checks.find((x) => x.id === 'kw-h2');
    expect(c?.passed).toBe(true);
  });

  it('check longtail tolère couverture partielle par tokens', () => {
    const md = [
      '# avocat droit travail',
      '## avocat paris et tribunal',
      '## conseil prudhommes paris',
      '## droit social entreprise',
      '## prudhommes procédure salarié',
      '→ Points clés : x',
    ].join('\n');
    const longTails = [
      'avocat droit du travail paris',
      'conseil prudhommes paris',
    ];
    const r = scorePlan(
      md,
      brief({ focusKeyword: 'avocat', longTailKeywords: longTails }),
      []
    );
    const c = r.checks.find((x) => x.id === 'longtail');
    expect(c?.passed).toBe(true);
  });

  it('check first-h2-snippet échoue sur Introduction, passe sur question', () => {
    const intro = scorePlan(
      '## Introduction\n## Suite',
      brief({ focusKeyword: 'x' }),
      []
    );
    expect(
      intro.checks.find((x) => x.id === 'first-h2-snippet')?.passed
    ).toBe(false);

    const ok = scorePlan(
      "## Qu'est-ce que le droit du travail ?\n## Suite",
      brief({ focusKeyword: 'droit' }),
      []
    );
    expect(ok.checks.find((x) => x.id === 'first-h2-snippet')?.passed).toBe(
      true
    );
  });

  it('check differentiator passe si un H2 sort des concurrents', () => {
    const md = [
      '## Angle totalement spécifique rewolf',
      '## autre',
      '## trois',
      '## quatre',
      '→ Points clés : p',
    ].join('\n');
    const r = scorePlan(md, brief({ focusKeyword: 'seo' }), ['standard']);
    const c = r.checks.find((x) => x.id === 'differentiator');
    expect(c?.passed).toBe(true);
  });
});
