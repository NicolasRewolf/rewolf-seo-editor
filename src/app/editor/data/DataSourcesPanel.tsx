'use client';

import { PlusIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { DataSourceCard } from '@/app/editor/data/DataSourceCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { KnowledgeBase, KbSourceType } from '@/types/knowledge-base';

const FILTERS: Array<{ id: KbSourceType | 'all'; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'serp', label: 'SERP' },
  { id: 'url', label: 'URL' },
  { id: 'text', label: 'Texte' },
  { id: 'file', label: 'Fichier' },
];

type DataSourcesPanelProps = {
  knowledgeBase: KnowledgeBase;
  onKnowledgeBaseChange: Dispatch<SetStateAction<KnowledgeBase>>;
  selectedSourceId: string | null;
  onSelectSourceId: (id: string | null) => void;
  onOpenAdd: () => void;
  className?: string;
};

export function DataSourcesPanel({
  knowledgeBase,
  onKnowledgeBaseChange,
  selectedSourceId,
  onSelectSourceId,
  onOpenAdd,
  className,
}: DataSourcesPanelProps) {
  const [filter, setFilter] = useState<KbSourceType | 'all'>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    let list = knowledgeBase.sources;
    if (filter !== 'all') {
      list = list.filter((s) => s.type === filter);
    }
    const query = q.trim().toLowerCase();
    if (query.length >= 2) {
      list = list.filter((s) => {
        const head = s.content.slice(0, 200).toLowerCase();
        return (
          s.label.toLowerCase().includes(query) || head.includes(query)
        );
      });
    }
    return list;
  }, [knowledgeBase.sources, filter, q]);

  const totalWords = useMemo(
    () => knowledgeBase.sources.reduce((s, x) => s + x.wordCount, 0),
    [knowledgeBase.sources]
  );

  function remove(id: string) {
    onKnowledgeBaseChange((prev) => ({
      sources: prev.sources.filter((s) => s.id !== id),
    }));
    if (selectedSourceId === id) {
      onSelectSourceId(null);
    }
  }

  return (
    <div
      className={cn(
        'border-border bg-background flex min-h-0 w-full min-w-0 shrink-0 flex-col border-b lg:w-[400px] lg:border-r lg:border-b-0',
        className
      )}
    >
      <div className="border-border shrink-0 space-y-3 border-b p-3">
        <Button type="button" className="w-full gap-2" onClick={onOpenAdd}>
          <PlusIcon className="size-4" />
          Ajouter une source
        </Button>

        {/* Filtres : style segmenté neutre — pas les mêmes pastilles colorées que le type sur chaque carte */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Filtrer par type
          </p>
          <div
            className="bg-muted/40 flex flex-wrap gap-0.5 rounded-lg border border-border/80 p-0.5"
            role="group"
            aria-label="Filtrer les sources par type"
          >
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Recherche
          </p>
          <div className="relative">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Libellé ou extrait…"
              className="h-9 pl-8 text-sm"
              aria-label="Filtrer la liste par texte"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground px-1 text-center text-xs">
            {knowledgeBase.sources.length === 0
              ? 'Aucune source — ajoutez-en une pour constituer le cluster.'
              : 'Aucun résultat pour ce filtre ou cette recherche.'}
          </p>
        ) : (
          filtered.map((s) => (
            <DataSourceCard
              key={s.id}
              source={s}
              selected={selectedSourceId === s.id}
              onSelect={() => onSelectSourceId(s.id)}
              onDelete={() => remove(s.id)}
            />
          ))
        )}
      </div>

      <div className="border-border text-muted-foreground shrink-0 border-t px-3 py-2 font-mono text-[10px]">
        Total : {knowledgeBase.sources.length} source
        {knowledgeBase.sources.length > 1 ? 's' : ''} · {totalWords.toLocaleString('fr-FR')} mots
      </div>
    </div>
  );
}
