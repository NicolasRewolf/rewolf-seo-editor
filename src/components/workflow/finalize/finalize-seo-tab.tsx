'use client';

import { SerpPreview } from '@/components/seo/serp-preview';
import { SeoPanel } from '@/components/seo/seo-panel';
import type { ArticleMeta } from '@/types/article';
import type { SeoAnalysisResult } from '@/types/seo';

type FinalizeSeoTabProps = {
  meta: ArticleMeta;
  seoAnalysis: SeoAnalysisResult | null;
};

export function FinalizeSeoTab({ meta, seoAnalysis }: FinalizeSeoTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <SeoPanel
        analysis={seoAnalysis}
        className="min-h-[min(36vh,280px)] shrink-0"
      />
      <div>
        <SerpPreview meta={meta} />
      </div>
    </div>
  );
}
