'use client';

import { ChevronDownIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KbSource, KnowledgeBase } from '@/types/knowledge-base';

const PREVIEW_LEN = 500;

function typeLabel(t: KbSource['type']): string {
  switch (t) {
    case 'text':
      return 'Texte';
    case 'url':
      return 'URL';
    case 'file':
      return 'Fichier';
    case 'serp':
      return 'SERP';
    default:
      return t;
  }
}

type SourceListProps = {
  knowledgeBase: KnowledgeBase;
  onChange: Dispatch<SetStateAction<KnowledgeBase>>;
};

export function SourceList({ knowledgeBase, onChange }: SourceListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const totalWords = knowledgeBase.sources.reduce((a, s) => a + s.wordCount, 0);

  function remove(id: string) {
    onChange((prev) => ({
      sources: prev.sources.filter((s) => s.id !== id),
    }));
    if (openId === id) setOpenId(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Sources ({knowledgeBase.sources.length})
      </p>
      {knowledgeBase.sources.length === 0 ? (
        <p className="text-muted-foreground text-xs">Aucune source pour l’instant.</p>
      ) : (
        <ul className="space-y-3">
          {knowledgeBase.sources.map((s) => {
            const expanded = openId === s.id;
            const preview =
              s.content.length > PREVIEW_LEN && !expanded
                ? `${s.content.slice(0, PREVIEW_LEN)}…`
                : s.content;
            return (
              <li
                key={s.id}
                className="border-border bg-muted/30 rounded-md border p-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate font-medium">{s.label}</p>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                      <span className="bg-background rounded px-1.5 py-0.5">
                        {typeLabel(s.type)}
                      </span>
                      <span>{s.wordCount} mots</span>
                      <span>
                        {new Date(s.addedAt).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setOpenId(expanded ? null : s.id)}
                    >
                      {expanded ? (
                        <ChevronDownIcon className="size-3.5" />
                      ) : (
                        <ChevronRightIcon className="size-3.5" />
                      )}
                      Voir
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 px-2"
                      onClick={() => remove(s.id)}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <pre
                  className={cn(
                    'border-border bg-background mt-2 max-h-[min(40vh,240px)] overflow-auto rounded border p-2 font-sans whitespace-pre-wrap',
                    !expanded && s.content.length > PREVIEW_LEN && 'line-clamp-6'
                  )}
                >
                  {preview}
                </pre>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-muted-foreground border-border border-t pt-2 text-xs">
        Total : {knowledgeBase.sources.length} source
        {knowledgeBase.sources.length > 1 ? 's' : ''} · {totalWords} mots
      </p>
    </div>
  );
}
