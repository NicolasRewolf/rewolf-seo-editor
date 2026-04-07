export function groupH2WithH3(headings: { level: number; text: string }[]): {
  h2: string;
  h3: string[];
}[] {
  const sections: { h2: string; h3: string[] }[] = [];
  let cur: { h2: string; h3: string[] } | null = null;
  for (const h of headings) {
    if (h.level === 2) {
      cur = { h2: h.text, h3: [] };
      sections.push(cur);
    } else if (h.level === 3 && cur) {
      cur.h3.push(h.text);
    }
  }
  return sections;
}
