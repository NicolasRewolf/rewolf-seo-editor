'use client';

import { CheckIcon, CopyIcon, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PlanScore } from '@/lib/seo/plan-scorer';

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
  planScore: PlanScore | null;
  scoreWarnThreshold: number;
};

export function OutlinePreview({
  output,
  loading,
  draft,
  onDraftChange,
  onRegenerate,
  onInsert,
  canInsert,
  planScore,
  scoreWarnThreshold,
}: OutlinePreviewProps) {
  const textToCopy = loading ? output : draft;
  const lowScore =
    planScore != null && planScore.overall < scoreWarnThreshold;

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
          className={lowScore ? 'border-amber-600/50 bg-amber-600/90 hover:bg-amber-600' : ''}
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

      {planScore && !loading && (
        <div
          className={cn(
            'border-border rounded-md border p-3 text-xs',
            lowScore && 'border-amber-600/40 bg-amber-500/10'
          )}
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-foreground font-medium">Score du plan</span>
            <span
              className={cn(
                'font-semibold tabular-nums',
                lowScore ? 'text-amber-800 dark:text-amber-200' : 'text-emerald-700 dark:text-emerald-300'
              )}
            >
              {planScore.overall}/100
            </span>
          </div>
          {lowScore && (
            <p className="text-muted-foreground mb-2">
              Score sous le seuil conseillé ({scoreWarnThreshold}). Vous pouvez
              régénérer ou insérer avec confirmation.
            </p>
          )}
          <ul className="space-y-1.5">
            {planScore.checks.map((c) => (
              <li
                key={c.id}
                className="flex gap-2"
              >
                {c.passed ? (
                  <CheckIcon className="text-emerald-600 mt-0.5 size-3.5 shrink-0 dark:text-emerald-400" />
                ) : (
                  <XIcon className="text-destructive mt-0.5 size-3.5 shrink-0" />
                )}
                <span>
                  <span className="text-foreground">{c.label}</span>
                  {c.details ? (
                    <span className="text-muted-foreground"> — {c.details}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
