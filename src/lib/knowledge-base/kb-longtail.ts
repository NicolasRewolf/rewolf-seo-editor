import { KB_FRENCH_STOPWORDS } from '@/lib/knowledge-base/kb-text';
import type { KnowledgeBase } from '@/types/knowledge-base';

function tokenize(text: string): string[] {
  const low = text.toLowerCase();
  return low
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zàâäéèêëïîôùûüÿçœæ0-9-]/gi, ''))
    .filter((w) => w.length >= 2);
}

function ngrams(tokens: string[], n: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n));
  }
  return out;
}

/**
 * Suggestions de expressions (2–4 mots) à partir de la KB, liées au focus.
 */
export function suggestLongTailFromKb(
  kb: KnowledgeBase,
  focusKeyword: string,
  max = 15
): string[] {
  const fkTokens = tokenize(focusKeyword).filter(
    (t) => t.length >= 3 && !KB_FRENCH_STOPWORDS.has(t)
  );
  const fkSet = new Set(fkTokens);

  const sourceIds = new Map<string, Set<string>>();
  const phraseFreq = new Map<string, number>();

  for (const s of kb.sources) {
    const tokens = tokenize(s.content);
    for (const n of [2, 3, 4]) {
      for (const g of ngrams(tokens, n)) {
        if (g.some((t) => KB_FRENCH_STOPWORDS.has(t))) continue;
        const phrase = g.join(' ');
        if (phrase.length < 6) continue;

        const hitsFk = g.some((t) => fkSet.has(t));
        if (fkTokens.length > 0 && !hitsFk) continue;

        phraseFreq.set(phrase, (phraseFreq.get(phrase) ?? 0) + 1);
        let set = sourceIds.get(phrase);
        if (!set) {
          set = new Set();
          sourceIds.set(phrase, set);
        }
        set.add(s.id);
      }
    }
  }

  const scored = [...phraseFreq.entries()]
    .map(([phrase, freq]) => {
      const spread = sourceIds.get(phrase)?.size ?? 0;
      return {
        phrase,
        score: freq + spread * 3,
        spread,
      };
    })
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const { phrase } of scored) {
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    out.push(phrase);
    if (out.length >= max) break;
  }
  return out;
}
