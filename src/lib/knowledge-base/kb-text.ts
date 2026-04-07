import type { KnowledgeBase } from '@/types/knowledge-base';

const KB_BLOCK = '--- Base de connaissances (extraits) ---';

/** Concatène le contenu des sources avec troncature par source. */
export function concatKbSources(
  kb: KnowledgeBase,
  maxTotalChars: number,
  perSourceCap = 4000
): string {
  const parts: string[] = [];
  let used = 0;
  for (const s of kb.sources) {
    if (used >= maxTotalChars) break;
    const chunk =
      s.content.length > perSourceCap
        ? `${s.content.slice(0, perSourceCap)}\n[…]`
        : s.content;
    const block = `[${s.label}]\n${chunk}`;
    if (used + block.length > maxTotalChars) {
      parts.push(block.slice(0, maxTotalChars - used));
      break;
    }
    parts.push(block);
    used += block.length + 2;
  }
  return parts.join('\n\n');
}

export function buildKbContextBlock(kb: KnowledgeBase, maxChars: number): string {
  if (!kb.sources.length) return '';
  const body = concatKbSources(kb, maxChars);
  return `${KB_BLOCK}\n${body}`;
}

/** Stopwords FR (extraits pour excerpts + stats cluster). */
export const KB_FRENCH_STOPWORDS = new Set([
  'pour',
  'avec',
  'dans',
  'une',
  'les',
  'des',
  'est',
  'que',
  'qui',
  'comment',
  'quoi',
]);

/** Extrait orienté vers une section H2 (mots > 3 lettres, hors stopwords). */
export function kbExcerptForHeading(
  kb: KnowledgeBase,
  heading: string,
  maxChars: number
): string {
  const words = heading
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zàâäéèêëïîôùûüÿçœæ0-9-]/gi, ''))
    .filter((w) => w.length > 3 && !KB_FRENCH_STOPWORDS.has(w));
  const uniq = [...new Set(words)];
  if (!uniq.length) {
    return concatKbSources(kb, maxChars);
  }
  const scored = kb.sources.map((s) => {
    const low = s.content.toLowerCase();
    let score = 0;
    for (const w of uniq) {
      if (low.includes(w)) score++;
    }
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const ordered = scored.map((x) => x.s);
  return concatKbSources({ sources: ordered }, maxChars);
}
