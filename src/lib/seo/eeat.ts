import type { SeoAnalysisPayload, SeoCriterion, SeoDimensionResult } from '@/types/seo';

const EXPERIENCE = [
  'en pratique',
  "d'après notre expérience",
  'nous avons constaté',
  'notre équipe',
  'chez nous',
];

const SOURCES = [
  'selon',
  'source :',
  'article l.',
  'loi n°',
  'décret',
  'jurisprudence',
  'étude',
  'rapport',
  'https://',
  'http://',
];

const DATA_MARKERS = /\d{2,4}|%|€|\b\d{1,3}(?:\s?\d{3})+\b/;

export function analyzeEeat(p: SeoAnalysisPayload): SeoDimensionResult {
  const low = p.plainText.toLowerCase();
  const criteria: SeoCriterion[] = [];

  criteria.push({
    id: 'author-bio',
    label: 'Bio auteur / signature éditoriale',
    status: 'warn',
    detail:
      "Ajoutez un bloc auteur ou une signature (non détecté dans le corps). À compléter en bas d'article.",
  });

  const hasSource = SOURCES.some((s) => low.includes(s));
  criteria.push({
    id: 'citations',
    label: 'Citations ou sources',
    status: hasSource ? 'ok' : 'warn',
    detail: hasSource
      ? 'Des références ou liens sources sont présents.'
      : 'Citez des sources (études, textes, liens officiels).',
  });

  const hasExp = EXPERIENCE.some((s) => low.includes(s));
  criteria.push({
    id: 'experience',
    label: "Marqueurs d'expérience",
    status: hasExp ? 'ok' : 'warn',
    detail: hasExp
      ? "Des formulations d'expérience sont présentes."
      : 'Ajoutez du vécu : « en pratique », retours terrain, etc.',
  });

  const hasData = DATA_MARKERS.test(p.plainText);
  criteria.push({
    id: 'original-data',
    label: 'Données chiffrées ou faits vérifiables',
    status: hasData ? 'ok' : 'warn',
    detail: hasData
      ? 'Chiffres ou données détectés.'
      : 'Enrichissez avec des chiffres, pourcentages ou faits datés.',
  });

  const score =
    criteria.reduce((acc, c) => {
      const v = c.status === 'ok' ? 100 : c.status === 'warn' ? 55 : 25;
      return acc + v;
    }, 0) / criteria.length;

  return {
    id: 'eeat',
    label: 'E-E-A-T',
    weight: 0.1,
    score: Math.round(score),
    criteria,
  };
}
