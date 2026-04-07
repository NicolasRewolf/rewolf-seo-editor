import type { KbSource } from '@/types/knowledge-base';

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

export function makeSerpSource(url: string, title: string, content: string): KbSource {
  const label = title.length > 60 ? `${title.slice(0, 57)}…` : title;
  return makeSource({
    type: 'serp',
    label,
    content,
    url,
  });
}
