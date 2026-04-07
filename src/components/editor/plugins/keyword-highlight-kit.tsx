'use client';

import { createPlatePlugin } from 'platejs/react';
import type { NodeEntry, TText } from 'platejs';

import {
  KeywordFocusLeaf,
  KeywordLongtailLeaf,
} from '@/components/editor/plugins/keyword-highlight-leaves';

export type KeywordHighlightTerm = {
  term: string;
  kind: 'focus' | 'longtail';
};

type NormalizedIndex = {
  normalized: string;
  startByNormalizedIndex: number[];
  endByNormalizedIndex: number[];
};

function foldForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function normalizeWithIndexMap(text: string): NormalizedIndex {
  let normalized = '';
  const startByNormalizedIndex: number[] = [];
  const endByNormalizedIndex: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const folded = foldForMatch(text[i]);
    if (!folded) continue;

    for (let j = 0; j < folded.length; j++) {
      normalized += folded[j];
      startByNormalizedIndex.push(i);
      endByNormalizedIndex.push(i + 1);
    }
  }

  return { normalized, startByNormalizedIndex, endByNormalizedIndex };
}

function normalizeTerms(terms: KeywordHighlightTerm[]): KeywordHighlightTerm[] {
  return terms
    .map((item) => ({
      ...item,
      term: foldForMatch(item.term).replace(/\s+/g, ' ').trim(),
    }))
    .filter((item) => item.term.length > 0)
    .sort((a, b) => b.term.length - a.term.length);
}

type KeywordRange = {
  start: number;
  end: number;
  kind: KeywordHighlightTerm['kind'];
};

export function getKeywordHighlightRanges(
  text: string,
  terms: KeywordHighlightTerm[]
): KeywordRange[] {
  if (!text || terms.length === 0) return [];

  const folded = normalizeWithIndexMap(text);
  if (!folded.normalized.length) return [];

  const covered = new Array(folded.normalized.length).fill(false);
  const ranges: KeywordRange[] = [];

  for (const term of normalizeTerms(terms)) {
    let fromIndex = 0;

    while (fromIndex < folded.normalized.length) {
      const hit = folded.normalized.indexOf(term.term, fromIndex);
      if (hit === -1) break;

      const hitEnd = hit + term.term.length;
      const hasOverlap = covered.slice(hit, hitEnd).some(Boolean);

      if (!hasOverlap) {
        const start = folded.startByNormalizedIndex[hit];
        const end = folded.endByNormalizedIndex[hitEnd - 1];

        ranges.push({ start, end, kind: term.kind });
        for (let i = hit; i < hitEnd; i++) covered[i] = true;
      }

      fromIndex = hit + 1;
    }
  }

  return ranges;
}

function decorateTextNode(
  entry: NodeEntry,
  terms: KeywordHighlightTerm[]
): Array<{
  anchor: { path: number[]; offset: number };
  focus: { path: number[]; offset: number };
  kwFocus?: true;
  kwLongtail?: true;
}> {
  const [node, path] = entry;
  if (typeof path === 'undefined') return [];
  if (!node || typeof node !== 'object' || !('text' in node)) return [];

  const textNode = node as TText;
  const ranges = getKeywordHighlightRanges(textNode.text ?? '', terms);

  return ranges.map((range) => ({
    anchor: { path, offset: range.start },
    focus: { path, offset: range.end },
    ...(range.kind === 'focus' ? { kwFocus: true } : { kwLongtail: true }),
  }));
}

export const KeywordFocusPlugin = createPlatePlugin({
  key: 'kwFocus',
  node: { isLeaf: true },
}).withComponent(KeywordFocusLeaf);

export const KeywordLongtailPlugin = createPlatePlugin({
  key: 'kwLongtail',
  node: { isLeaf: true },
}).withComponent(KeywordLongtailLeaf);

export const KeywordHighlightPlugin = createPlatePlugin({
  key: 'keywordHighlight',
  options: {
    terms: [] as KeywordHighlightTerm[],
  },
  decorate: ({ entry, getOption }) => {
    const terms = getOption('terms') ?? [];
    return decorateTextNode(entry, terms);
  },
});

export const KeywordHighlightKit = [
  KeywordFocusPlugin,
  KeywordLongtailPlugin,
  KeywordHighlightPlugin,
];

export function buildKeywordHighlightTerms(
  focusKeyword: string,
  longTailKeywords: string[]
): KeywordHighlightTerm[] {
  const terms: KeywordHighlightTerm[] = [];

  if (focusKeyword.trim()) {
    terms.push({ term: focusKeyword.trim(), kind: 'focus' });
  }

  for (const longtail of longTailKeywords) {
    if (!longtail.trim()) continue;
    terms.push({ term: longtail.trim(), kind: 'longtail' });
  }

  return terms;
}
