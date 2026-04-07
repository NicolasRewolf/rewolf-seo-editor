import { extractHeadingsFromMarkdown } from '@/lib/knowledge-base/extract-headings';
import type { KbSource } from '@/types/knowledge-base';

/** Clé stable pour détecter si une URL est déjà en base (http→https, slash final, casse). */
export function normalizeSourceUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  try {
    const u = new URL(
      t.startsWith('http://') || t.startsWith('https://') ? t : `https://${t}`
    );
    u.hash = '';
    const host = u.hostname.toLowerCase();
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    const proto =
      u.protocol === 'http:' || u.protocol === 'https:' ? 'https:' : u.protocol;
    return `${proto}//${host}${path}${u.search}`.toLowerCase();
  } catch {
    return t.toLowerCase();
  }
}

export function normalizedSourceUrlsFromSources(sources: KbSource[]): Set<string> {
  const set = new Set<string>();
  for (const s of sources) {
    if (s.url) set.add(normalizeSourceUrl(s.url));
  }
  return set;
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function makeSource(
  partial: Omit<KbSource, 'id' | 'wordCount' | 'addedAt'>
): KbSource {
  const content = partial.content;
  return {
    id: crypto.randomUUID(),
    ...partial,
    wordCount: countWords(content),
    addedAt: new Date().toISOString(),
  };
}

/** Texte lisible pour comptage mots à partir du Markdown Jina. */
export function roughPlainFromMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Contenu = texte dérivé du MD ; `headings` extraits du même flux. */
export function makeSerpSource(url: string, title: string, markdown: string): KbSource {
  const label = title.length > 60 ? `${title.slice(0, 57)}…` : title;
  const plain = roughPlainFromMarkdown(markdown);
  const headings = extractHeadingsFromMarkdown(markdown);
  return makeSource({
    type: 'serp',
    label,
    content: plain,
    url,
    headings: headings.length ? headings : undefined,
  });
}
