import { KB_FRENCH_STOPWORDS } from '@/lib/knowledge-base/kb-text';
import type { KnowledgeBase, KbSource, KbSourceType } from '@/types/knowledge-base';

export type ClusterStats = {
  totalSources: number;
  totalWords: number;
  byType: Record<KbSourceType, { count: number; words: number }>;
  recent: KbSource[];
  topTerms: { term: string; freq: number }[];
};

const EMPTY_BY_TYPE = (): Record<KbSourceType, { count: number; words: number }> => ({
  serp: { count: 0, words: 0 },
  url: { count: 0, words: 0 },
  text: { count: 0, words: 0 },
  file: { count: 0, words: 0 },
});

function tokenizeForTopTerms(text: string): string[] {
  const low = text.toLowerCase();
  const raw = low.split(/\s+/).filter(Boolean);
  return raw
    .map((w) => w.replace(/[^a-zàâäéèêëïîôùûüÿçœæ0-9-]/gi, ''))
    .filter((w) => w.length >= 4 && !KB_FRENCH_STOPWORDS.has(w));
}

export function computeClusterStats(kb: KnowledgeBase): ClusterStats {
  const byType = EMPTY_BY_TYPE();
  let totalWords = 0;
  for (const s of kb.sources) {
    totalWords += s.wordCount;
    byType[s.type].count += 1;
    byType[s.type].words += s.wordCount;
  }

  const recent = [...kb.sources]
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, 5);

  const freq = new Map<string, number>();
  for (const s of kb.sources) {
    for (const term of tokenizeForTopTerms(s.content)) {
      freq.set(term, (freq.get(term) ?? 0) + 1);
    }
  }
  const topTerms = [...freq.entries()]
    .map(([term, f]) => ({ term, freq: f }))
    .sort((a, b) => b.freq - a.freq)
    .slice(0, 12);

  return {
    totalSources: kb.sources.length,
    totalWords,
    byType,
    recent,
    topTerms,
  };
}
