'use client';

import type { ArticleMeta } from '@/types/article';

type SerpPreviewProps = {
  meta: ArticleMeta;
  /** Domaine affiché (sans https), ex. monsite.com */
  siteHost?: string;
};

export function SerpPreview({
  meta,
  siteHost = 'example.com',
}: SerpPreviewProps) {
  const path = meta.slug ? `/${meta.slug}` : '/votre-article';
  const urlLine = `https://${siteHost}${path}`;

  const title = meta.metaTitle.trim() || 'Titre du résultat Google';
  const desc =
    meta.metaDescription.trim() ||
    'La meta description apparaît ici. Rédigez 140–160 caractères pour un bon équilibre.';

  return (
    <div
      className="border-border bg-card max-w-[600px] rounded-lg border p-4 shadow-sm"
      aria-label="Aperçu SERP"
    >
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
        Aperçu Google
      </p>
      <div className="space-y-1">
        <p
          className="line-clamp-2 cursor-default text-xl leading-snug text-[#1a0dab] hover:underline"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {title}
        </p>
        <p
          className="truncate text-sm text-[#006621]"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {urlLine}
        </p>
        <p
          className="line-clamp-2 text-sm leading-snug text-[#4d5156]"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}
