import { countWords } from './text';

export type ReadabilityGrade = 'ok' | 'warn' | 'bad';

function splitSentences(text: string): string[] {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Heuristique LIX FR pour estimer la lisibilite (cible 30-45). */
export function lixScoreFr(text: string): {
  score: number;
  grade: ReadabilityGrade;
} {
  const sentences = Math.max(splitSentences(text).length, 1);
  const words = text.match(/[a-zA-ZÀ-ÿ0-9'-]+/g) ?? [];
  const wordCount = words.length;

  if (wordCount === 0) {
    return { score: 0, grade: 'bad' };
  }

  const longWords = words.filter((word) => word.length > 6).length;
  const score = wordCount / sentences + (longWords * 100) / wordCount;

  const grade: ReadabilityGrade =
    score >= 30 && score <= 45 ? 'ok' : score > 45 && score <= 55 ? 'warn' : 'bad';

  return { score, grade };
}

export function keywordDensityPercent(plainText: string, hits: number): number {
  const wordCount = countWords(plainText);
  if (!wordCount || hits <= 0) return 0;
  return (hits / wordCount) * 100;
}
