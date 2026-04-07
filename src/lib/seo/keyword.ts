import type { SeoAnalysisPayload, SeoCriterion, SeoDimensionResult } from '@/types/seo';

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function containsKeyword(haystack: string, kw: string): boolean {
  if (!kw.trim()) return false;
  return norm(haystack).includes(norm(kw));
}

function countPhraseInText(plain: string, kw: string): number {
  if (!kw.trim()) return 0;
  const p = norm(plain);
  const k = norm(kw);
  if (!k) return 0;
  if (!k.includes(' ')) {
    const re = new RegExp(
      `\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      'g'
    );
    return (p.match(re) ?? []).length;
  }
  let n = 0;
  let i = 0;
  while (i <= p.length) {
    const j = p.indexOf(k, i);
    if (j === -1) break;
    n++;
    i = j + k.length;
  }
  return n;
}

function keywordDensityPercentFixed(plainText: string, kw: string): number {
  const wc = plainText.trim().split(/\s+/).filter(Boolean).length;
  if (!wc || !kw.trim()) return 0;
  const hits = countPhraseInText(plainText, kw);
  return (hits / wc) * 100;
}

export function analyzeOnPage(p: SeoAnalysisPayload): SeoDimensionResult {
  const kw = p.focusKeyword;
  const criteria: SeoCriterion[] = [];

  const inTitle = containsKeyword(p.metaTitle, kw);
  criteria.push({
    id: 'kw-title',
    label: 'Mot-clé dans le title tag',
    status: kw ? (inTitle ? 'ok' : 'bad') : 'warn',
    detail: kw
      ? inTitle
        ? 'Le title contient le mot-clé.'
        : 'Ajoutez le mot-clé dans le title.'
      : 'Définissez un mot-clé principal.',
  });

  const h1s = p.headings.filter((h) => h.level === 1);
  const h1Text = h1s[0]?.text ?? '';
  const inH1 = containsKeyword(h1Text, kw);
  criteria.push({
    id: 'kw-h1',
    label: 'Mot-clé dans le H1',
    status: kw ? (h1s.length === 1 && inH1 ? 'ok' : h1s.length !== 1 ? 'warn' : 'bad') : 'warn',
    detail:
      h1s.length === 0
        ? 'Aucun H1 détecté dans le corps.'
        : h1s.length > 1
          ? 'Plusieurs H1 : gardez un seul H1.'
          : inH1
            ? 'Le H1 contient le mot-clé.'
            : 'Intégrez le mot-clé dans le H1.',
  });

  const inFirst = containsKeyword(p.firstParagraph, kw);
  criteria.push({
    id: 'kw-first',
    label: 'Mot-clé dans le premier paragraphe',
    status: kw ? (p.firstParagraph ? (inFirst ? 'ok' : 'bad') : 'warn') : 'warn',
    detail: p.firstParagraph
      ? inFirst
        ? 'Présent dans le premier bloc de texte.'
        : "Ajoutez le mot-clé dans l'introduction."
      : 'Rédigez un premier paragraphe.',
  });

  const inSlug = containsKeyword(p.slug.replace(/-/g, ' '), kw);
  criteria.push({
    id: 'kw-slug',
    label: 'Mot-clé dans le slug',
    status: kw ? (p.slug ? (inSlug ? 'ok' : 'warn') : 'warn') : 'warn',
    detail: p.slug
      ? inSlug
        ? 'Le slug reflète le mot-clé.'
        : 'Rapprochez le slug du mot-clé (mots-clés séparés par des tirets).'
      : "Définissez un slug d'URL.",
  });

  const density = keywordDensityPercentFixed(p.plainText, kw);
  const densityOk = density >= 0.5 && density <= 0.8;
  const densityWarn = density > 0 && density < 0.5;
  criteria.push({
    id: 'kw-density',
    label: 'Densité du mot-clé (0,5–0,8 %)',
    status: kw
      ? p.wordCount < 20
        ? 'warn'
        : densityOk
          ? 'ok'
          : density > 0.8
            ? 'bad'
            : densityWarn
              ? 'warn'
              : 'bad'
      : 'warn',
    detail: kw
      ? `Environ ${density.toFixed(2)} % (${p.wordCount} mots).`
      : "Sans mot-clé, la densité n'est pas calculée.",
  });

  const h2s = p.headings.filter((h) => h.level === 2);
  const inH2 = h2s.some((h) => containsKeyword(h.text, kw));
  criteria.push({
    id: 'kw-h2',
    label: 'Mot-clé dans au moins un H2',
    status: kw ? (h2s.length ? (inH2 ? 'ok' : 'bad') : 'warn') : 'warn',
    detail: h2s.length
      ? inH2
        ? 'Au moins un H2 contient le mot-clé.'
        : 'Ajoutez le mot-clé dans un sous-titre H2.'
      : "Ajoutez des H2 pour structurer l'article.",
  });

  const score =
    criteria.reduce((acc, c) => {
      const v = c.status === 'ok' ? 100 : c.status === 'warn' ? 55 : 25;
      return acc + v;
    }, 0) / criteria.length;

  return {
    id: 'onPage',
    label: 'On-page SEO',
    weight: 0.25,
    score: Math.round(score),
    criteria,
  };
}
