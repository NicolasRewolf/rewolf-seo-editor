import { marked } from 'marked';

import type { ArticleMeta } from '@/types/article';

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Styles de base pour lecture (aperçu + export optionnel). */
export const ARTICLE_EXPORT_BASE_CSS = `
:root { color-scheme: light dark; }
body {
  font-family: ui-sans-serif, system-ui, sans-serif;
  line-height: 1.65;
  margin: 0;
  padding: 1rem 1.25rem 2rem;
  background: #fafafa;
  color: #171717;
}
@media (prefers-color-scheme: dark) {
  body { background: #0a0a0a; color: #fafafa; }
}
.rewolf-article {
  max-width: 65ch;
  margin: 0 auto;
}
.rewolf-article h1 { font-size: 1.75rem; font-weight: 700; margin: 1.25em 0 0.5em; line-height: 1.25; }
.rewolf-article h2 { font-size: 1.35rem; font-weight: 650; margin: 1.15em 0 0.4em; line-height: 1.3; }
.rewolf-article h3 { font-size: 1.12rem; font-weight: 600; margin: 1em 0 0.35em; }
.rewolf-article p { margin: 0.65em 0; }
.rewolf-article ul, .rewolf-article ol { margin: 0.65em 0; padding-left: 1.35em; }
.rewolf-article li { margin: 0.25em 0; }
.rewolf-article blockquote {
  margin: 0.75em 0;
  padding-left: 1em;
  border-left: 3px solid #d4d4d4;
}
.rewolf-article pre {
  overflow-x: auto;
  padding: 0.75em 1em;
  border-radius: 6px;
  background: #f4f4f5;
  font-size: 0.875em;
}
@media (prefers-color-scheme: dark) {
  .rewolf-article blockquote { border-left-color: #404040; }
  .rewolf-article pre { background: #171717; }
}
.rewolf-article code { font-size: 0.9em; }
.rewolf-article table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.9em; }
.rewolf-article th, .rewolf-article td { border: 1px solid #d4d4d4; padding: 0.4em 0.6em; }
@media (prefers-color-scheme: dark) {
  .rewolf-article th, .rewolf-article td { border-color: #404040; }
}
.rewolf-article img { max-width: 100%; height: auto; }
.rewolf-article a { color: #2563eb; }
@media (prefers-color-scheme: dark) {
  .rewolf-article a { color: #60a5fa; }
}
`.trim();

export type BuildArticleHtmlOptions = {
  /** Injecte des styles typographiques (recommandé pour l'aperçu). */
  embedStyles?: boolean;
  seoMetadata?: {
    focusKeyword?: string;
    jsonLd?: object | null;
    ogImage?: string;
    canonicalUrl?: string;
  };
};

/**
 * Document HTML pour publication ou aperçu (Markdown → HTML via marked, GFM par défaut).
 */
export function buildArticleHtmlDocument(
  meta: ArticleMeta,
  markdown: string,
  options?: BuildArticleHtmlOptions
): string {
  const body = marked.parse(markdown, { async: false }) as string;
  const title = escapeHtmlAttr(meta.metaTitle || 'Article');
  const desc = escapeHtmlAttr(meta.metaDescription || '');
  const seo = options?.seoMetadata;
  const canonical = seo?.canonicalUrl?.trim() ?? '';
  const ogImage = seo?.ogImage?.trim() ?? '';
  const escapedCanonical = canonical ? escapeHtmlAttr(canonical) : '';
  const escapedOgImage = ogImage ? escapeHtmlAttr(ogImage) : '';
  const escapedOgTitle = title;
  const escapedOgDesc = desc;
  const jsonLdScript =
    seo?.jsonLd && typeof seo.jsonLd === 'object'
      ? `<script type="application/ld+json">\n${JSON.stringify(seo.jsonLd, null, 2)}\n</script>\n`
      : '';
  const styleBlock = options?.embedStyles
    ? `<style>\n${ARTICLE_EXPORT_BASE_CSS}\n</style>\n`
    : '';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
${escapedCanonical ? `<link rel="canonical" href="${escapedCanonical}">` : ''}
<meta property="og:title" content="${escapedOgTitle}">
<meta property="og:description" content="${escapedOgDesc}">
<meta property="og:type" content="article">
${escapedCanonical ? `<meta property="og:url" content="${escapedCanonical}">` : ''}
${escapedOgImage ? `<meta property="og:image" content="${escapedOgImage}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapedOgTitle}">
<meta name="twitter:description" content="${escapedOgDesc}">
${escapedOgImage ? `<meta name="twitter:image" content="${escapedOgImage}">` : ''}
${styleBlock}</head>
<body>
<article class="rewolf-article">
${body}
</article>
${jsonLdScript}
</body>
</html>
`;
}
