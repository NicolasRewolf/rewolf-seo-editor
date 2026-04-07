import type { SeoAnalysisPayload, SeoCriterion, SeoDimensionResult } from '@/types/seo';

const DEFAULT_BENCHMARK = 1200;

function firstWords(text: string, n: number): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, n);
}

export function analyzeContent(p: SeoAnalysisPayload): SeoDimensionResult {
  const criteria: SeoCriterion[] = [];
  const bench = p.competitorAvgWords ?? DEFAULT_BENCHMARK;
  const benchLabel = p.competitorAvgWords
    ? 'benchmark page concurrente (Reader)'
    : 'benchmark par defaut (1200 mots)';

  const minW = Math.round(bench * 0.65);
  const maxW = Math.round(bench * 1.35);
  const lenOk = p.wordCount >= minW && p.wordCount <= maxW;
  criteria.push({
    id: 'length-vs-bench',
    label: 'Longueur vs moyenne (benchmark)',
    status:
      p.wordCount < 100
        ? 'warn'
        : lenOk
          ? 'ok'
          : p.wordCount < minW
            ? 'warn'
            : 'bad',
    detail: `${p.wordCount} mots (cible indicative ${minW}-${maxW} d apres ~${bench} mots, ${benchLabel}).`,
  });

  const kw = p.focusKeyword.trim();
  const subHint =
    kw.length > 2
      ? 'Ajoutez des sous-parties qui couvrent les intentions liées au mot-clé.'
      : 'Définissez un mot-clé pour évaluer la couverture thématique.';
  criteria.push({
    id: 'subtopics',
    label: 'Couverture des sous-thèmes',
    status: kw ? (p.wordCount > 400 ? 'ok' : 'warn') : 'warn',
    detail: subHint,
  });

  const intro = p.firstParagraph.trim();
  const introWords = intro.split(/\s+/).filter(Boolean).length;
  const directOk = introWords >= 40 && introWords <= 60;
  const first100Count = firstWords(p.plainText, 100).length;
  criteria.push({
    id: 'direct-answer',
    label: "Réponse directe (40–60 mots dans l'intro)",
    status: !intro
      ? 'bad'
      : directOk
        ? 'ok'
        : introWords >= 30 && introWords <= 75
          ? 'warn'
          : 'bad',
    detail: intro
      ? `Intro : ~${introWords} mots. Mots dans les 100 premiers : ${first100Count}.`
      : 'Rédigez une introduction.',
  });

  const score =
    criteria.reduce((acc, c) => {
      const v = c.status === 'ok' ? 100 : c.status === 'warn' ? 55 : 25;
      return acc + v;
    }, 0) / criteria.length;

  return {
    id: 'content',
    label: 'Contenu',
    weight: 0.15,
    score: Math.round(score),
    criteria,
  };
}
