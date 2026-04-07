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

const DEFAULT_COMPETITOR_HEADINGS_MAX = 8000;
/** Limite par source pour éviter une page concurrente de plusieurs centaines de titres. */
const MAX_HEADINGS_PER_SOURCE = 48;

/**
 * Liste lisible des H1–H3 par source (structures concurrentes).
 * Toujours tronquée à `maxTotalChars` pour éviter des POST /api/ai/stream trop lourds (502 / timeouts).
 */
export function formatCompetitorHeadings(
  kb: KnowledgeBase,
  maxTotalChars = DEFAULT_COMPETITOR_HEADINGS_MAX
): string {
  const blocks: string[] = [];
  let used = 0;
  for (const s of kb.sources) {
    const hh = s.headings;
    if (!hh?.length) continue;
    const slice = hh.slice(0, MAX_HEADINGS_PER_SOURCE);
    const lines = slice.map((h) => `${'#'.repeat(h.level)} ${h.text}`);
    let block = `### ${s.label}\n${lines.join('\n')}`;
    if (hh.length > MAX_HEADINGS_PER_SOURCE) {
      block += `\n[… ${hh.length - MAX_HEADINGS_PER_SOURCE} titres omis …]`;
    }
    const sep = blocks.length ? 2 : 0;
    if (used + sep + block.length > maxTotalChars) {
      const room = maxTotalChars - used - sep - 80;
      if (room > 120) {
        blocks.push(`${block.slice(0, room)}\n[… structures concurrentes tronquées …]`);
      }
      break;
    }
    blocks.push(block);
    used += sep + block.length;
  }
  return blocks.length
    ? blocks.join('\n\n')
    : '(aucune structure de titres extraite — importez des URLs/SERP en Markdown)';
}

/** Stopwords FR (extraits pour excerpts + stats cluster + n-grams longue traîne). */
export const KB_FRENCH_STOPWORDS = new Set([
  // articles
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  'du',
  'de',
  'd',
  "l",
  'au',
  'aux',
  // pronoms
  'je',
  'tu',
  'il',
  'elle',
  'on',
  'nous',
  'vous',
  'ils',
  'elles',
  'me',
  'te',
  'se',
  'moi',
  'toi',
  'soi',
  'lui',
  'leur',
  'leurs',
  'mon',
  'ma',
  'mes',
  'ton',
  'ta',
  'tes',
  'son',
  'sa',
  'ses',
  'notre',
  'nos',
  'votre',
  'vos',
  'ce',
  'cet',
  'cette',
  'ces',
  'celui',
  'celle',
  'ceux',
  'celles',
  'qui',
  'que',
  'quoi',
  'dont',
  'où',
  'quel',
  'quelle',
  'quels',
  'quelles',
  // prépositions & conjonctions
  'à',
  'en',
  'dans',
  'sur',
  'sous',
  'par',
  'pour',
  'avec',
  'sans',
  'vers',
  'chez',
  'entre',
  'contre',
  'depuis',
  'pendant',
  'avant',
  'après',
  'et',
  'ou',
  'mais',
  'donc',
  'or',
  'ni',
  'car',
  'si',
  'comme',
  'quand',
  'lorsque',
  'puisque',
  'parce',
  // auxiliaires & verbes très fréquents
  'est',
  'sont',
  'était',
  'étaient',
  'sera',
  'seront',
  'été',
  'être',
  'ai',
  'as',
  'a',
  'avons',
  'avez',
  'ont',
  'avais',
  'avait',
  'avaient',
  'eu',
  'avoir',
  'fait',
  'faire',
  'faut',
  'peut',
  'peuvent',
  'doit',
  'doivent',
  // adverbes courants
  'pas',
  'ne',
  'plus',
  'moins',
  'très',
  'trop',
  'bien',
  'aussi',
  'encore',
  'déjà',
  'toujours',
  'jamais',
  'souvent',
  'parfois',
  'ici',
  'là',
  'alors',
  'ainsi',
  'puis',
  'ensuite',
  'enfin',
  'tout',
  'tous',
  'toute',
  'toutes',
  'même',
  'autre',
  'autres',
  // mots interrogatifs restants
  'comment',
  'pourquoi',
  'combien',
  // élisions fréquentes
  'c',
  'n',
  'qu',
  's',
  'j',
  'm',
  't',
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
