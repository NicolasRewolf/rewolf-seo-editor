import type { ExtractedHeading } from '@/types/knowledge-base';

export function extractHeadingsFromMarkdown(markdown: string): ExtractedHeading[] {
  const out: ExtractedHeading[] = [];
  let inCodeBlock = false;
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const m = /^(#{1,3})\s+(.+)$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 1 | 2 | 3;
    const text = m[2].trim();
    if (text) out.push({ level, text });
  }
  return out;
}
