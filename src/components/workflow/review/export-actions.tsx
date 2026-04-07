'use client';

import { HtmlPreviewDialog } from '@/components/article/html-preview-dialog';
import { downloadArticleJson } from '@/lib/storage/local-article';
import { buildArticleHtmlDocument } from '@/lib/html/export-article-html';
import type { ArticleBrief, ArticleMeta } from '@/types/article';
import type { Value } from 'platejs';

type ExportActionsProps = {
  meta: ArticleMeta;
  brief: ArticleBrief;
  getMarkdown: () => string;
  editorContent: Value;
  /** Enregistrement vers ./data (API) — même logique que le header. */
  onSaveToDisk?: () => void;
  jsonLdBundle?: object | null;
};

export function ExportActions({
  meta,
  brief,
  getMarkdown,
  editorContent,
  onSaveToDisk,
  jsonLdBundle,
}: ExportActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Export
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm"
          onClick={() => {
            const md = getMarkdown();
            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = meta.slug ? `${meta.slug}.md` : 'article.md';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Exporter Markdown
        </button>
        <button
          type="button"
          className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm"
          onClick={() => {
            const md = getMarkdown();
            const html = buildArticleHtmlDocument(meta, md, {
              embedStyles: true,
              seoMetadata: {
                focusKeyword: brief.focusKeyword,
                canonicalUrl: brief.destinationUrl || undefined,
                jsonLd: jsonLdBundle ?? undefined,
              },
            });
            const blob = new Blob([html], {
              type: 'text/html;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = meta.slug ? `${meta.slug}.html` : 'article.html';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Exporter HTML
        </button>
        <HtmlPreviewDialog
          meta={meta}
          getMarkdown={getMarkdown}
          seoMetadata={{
            focusKeyword: brief.focusKeyword,
            canonicalUrl: brief.destinationUrl || undefined,
            jsonLd: jsonLdBundle ?? undefined,
          }}
        />
        <button
          type="button"
          className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm"
          onClick={() => {
            downloadArticleJson(
              {
                meta,
                content: editorContent,
                exportedAt: new Date().toISOString(),
              },
              meta.slug ? `${meta.slug}.json` : `article-${Date.now()}.json`
            );
          }}
        >
          Exporter JSON
        </button>
        {onSaveToDisk && (
          <button
            type="button"
            className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm"
            onClick={onSaveToDisk}
          >
            Enregistrer ./data
          </button>
        )}
      </div>
    </div>
  );
}
