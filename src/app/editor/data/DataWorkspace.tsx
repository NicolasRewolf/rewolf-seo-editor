'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

import { AddSourceDialog } from '@/app/editor/data/AddSourceDialog';
import { DataInspectorPanel } from '@/app/editor/data/DataInspectorPanel';
import { DataSourcesPanel } from '@/app/editor/data/DataSourcesPanel';
import type { ArticleMeta } from '@/types/article';
import type { KnowledgeBase } from '@/types/knowledge-base';

type DataWorkspaceProps = {
  meta: ArticleMeta;
  knowledgeBase: KnowledgeBase;
  onKnowledgeBaseChange: Dispatch<SetStateAction<KnowledgeBase>>;
  competitorWordCount?: number;
  onCompetitorBenchmark?: (wordCount: number | undefined) => void;
};

export function DataWorkspace({
  meta,
  knowledgeBase,
  onKnowledgeBaseChange,
  competitorWordCount,
  onCompetitorBenchmark,
}: DataWorkspaceProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col lg:flex-row">
        <DataSourcesPanel
          knowledgeBase={knowledgeBase}
          onKnowledgeBaseChange={onKnowledgeBaseChange}
          selectedSourceId={selectedSourceId}
          onSelectSourceId={setSelectedSourceId}
          onOpenAdd={() => setAddOpen(true)}
        />
        <DataInspectorPanel
          knowledgeBase={knowledgeBase}
          meta={meta}
          selectedSourceId={selectedSourceId}
          onSelectSourceId={setSelectedSourceId}
          competitorWordCount={competitorWordCount}
        />
      </div>
      <AddSourceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        meta={meta}
        onKnowledgeBaseChange={onKnowledgeBaseChange}
        onCompetitorWords={onCompetitorBenchmark}
      />
    </>
  );
}
