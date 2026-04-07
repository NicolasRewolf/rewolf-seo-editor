import type { SeoAnalysisPayload, SeoCriterion, SeoDimensionResult } from '@/types/seo';

function headingIntervalsCheck(
  headings: { level: number; text: string; wordOffset: number }[],
  wordCount: number
): { status: 'ok' | 'warn' | 'bad'; detail: string } {
  const scopedHeadings = headings.filter((heading) => heading.level >= 2);
  if (scopedHeadings.length < 2 || wordCount < 150) {
    return {
      status: 'warn',
      detail: 'Pas assez de repères pour mesurer les intervalles de sections.',
    };
  }

  const intervals: Array<{
    from: string;
    to: string;
    words: number;
  }> = [];
  for (let i = 0; i < scopedHeadings.length - 1; i++) {
    const current = scopedHeadings[i];
    const next = scopedHeadings[i + 1];
    intervals.push({
      from: current.text || `Titre ${i + 1}`,
      to: next.text || `Titre ${i + 2}`,
      words: Math.max(0, next.wordOffset - current.wordOffset),
    });
  }

  const inTarget = intervals.filter(
    (entry) => entry.words >= 150 && entry.words <= 350
  );
  const ratio = inTarget.length / intervals.length;

  const firstLong = intervals.find((entry) => entry.words > 350);
  if (firstLong) {
    return {
      status: ratio >= 0.7 ? 'warn' : 'bad',
      detail: `Section "${firstLong.from}" trop longue (${firstLong.words} mots) — ajoutez un sous-titre.`,
    };
  }

  const firstShort = intervals.find((entry) => entry.words < 150);
  if (firstShort) {
    return {
      status: ratio >= 0.7 ? 'warn' : 'bad',
      detail: `Section "${firstShort.from}" trop courte (${firstShort.words} mots) — fusionnez ou enrichissez.`,
    };
  }

  return {
    status: ratio === 1 ? 'ok' : ratio >= 0.7 ? 'warn' : 'bad',
    detail: `${Math.round(ratio * 100)} % des intervalles sont entre 150 et 350 mots.`,
  };
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

  const interval = headingIntervalsCheck(p.headingsWithWordOffsets, p.wordCount);
  criteria.push({
    id: 'heading-interval',
    label: 'Intervalles de sections (150–350 mots)',
    status: interval.status,
    detail: interval.detail,
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
