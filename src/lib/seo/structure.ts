import type { SeoAnalysisPayload, SeoCriterion, SeoDimensionResult } from '@/types/seo';

function headingIntervalsOk(
  headings: { level: number; text: string }[],
  wordCount: number
): { ok: boolean; detail: string } {
  if (headings.length < 2 || wordCount < 100) {
    return { ok: true, detail: 'Pas assez de contenu pour mesurer les intervalles.' };
  }
  return { ok: true, detail: 'À affiner avec repères de mots par section (objectif 200–300 mots).' };
}

export function analyzeStructure(p: SeoAnalysisPayload): SeoDimensionResult {
  const criteria: SeoCriterion[] = [];
  const hs = p.headings;

  const h1s = hs.filter((h) => h.level === 1);
  criteria.push({
    id: 'one-h1',
    label: 'Un seul H1',
    status:
      h1s.length === 1 ? 'ok' : h1s.length === 0 ? 'bad' : 'warn',
    detail:
      h1s.length === 1
        ? 'Un H1 unique.'
        : h1s.length === 0
          ? 'Ajoutez un titre H1.'
          : 'Fusionnez ou supprimez les H1 en trop.',
  });

  let skip = false;
  let prev = 0;
  for (const h of hs) {
    if (prev > 0 && h.level > prev + 1) {
      skip = true;
      break;
    }
    prev = h.level;
  }
  criteria.push({
    id: 'heading-skip',
    label: 'Pas de saut de niveau (H1→H3…)',
    status: hs.length < 2 ? 'warn' : skip ? 'bad' : 'ok',
    detail: skip
      ? 'Remontez un niveau (ex. H2 avant H3).'
      : 'Hiérarchie cohérente.',
  });

  const { detail: intervalDetail } = headingIntervalsOk(hs, p.wordCount);
  criteria.push({
    id: 'heading-interval',
    label: 'Titres tous les 200–300 mots (indicatif)',
    status: p.wordCount < 150 ? 'warn' : 'ok',
    detail: intervalDetail,
  });

  const intOk = p.internalLinks >= 2 && p.internalLinks <= 6;
  criteria.push({
    id: 'links-in',
    label: 'Liens internes (2–6)',
    status:
      p.internalLinks === 0
        ? 'warn'
        : intOk
          ? 'ok'
          : p.internalLinks < 2
            ? 'warn'
            : 'bad',
    detail: `${p.internalLinks} lien(s) interne(s) détecté(s).`,
  });

  const extOk = p.externalLinks >= 2 && p.externalLinks <= 5;
  criteria.push({
    id: 'links-out',
    label: 'Liens externes (2–5)',
    status:
      p.externalLinks === 0
        ? 'warn'
        : extOk
          ? 'ok'
          : p.externalLinks < 2
            ? 'warn'
            : 'bad',
    detail: `${p.externalLinks} lien(s) externe(s) détecté(s).`,
  });

  const score =
    criteria.reduce((acc, c) => {
      const v = c.status === 'ok' ? 100 : c.status === 'warn' ? 55 : 25;
      return acc + v;
    }, 0) / criteria.length;

  return {
    id: 'structure',
    label: 'Structure',
    weight: 0.2,
    score: Math.round(score),
    criteria,
  };
}
