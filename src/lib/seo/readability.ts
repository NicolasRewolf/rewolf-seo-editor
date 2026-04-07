import readability from 'text-readability-ts';

import type { SeoAnalysisPayload, SeoCriterion, SeoDimensionResult } from '@/types/seo';

const TRANSITION_FR = [
  'cependant',
  'en effet',
  'par conséquent',
  'ainsi',
  'de plus',
  'toutefois',
  'néanmoins',
  'également',
  'notamment',
  'dès lors',
  'en outre',
  'pour autant',
  "d'ailleurs",
  'par ailleurs',
  "c'est pourquoi",
  'en revanche',
];

function splitSentences(text: string): string[] {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function analyzeReadability(p: SeoAnalysisPayload): SeoDimensionResult {
  const text = p.plainText;
  const criteria: SeoCriterion[] = [];

  let fk = 8;
  try {
    fk = readability.fleschKincaidGrade(text);
    if (Number.isNaN(fk)) fk = 8;
  } catch {
    fk = 8;
  }

  const fkOk = fk >= 7 && fk <= 9;
  const fkWarn = (fk >= 5 && fk < 7) || (fk > 9 && fk <= 12);
  criteria.push({
    id: 'fk-grade',
    label: 'Flesch-Kincaid (niveau 7–9 visé)',
    status:
      text.length < 80
        ? 'warn'
        : fkOk
          ? 'ok'
          : fkWarn
            ? 'warn'
            : 'bad',
    detail:
      text.length < 80
        ? 'Texte trop court pour une mesure fiable.'
        : `Niveau estimé : ${fk.toFixed(1)} (anglais / indicateur).`,
  });

  const sentences = splitSentences(text);
  const shortEnough = sentences.filter((s) => {
    const wc = s.split(/\s+/).filter(Boolean).length;
    return wc <= 25;
  }).length;
  const ratioShort =
    sentences.length > 0 ? shortEnough / sentences.length : 1;
  const sentOk = ratioShort >= 0.8;
  criteria.push({
    id: 'sent-len',
    label: 'Phrases courtes (< 25 mots, 80 % +)',
    status:
      sentences.length < 3
        ? 'warn'
        : sentOk
          ? 'ok'
          : ratioShort >= 0.6
            ? 'warn'
            : 'bad',
    detail: `${Math.round(ratioShort * 100)} % des phrases sous 25 mots.`,
  });

  const paras = splitParagraphs(text);
  const paraOk = paras.filter((block) => {
    const sents = splitSentences(block);
    return sents.length >= 2 && sents.length <= 4;
  }).length;
  const ratioPara = paras.length > 0 ? paraOk / paras.length : 1;
  criteria.push({
    id: 'para-len',
    label: 'Paragraphes (2–4 phrases)',
    status:
      paras.length < 2
        ? 'warn'
        : ratioPara >= 0.7
          ? 'ok'
          : ratioPara >= 0.45
            ? 'warn'
            : 'bad',
    detail: `${Math.round(ratioPara * 100)} % des paragraphes dans la cible.`,
  });

  const withTransition = sentences.filter((s) =>
    TRANSITION_FR.some((w) => s.toLowerCase().includes(w))
  ).length;
  const ratioTrans =
    sentences.length > 0 ? withTransition / sentences.length : 0;
  criteria.push({
    id: 'transition',
    label: 'Mots de transition (30 % des phrases)',
    status:
      sentences.length < 3
        ? 'warn'
        : ratioTrans >= 0.3
          ? 'ok'
          : ratioTrans >= 0.15
            ? 'warn'
            : 'bad',
    detail: `${Math.round(ratioTrans * 100)} % des phrases contiennent une transition (liste FR).`,
  });

  const score =
    criteria.reduce((acc, c) => {
      const v = c.status === 'ok' ? 100 : c.status === 'warn' ? 55 : 25;
      return acc + v;
    }, 0) / criteria.length;

  return {
    id: 'readability',
    label: 'Lisibilité',
    weight: 0.2,
    score: Math.round(score),
    criteria,
  };
}
