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

export function lixScoreFr(text: string): {
  score: number;
  grade: 'ok' | 'warn' | 'bad';
} {
  const sentences = Math.max(splitSentences(text).length, 1);
  const words = text.match(/[a-zA-ZÀ-ÿ0-9'-]+/g) ?? [];
  const wordCount = words.length;

  if (wordCount === 0) {
    return { score: 0, grade: 'bad' };
  }

  const longWords = words.filter((word) => word.length > 6).length;
  const score = wordCount / sentences + (longWords * 100) / wordCount;

  const grade: 'ok' | 'warn' | 'bad' =
    score >= 30 && score <= 45 ? 'ok' : score > 45 && score <= 55 ? 'warn' : 'bad';

  return { score, grade };
}

function estimateSyllables(word: string): number {
  const w = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z]/g, '');
  if (!w) return 0;

  // Approximation robuste FR/EN pour éviter dépendance CJS côté navigateur.
  const groups = w.match(/[aeiouy]+/g) ?? [];
  let count = groups.length;
  if (w.endsWith('e') && count > 1) count -= 1;
  if (w.endsWith('es') && count > 1) count -= 1;
  if (w.endsWith('ent') && count > 1) count -= 1;
  return Math.max(1, count);
}

function fleschKincaidGradeApprox(text: string): number {
  const sentences = Math.max(splitSentences(text).length, 1);
  const words = text.match(/[a-zA-ZÀ-ÿ0-9'-]+/g) ?? [];
  const wordCount = words.length;
  if (wordCount === 0) return 8;
  const syllables = words.reduce((sum, word) => sum + estimateSyllables(word), 0);
  return 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
}

export function analyzeReadability(p: SeoAnalysisPayload): SeoDimensionResult {
  const text = p.plainText;
  const criteria: SeoCriterion[] = [];

  let fk = 8;
  try {
    fk = fleschKincaidGradeApprox(text);
    if (Number.isNaN(fk)) fk = 8;
  } catch {
    fk = 8;
  }

  const fkGrade: 'ok' | 'warn' | 'bad' =
    fk >= 7 && fk <= 9
      ? 'ok'
      : (fk >= 5 && fk < 7) || (fk > 9 && fk <= 12)
        ? 'warn'
        : 'bad';
  const { score: lix, grade: lixGrade } = lixScoreFr(text);

  const worstGrade = (a: 'ok' | 'warn' | 'bad', b: 'ok' | 'warn' | 'bad') => {
    const rank = { ok: 0, warn: 1, bad: 2 } as const;
    return rank[a] >= rank[b] ? a : b;
  };

  criteria.push({
    id: 'readability-grade',
    label: 'Lisibilité (FK + LIX, cible LIX 30–45)',
    status:
      text.length < 80
        ? 'warn'
        : worstGrade(fkGrade, lixGrade),
    detail:
      text.length < 80
        ? 'Texte trop court pour une mesure fiable.'
        : `FK : ${fk.toFixed(1)} · LIX : ${lix.toFixed(1)} (cible 30–45).`,
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
