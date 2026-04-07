'use client';

import { CopyIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type OutlinePreviewProps = {
  /** Flux brut (streaming). */
  output: string;
  loading: boolean;
  /** Brouillon éditable (synchronisé depuis output à la fin du flux). */
  draft: string;
  onDraftChange: (value: string) => void;
  onRegenerate: () => void;
  onInsert: () => void;
  canInsert: boolean;
};

export function OutlinePreview({
  output,
  loading,
  draft,
  onDraftChange,
  onRegenerate,
  onInsert,
  canInsert,
}: OutlinePreviewProps) {
  const textToCopy = loading ? output : draft;

  async function copyOutput() {
    if (!textToCopy.trim()) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">
        {loading
          ? 'Génération en cours…'
          : 'Modifiez le plan ci-dessous avant insertion si besoin.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={loading}
          onClick={onRegenerate}
        >
          Régénérer
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={!canInsert || loading}
          onClick={onInsert}
        >
          Insérer dans l’éditeur
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!textToCopy.trim()}
          onClick={() => void copyOutput()}
        >
          <CopyIcon className="size-3.5" />
          Copier
        </Button>
      </div>
      {loading ? (
        <pre
          className={cn(
            'border-border bg-muted/40 max-h-[min(50vh,400px)] overflow-auto rounded-md border p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap',
            'opacity-90'
          )}
        >
          {output || 'Génération…'}
        </pre>
      ) : (
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Le plan généré apparaîtra ici. Vous pouvez l’éditer avant insertion."
          className="border-border bg-muted/40 min-h-[min(50vh,400px)] resize-y font-sans text-xs leading-relaxed"
          spellCheck={false}
        />
      )}
    </div>
  );
}
