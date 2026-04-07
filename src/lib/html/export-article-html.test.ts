import { describe, expect, it } from 'vitest';

import { buildArticleHtmlDocument } from '@/lib/html/export-article-html';

describe('buildArticleHtmlDocument', () => {
  it('injects canonical, social meta and json-ld', () => {
    const html = buildArticleHtmlDocument(
      {
        metaTitle: 'Guide avocat',
        metaDescription: 'Description meta',
        slug: 'guide-avocat',
        slugLocked: false,
      },
      '# Titre',
      {
        embedStyles: false,
        seoMetadata: {
          canonicalUrl: 'https://example.com/guide-avocat',
          ogImage: 'https://example.com/og.jpg',
          jsonLd: { '@type': 'BlogPosting', headline: 'Guide avocat' },
        },
      }
    );

    expect(html).toContain('<meta name="description"');
    expect(html).toContain('<link rel="canonical"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('property="og:url"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:title"');
    expect(html).toContain('name="twitter:description"');
    expect(html).toContain('name="twitter:image"');
    expect(html).toContain('<script type="application/ld+json">');
  });
});
