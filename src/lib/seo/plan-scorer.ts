import { KB_FRENCH_STOPWORDS } from '@/lib/knowledge-base/kb-text';
import type { ArticleBrief } from '@/types/article';
import type { KbSource } from '@/types/knowledge-base';

export type PlanCheck = {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  details?: string;
};

export type PlanScore = {
  overall: number;
  checks: PlanCheck[];
};

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function includesKw(haystack: string, kw: string): boolean {
  if (!kw.trim()) return false;
  return norm(haystack).includes(norm(kw));
}

function tokenizeForMatch(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !KB_FRENCH_STOPWORDS.has(t));
}

/** Ratio de tokens de `needle` présents dans `haystack` (0..1). */
function tokenCoverage(haystack: string, needle: string): number {
  const ht = new Set(tokenizeForMatch(haystack));
  const nt = tokenizeForMatch(needle);
  if (nt.length === 0) return 1;
  const hits = nt.filter((t) => ht.has(t)).length;
  return hits / nt.length;
}

/** Score heuristique du plan Markdown vs brief (0–100). */
export function scorePlan(
  planMarkdown: string,
  brief: ArticleBrief,
  competitorH2Texts: string[]
): PlanScore {
  const kw = brief.focusKeyword.trim();
  const lines = planMarkdown.split(/\r?\n/);
  const h2: string[] = [];
  const h1: string[] = [];
  for (const line of lines) {
    const m1 = /^#\s+(.+)$/.exec(line.trim());
    if (m1) {
      h1.push(m1[1].trim());
      continue;
    }
    const m2 = /^##\s+(.+)$/.exec(line.trim());
    if (m2) {
      h2.push(m2[1].trim());
      continue;
    }
  }

  const longTails = brief.longTailKeywords.map((x) => x.trim()).filter(Boolean);

  const checks: PlanCheck[] = [];

  checks.push({
    id: 'kw-h1',
    label: 'Mot-clé dans le titre (H1 ou premier bloc)',
    passed: kw ? includesKw(h1[0] ?? h2[0] ?? '', kw) || includesKw(planMarkdown.slice(0, 400), kw) : false,
    weight: 12,
    details: kw ? undefined : 'Mot-clé principal vide',
  });

  checks.push({
    id: 'kw-h2',
    label: 'Mot-clé dans au moins 2 sections H2',
    passed: kw ? h2.filter((t) => includesKw(t, kw)).length >= 2 : false,
    weight: 14,
  });

  checks.push({
    id: 'h2-count',
    label: 'Entre 4 et 8 sections H2',
    passed: h2.length >= 4 && h2.length <= 8,
    weight: 10,
    details: `${h2.length} H2`,
  });

  checks.push({
    id: 'first-h2-snippet',
    label: 'Premier H2 orienté réponse directe (snippet)',
    passed: h2.length > 0
      ? /^(qu['']est|définition|comment|pourquoi|en quoi|combien)/i.test(h2[0]) ||
        h2[0].length <= 72
      : false,
    weight: 8,
  });

  checks.push({
    id: 'longtail',
    label: `Longue traîne couverte (${Math.round(covered * 100)}%)`,
    passed: covered >= 0.8,
    weight: 16,
    details:
      longTails.length === 0
        ? 'Aucune longue traîne définie'
        : `${Math.round(covered * longTails.length)}/${longTails.length} expressions`,
  });

  checks.push({
    id: 'points-cles',
    label: 'Lignes « Points clés » sous les sections',
    passed: /points?\s+clés/i.test(planMarkdown),
    weight: 10,
  });

  const compNorm = competitorH2Texts.map(norm).filter(Boolean);
  const diff =
    h2.some((t) => {
      const n = norm(t);
      return n.length > 5 && !compNorm.some((c) => c.includes(n) || n.includes(c));
    }) || competitorH2Texts.length === 0;
  checks.push({
    id: 'differentiator',
    label: 'Au moins un angle H2 hors overlap concurrent (heuristique)',
    passed: diff,
    weight: 12,
  });

  const totalW = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const overall = totalW > 0 ? Math.round((earned / totalW) * 100) : 0;

  return { overall, checks };
}

export function collectCompetitorH2FromKb(sources: KbSource[]): string[] {
  const out: string[] = [];
  for (const s of sources) {
    for (const h of s.headings ?? []) {
      if (h.level === 2) out.push(h.text);
    }
  }
  return out;
}
