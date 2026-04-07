'use client';

import { SerpResearch } from '@/components/workflow/research/serp-research';
import { SourceImportZone } from '@/components/workflow/research/source-import-zone';
import { SourceList } from '@/components/workflow/research/source-list';
import type { KnowledgeBase } from '@/types/knowledge-base';

type StepResearchProps = {
  initialQuery: string;
  knowledgeBase: KnowledgeBase;
  onKnowledgeBaseChange: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
  onCompetitorWords?: (wordCount: number | undefined) => void;
};

export function StepResearch({
  initialQuery,
  knowledgeBase,
  onKnowledgeBaseChange,
  onCompetitorWords,
}: StepResearchProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-3">
      <section className="space-y-4">
        <SourceImportZone
          onChange={onKnowledgeBaseChange}
          onFetchedUrlWords={onCompetitorWords}
        />
        <SourceList
          knowledgeBase={knowledgeBase}
          onChange={onKnowledgeBaseChange}
        />
      </section>
      <section>
        <SerpResearch
          initialQuery={initialQuery}
          knowledgeBase={knowledgeBase}
          onChange={onKnowledgeBaseChange}
          onCompetitorWords={onCompetitorWords}
        />
      </section>
    </div>
  );
}
