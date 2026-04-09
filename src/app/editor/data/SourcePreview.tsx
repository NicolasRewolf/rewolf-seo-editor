'use client';

import { formatDateTimeFr } from '@shared/core';
import { splitForHighlight } from '@/lib/seo/highlight';
import type { KbSource } from '@/types/knowledge-base';

type SourcePreviewProps = {
  source: KbSource;
  focusKeyword: string;
};

export function SourcePreview({ source, focusKeyword }: SourcePreviewProps) {
  const parts = splitForHighlight(source.content, focusKeyword);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="space-y-1 border-b border-border/80 pb-3">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
          {source.type === 'serp'
            ? 'SERP'
            : source.type === 'url'
              ? 'URL'
              : source.type === 'file'
                ? 'Fichier'
                : 'Texte'}
        </p>
        <h2 className="text-foreground text-lg font-medium leading-snug">{source.label}</h2>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary break-all text-xs underline-offset-2 hover:underline"
          >
            {source.url}
          </a>
        )}
        <p className="text-muted-foreground font-mono text-xs">
          {source.wordCount} mots · {formatDateTimeFr(source.addedAt)}
        </p>
      </div>
      <div className="text-foreground min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
        {parts.map((p, i) =>
          p.match ? (
            <mark
              key={i}
              className="bg-amber-200/60 dark:bg-amber-400/30 rounded px-0.5"
            >
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </div>
    </div>
  );
}
