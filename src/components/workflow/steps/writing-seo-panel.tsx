'use client';

import { SeoPanel } from '@/components/seo/seo-panel';
import { MissingTermsWidget } from '@/components/workflow/steps/missing-terms-widget';
import { cn } from '@/lib/utils';
import type { KnowledgeBase } from '@/types/knowledge-base';
import type { SeoAnalysisResult } from '@/types/seo';

type WritingSeoPanelProps = {
  seoAnalysis: SeoAnalysisResult | null;
  knowledgeBase: KnowledgeBase;
  plainText: string;
};

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function LiveScorePill({
  seoAnalysis,
}: Pick<WritingSeoPanelProps, 'seoAnalysis'>) {
  const score = seoAnalysis?.overallScore ?? 0;
  const hasScore = seoAnalysis !== null;

  return (
    <div className="border-border bg-muted/20 rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-foreground text-xs font-medium tracking-wide uppercase">
          Score SEO live
        </p>
        <span className="text-sm font-semibold tabular-nums">
          {hasScore ? score : '—'}
          <span className="text-muted-foreground ml-1 text-xs">/100</span>
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            scoreColor(score)
          )}
          style={{ width: `${hasScore ? score : 0}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function WritingSeoPanel({
  seoAnalysis,
  knowledgeBase,
  plainText,
}: WritingSeoPanelProps) {
  return (
    <section className="space-y-2">
      <LiveScorePill seoAnalysis={seoAnalysis} />
      <MissingTermsWidget knowledgeBase={knowledgeBase} plainText={plainText} />
      <div className="max-h-[min(42vh,340px)] overflow-y-auto rounded-md">
        <SeoPanel analysis={seoAnalysis} className="min-h-[220px] border" />
      </div>
    </section>
  );
}
