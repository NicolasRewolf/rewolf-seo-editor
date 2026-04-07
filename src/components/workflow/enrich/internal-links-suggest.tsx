'use client';

import { Loader2Icon, SparklesIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { InternalLinksMap } from '@/types/internal-links';

type InternalLinksSuggestProps = {
  internalLinks: InternalLinksMap | null;
  loading: boolean;
  output: string;
  onGenerate: () => void;
  onStop: () => void;
};

export function InternalLinksSuggest({
  internalLinks,
  loading,
  output,
  onGenerate,
  onStop,
}: InternalLinksSuggestProps) {
  const canRun = internalLinks != null && internalLinks.links.length > 0;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        className="gap-2"
        disabled={!canRun || loading}
        onClick={onGenerate}
      >
        {loading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <SparklesIcon className="size-4" />
        )}
        Suggérer des liens
      </Button>
      {!canRun && (
        <p className="text-muted-foreground text-xs">
          Importez d’abord un fichier JSON de liens internes.
        </p>
      )}
      {loading && (
        <Button type="button" variant="outline" size="sm" onClick={onStop}>
          Arrêter
        </Button>
      )}
      <p className="text-muted-foreground text-xs">
        Suggestions en streaming — copiez les passages pertinents dans l’éditeur.
      </p>
      <pre className="border-border bg-muted/40 max-h-[min(36vh,260px)] overflow-auto rounded-md border p-2 whitespace-pre-wrap font-sans text-xs leading-relaxed">
        {output || (loading ? 'Analyse…' : 'Les suggestions apparaîtront ici (copie manuelle dans l’éditeur).')}
      </pre>
    </div>
  );
}
