export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Découpe le texte pour surligner le mot-clé (segments alternés match / non-match).
 */
export function splitForHighlight(
  text: string,
  keyword: string
): Array<{ text: string; match: boolean }> {
  const k = keyword.trim();
  if (!k || k.length < 2) return [{ text, match: false }];
  const re = new RegExp(`(${escapeRegex(k)})`, 'gi');
  const parts = text.split(re);
  return parts.map((part) => ({
    text: part,
    match:
      part.length > 0 && part.toLowerCase() === k.toLowerCase(),
  }));
}
