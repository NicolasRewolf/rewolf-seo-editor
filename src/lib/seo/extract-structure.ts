import type { Descendant } from 'platejs';
import { KEYS } from 'platejs';
import { Element, Node, Text } from 'slate';
import { countWords } from '@shared/core';

import { measureMetaDescriptionWidthPx, measureTitleWidthPx } from '@/lib/seo/canvas-measure';
import type { ArticleMeta } from '@/types/article';
import type { SeoAnalysisPayload } from '@/types/seo';

const SITE_HOST_DEFAULT = 'example.com';

function isHeadingType(t: string): boolean {
  return /^h[1-6]$/.test(t);
}

function headingLevel(t: string): number {
  return Number(t[1]) || 0;
}

function isInternalUrl(url: string, siteHost: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith('/') || u.startsWith('#') || u.startsWith('?')) return true;
  if (!/^https?:\/\//i.test(u)) return true;
  try {
    const parsed = new URL(u);
    return parsed.hostname === siteHost;
  } catch {
    return false;
  }
}

function collectBlockText(node: Descendant): string {
  if (Text.isText(node)) return node.text;
  if (!Element.isElement(node)) return '';
  return node.children.map((c) => collectBlockText(c as Descendant)).join('');
}

type LinkStats = { internal: number; external: number };

function walkDescendants(
  nodes: Descendant[],
  siteHost: string,
  stats: LinkStats,
  images: { total: number; missingAlt: number }
): void {
  for (const node of nodes) {
    if (Text.isText(node)) continue;
    if (!Element.isElement(node)) continue;

    const t = node.type as string;

    if (t === KEYS.link || t === 'a') {
      const url = String((node as { url?: string }).url ?? '');
      if (url) {
        if (isInternalUrl(url, siteHost)) stats.internal++;
        else stats.external++;
      }
    }

    if (t === KEYS.img) {
      images.total++;
      const alt = String((node as { alt?: string }).alt ?? '').trim();
      if (!alt) images.missingAlt++;
    }

    if ('children' in node && node.children) {
      walkDescendants(node.children as Descendant[], siteHost, stats, images);
    }
  }
}

/**
 * Extrait texte, titres, liens et images depuis la valeur Slate pour l'analyse SEO.
 */
export function buildSeoPayload(
  value: Descendant[],
  meta: ArticleMeta,
  /** Mot-clé principal (provenant du brief). */
  focusKeyword: string,
  siteHost?: string,
  /** Mots de la page concurrente (Reader) pour le benchmark longueur. */
  competitorAvgWords?: number
): SeoAnalysisPayload {
  const host = siteHost ?? SITE_HOST_DEFAULT;
  const headings: { level: number; text: string }[] = [];
  const headingsWithWordOffsets: {
    level: number;
    text: string;
    wordOffset: number;
  }[] = [];
  let firstParagraph = '';
  let gotFirstParagraph = false;

  const plainParts: string[] = [];
  const linkStats: LinkStats = { internal: 0, external: 0 };
  const images = { total: 0, missingAlt: 0 };
  let runningWordCount = 0;

  walkDescendants(value, host, linkStats, images);

  for (const block of value) {
    if (!Element.isElement(block)) continue;

    const t = block.type as string;
    const blockText = collectBlockText(block).trim();

    if (isHeadingType(t)) {
      headings.push({ level: headingLevel(t), text: blockText });
      headingsWithWordOffsets.push({
        level: headingLevel(t),
        text: blockText,
        wordOffset: runningWordCount,
      });
      plainParts.push(blockText);
      runningWordCount += countWords(blockText);
      continue;
    }

    if (t === KEYS.p) {
      if (!gotFirstParagraph && blockText) {
        firstParagraph = blockText;
        gotFirstParagraph = true;
      }
      plainParts.push(blockText);
      runningWordCount += countWords(blockText);
      continue;
    }

    plainParts.push(blockText);
    runningWordCount += countWords(blockText);
  }

  const plainText = plainParts.filter(Boolean).join('\n\n');
  const wordCount = countWords(plainText);

  return {
    plainText,
    focusKeyword: focusKeyword.trim(),
    metaTitle: meta.metaTitle,
    metaDescription: meta.metaDescription,
    slug: meta.slug,
    titlePx: measureTitleWidthPx(meta.metaTitle),
    metaDescPx: measureMetaDescriptionWidthPx(meta.metaDescription),
    headings,
    headingsWithWordOffsets,
    firstParagraph,
    wordCount,
    internalLinks: linkStats.internal,
    externalLinks: linkStats.external,
    imagesTotal: images.total,
    imagesMissingAlt: images.missingAlt,
    competitorAvgWords:
      competitorAvgWords != null && competitorAvgWords > 0
        ? Math.round(competitorAvgWords)
        : undefined,
  };
}

export function plainTextFromValue(value: Descendant[]): string {
  return value.map((n) => Node.string(n)).join('\n');
}
