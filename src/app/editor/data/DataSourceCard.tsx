'use client';

import { Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KbSource, KbSourceType } from '@/types/knowledge-base';

const TYPE_LABEL: Record<KbSourceType, string> = {
  serp: 'SERP',
  url: 'URL',
  text: 'Texte',
  file: 'Fichier',
};

const TYPE_CLASS: Record<KbSourceType, string> = {
  serp: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  url: 'bg-green-500/15 text-green-700 dark:text-green-300',
  text: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  file: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
};

type DataSourceCardProps = {
  source: KbSource;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

export function DataSourceCard({
  source,
  selected,
  onSelect,
  onDelete,
}: DataSourceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group border-border hover:bg-muted/50 relative flex w-full flex-col gap-1 rounded-md border px-2 py-2 text-left transition-colors',
        selected && 'border-primary bg-muted/40 ring-1 ring-primary/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            TYPE_CLASS[source.type]
          )}
        >
          {TYPE_LABEL[source.type]}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive -mr-1 -mt-1 size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Supprimer"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>
      <p className="text-foreground line-clamp-2 text-xs font-medium">{source.label}</p>
      <p className="text-muted-foreground font-mono text-[10px]">
        {source.wordCount} mots
      </p>
    </button>
  );
}
