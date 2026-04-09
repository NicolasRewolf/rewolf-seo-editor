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

const MAX_COMPETITOR_SOURCES = 8;
const MAX_HEADINGS_PER_SOURCE = 15;

/**
 * Liste lisible des H1–H3 par source (structures concurrentes).
 * Borné en nombre de sources et de titres pour limiter la taille du prompt plan.
 */
export function formatCompetitorHeadings(kb: KnowledgeBase): string {
  const blocks: string[] = [];
  const sources = kb.sources
    .filter((s) => s.headings && s.headings.length > 0)
    .slice(0, MAX_COMPETITOR_SOURCES);
  for (const s of sources) {
    const hh = (s.headings ?? []).slice(0, MAX_HEADINGS_PER_SOURCE);
    const lines = hh.map((h) => `${'#'.repeat(h.level)} ${h.text}`);
    blocks.push(`### ${s.label}\n${lines.join('\n')}`);
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

/**
 * Sélectionne les chunks de la KB les plus pertinents pour un mot-clé donné.
 * Utilisé par les prompts d'extraction longue traîne.
 */
export function selectChunksForPrompt(
  kb: KnowledgeBase,
  focusKeyword: string,
  maxChars: number
): { text: string } {
  const text = kbExcerptForHeading(kb, focusKeyword, maxChars);
  return { text };
}

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
