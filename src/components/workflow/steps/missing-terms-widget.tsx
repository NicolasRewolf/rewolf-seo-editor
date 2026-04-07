'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';

import { useTfidfMissingTerms } from '@/hooks/useTfidfMissingTerms';
import type { KnowledgeBase } from '@/types/knowledge-base';

type MissingTermsWidgetProps = {
  knowledgeBase: KnowledgeBase;
  plainText: string;
};

const TARGET_COUNT = 12;

export function MissingTermsWidget({
  knowledgeBase,
  plainText,
}: MissingTermsWidgetProps) {
  const competitorPlainTexts = useMemo(() => {
    return knowledgeBase.sources
      .map((source) => source.content.trim())
      .filter(Boolean);
  }, [knowledgeBase.sources]);

  const missingTerms = useTfidfMissingTerms({
    userPlainText: plainText,
    competitorPlainTexts,
    topN: TARGET_COUNT,
  });

  const coveredCount = TARGET_COUNT - missingTerms.length;
  const coverage = Math.max(
    0,
    Math.min(100, Math.round((coveredCount / TARGET_COUNT) * 100))
  );

  async function copyTerm(term: string) {
    try {
      await navigator.clipboard.writeText(term);
      toast.success(`Copié : ${term}`);
    } catch {
      toast.error('Copie impossible');
    }
  }

  return (
    <section className="border-border bg-muted/20 rounded-md border p-3">
      <p className="text-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        Termes manquants
      </p>
      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Couverture</span>
          <span className="text-foreground tabular-nums">
            {coveredCount} / {TARGET_COUNT} termes clés
          </span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: `${coverage}%` }}
            aria-hidden
          />
        </div>
      </div>

      {missingTerms.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Aucun terme prioritaire manquant détecté.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {missingTerms.map((item) => (
            <button
              key={item.term}
              type="button"
              className="border-border bg-background hover:bg-muted rounded-full border px-2 py-1 text-xs"
              onClick={() => void copyTerm(item.term)}
              title={`Score ${item.tfidf.toFixed(3)} — cliquer pour copier`}
            >
              {item.term}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
