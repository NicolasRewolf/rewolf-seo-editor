'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

import { AddSourceDialog } from '@/app/editor/data/AddSourceDialog';
import { DataInspectorPanel } from '@/app/editor/data/DataInspectorPanel';
import { DataSourcesPanel } from '@/app/editor/data/DataSourcesPanel';
import { Input } from '@/components/ui/input';
import type { ArticleBrief } from '@/types/article';
import type { KnowledgeBase } from '@/types/knowledge-base';

type DataWorkspaceProps = {
  brief: ArticleBrief;
  onBriefChange: (patch: Partial<ArticleBrief>) => void;
  knowledgeBase: KnowledgeBase;
  onKnowledgeBaseChange: Dispatch<SetStateAction<KnowledgeBase>>;
  competitorWordCount?: number;
  onCompetitorBenchmark?: (wordCount: number | undefined) => void;
};

export function DataWorkspace({
  brief,
  onBriefChange,
  knowledgeBase,
  onKnowledgeBaseChange,
  competitorWordCount,
  onCompetitorBenchmark,
}: DataWorkspaceProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <div className="border-border bg-muted/20 border-b px-4 py-3">
          <label className="text-foreground mb-1.5 block text-sm font-medium">
            Mot-clé principal
          </label>
          <Input
            value={brief.focusKeyword}
            onChange={(e) => onBriefChange({ focusKeyword: e.target.value })}
            placeholder="ex. avocat droit du travail"
            className="max-w-md text-sm"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Utilisé pour pré-remplir la requête SERP et scorer le plan.
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <DataSourcesPanel
            knowledgeBase={knowledgeBase}
            onKnowledgeBaseChange={onKnowledgeBaseChange}
            selectedSourceId={selectedSourceId}
            onSelectSourceId={setSelectedSourceId}
            onOpenAdd={() => setAddOpen(true)}
          />
          <DataInspectorPanel
            knowledgeBase={knowledgeBase}
            focusKeyword={brief.focusKeyword}
            selectedSourceId={selectedSourceId}
            onSelectSourceId={setSelectedSourceId}
            competitorWordCount={competitorWordCount}
          />
        </div>
      </div>
      <AddSourceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        focusKeyword={brief.focusKeyword}
        knowledgeBase={knowledgeBase}
        onKnowledgeBaseChange={onKnowledgeBaseChange}
        onCompetitorWords={onCompetitorBenchmark}
      />
    </>
  );
}
