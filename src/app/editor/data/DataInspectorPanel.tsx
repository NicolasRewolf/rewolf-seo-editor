'use client';

import { ClusterDashboard } from '@/app/editor/data/ClusterDashboard';
import { SourcePreview } from '@/app/editor/data/SourcePreview';
import { computeClusterStats, type ClusterStats } from '@/lib/knowledge-base/kb-stats';
import type { ArticleMeta } from '@/types/article';
import type { KnowledgeBase } from '@/types/knowledge-base';

type DataInspectorPanelProps = {
  knowledgeBase: KnowledgeBase;
  meta: ArticleMeta;
  selectedSourceId: string | null;
  onSelectSourceId: (id: string | null) => void;
  competitorWordCount?: number;
};

export function DataInspectorPanel({
  knowledgeBase,
  meta,
  selectedSourceId,
  onSelectSourceId,
  competitorWordCount,
}: DataInspectorPanelProps) {
  const stats: ClusterStats = computeClusterStats(knowledgeBase);
  const selected = selectedSourceId
    ? knowledgeBase.sources.find((s) => s.id === selectedSourceId)
    : undefined;

  if (selected) {
    return (
      <div className="bg-muted/10 flex min-h-0 min-w-0 flex-1 flex-col p-4">
        <SourcePreview source={selected} focusKeyword={meta.focusKeyword} />
      </div>
    );
  }

  return (
    <div className="bg-muted/10 flex min-h-0 min-w-0 flex-1 flex-col p-4">
      <ClusterDashboard
        stats={stats}
        competitorWordCount={competitorWordCount}
        onSelectRecent={(id) => onSelectSourceId(id)}
      />
    </div>
  );
}
