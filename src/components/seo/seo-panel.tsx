'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import type { CriterionStatus, SeoAnalysisResult } from '@/types/seo';

function statusIcon(s: CriterionStatus) {
  if (s === 'ok') return '✅';
  if (s === 'warn') return '⚠️';
  return '❌';
}

function scoreHue(score: number): string {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

type SeoPanelProps = {
  analysis: SeoAnalysisResult | null;
  className?: string;
};

export function SeoPanel({ analysis, className }: SeoPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  };

  const isExpanded = (id: string) => !collapsed[id];

  return (
    <aside
      className={cn(
        'border-border bg-card flex max-h-[50vh] min-h-[220px] w-full min-w-0 shrink-0 flex-col border-t lg:max-h-none lg:min-h-0 lg:flex-1',
        className
      )}
      aria-label="Analyse SEO"
    >
      <div className="border-border shrink-0 border-b px-4 py-3">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          SEO
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span
            className={cn(
              'text-4xl font-semibold tabular-nums',
              analysis ? scoreHue(analysis.overallScore) : 'text-muted-foreground'
            )}
          >
            {analysis ? analysis.overallScore : '—'}
          </span>
          <span className="text-muted-foreground text-sm">/ 100</span>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Score pondéré (worker, debounce 500 ms)
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {!analysis && (
          <p className="text-muted-foreground px-2 py-4 text-sm">
            Saisissez du contenu et un mot-clé pour lancer l'analyse…
          </p>
        )}

        {analysis?.dimensions.map((dim) => {
          const expanded = isExpanded(dim.id);
          return (
            <div
              key={dim.id}
              className="border-border mb-1 rounded-lg border"
            >
              <button
                type="button"
                onClick={() => toggle(dim.id)}
                className="hover:bg-muted/50 flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={cn('tabular-nums', scoreHue(dim.score))}>
                    {dim.score}
                  </span>
                  <span className="truncate">{dim.label}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {Math.round(dim.weight * 100)}%
                  </span>
                </span>
                <ChevronDownIcon
                  className={cn(
                    'size-4 shrink-0 transition-transform',
                    expanded && 'rotate-180'
                  )}
                />
              </button>
              {expanded && (
                <ul className="border-border space-y-2 border-t px-3 py-2">
                  {dim.criteria.map((c) => (
                    <li key={c.id} className="text-sm">
                      <div className="flex gap-2">
                        <span className="shrink-0" aria-hidden>
                          {statusIcon(c.status)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-foreground leading-snug">{c.label}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                            {c.detail}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
