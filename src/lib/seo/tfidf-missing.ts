import { plainTextFromValue } from '@/lib/seo/extract-structure';
import type { Descendant } from 'platejs';

const FR_STOP = new Set(
  `le la les un une des du de et ou en au aux pour par sur avec sans comme plus moins très tout tous cette ces son sa ses leur mais donc or ni car si lors alors chez soit`.split(
    /\s+/
  )
);

function tokenize(text: string): string[] {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return t
    .split(/[^a-z0-9àâäéèêëïîôùûüç]+/i)
    .filter((w) => w.length > 2 && !FR_STOP.has(w));
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export type CompetitorRow = {
  url: string;
  wordCount: number;
  ok: boolean;
  error?: string;
};

/**
 * TF-IDF simplifié sur le corpus concurrent (plusieurs documents) :
 * score = tf_global × log((N+1)/(df+1)). Termes absents du texte utilisateur.
 * (Alternative lourde : `natural` / lemmatisation `wink-nlp` côté worker.)
 */
export function missingTermsVsCompetitors(
  userPlain: string,
  competitorPlainTexts: string[],
  options?: { topN?: number; minScore?: number; minTermLen?: number }
): { term: string; tfidf: number }[] {
  const topN = options?.topN ?? 18;
  const minScore = options?.minScore ?? 0.0008;
  const minTermLen = options?.minTermLen ?? 4;

  const docs = competitorPlainTexts.map((t) => t.trim()).filter(Boolean);
  if (!docs.length) return [];

  const N = docs.length;
  const userTok = new Set(tokenize(userPlain));

  const docTokens = docs.map((d) => tokenize(d));
  const merged = docTokens.flat();
  if (!merged.length) return [];

  const tfGlobal = new Map<string, number>();
  for (const w of merged) {
    tfGlobal.set(w, (tfGlobal.get(w) ?? 0) + 1);
  }

  const df = new Map<string, number>();
  for (const dt of docTokens) {
    const seen = new Set(dt);
    for (const w of seen) {
      df.set(w, (df.get(w) ?? 0) + 1);
    }
  }

  const total = merged.length;
  const scored: { term: string; tfidf: number }[] = [];

  for (const [term, f] of tfGlobal) {
    if (term.length < minTermLen) continue;
    if (userTok.has(term)) continue;
    const tf = f / total;
    const dfc = df.get(term) ?? 1;
    const idf = Math.log((N + 1) / (dfc + 1));
    const s = tf * idf;
    if (s < minScore) continue;
    scored.push({ term, tfidf: s });
  }

  scored.sort((a, b) => b.tfidf - a.tfidf);
  return scored.slice(0, topN);
}

export function userPlainFromDoc(value: Descendant[]): string {
  return plainTextFromValue(value);
}
